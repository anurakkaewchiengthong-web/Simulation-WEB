#!/usr/bin/env python3
"""Extract Nong Khai at the user's native BIL pixel resolution by HTTP byte ranges."""

from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import json
import math
import os
from pathlib import Path
import re
import tempfile
import time
from html.parser import HTMLParser
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener

import numpy as np
from PIL import Image
import rasterio
from rasterio.features import rasterize
from rasterio.shutil import copy as raster_copy
from affine import Affine
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform


DRIVE_ID = "1QNUYHcbz9bWRRK-30pZSuXZx9-iaE6hJ"
DRIVE_URL = f"https://drive.google.com/uc?export=download&id={DRIVE_ID}"
SOURCE_ROWS = 54950
SOURCE_COLS = 30518
SOURCE_NODATA = -32767
PIXEL = 30.1469654783933
ULX_CENTER = 316599.1682
ULY_CENTER = 2276962.64191
ROW_BYTES = SOURCE_COLS * 2
BOUNDARY_URL = "https://www.geoboundaries.org/api/current/gbOpen/THA/ADM1/"


class DownloadForm(HTMLParser):
    def __init__(self):
        super().__init__()
        self.action = None
        self.fields = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "form" and "drive.usercontent.google.com" in attrs.get("action", ""):
            self.action = attrs["action"]
        if tag == "input" and attrs.get("type") == "hidden":
            self.fields[attrs.get("name")] = attrs.get("value")


class DriveRanges:
    def __init__(self):
        self.opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.url = None
        self.refresh()

    def refresh(self):
        with self.opener.open(DRIVE_URL, timeout=60) as response:
            if "text/html" not in response.headers.get("Content-Type", ""):
                raise RuntimeError("Expected Google Drive's large-file confirmation form")
            form = DownloadForm()
            form.feed(response.read().decode("utf-8"))
        if not form.action:
            raise RuntimeError("Google Drive confirmation URL not found")
        self.url = form.action + "?" + urlencode(form.fields)

    def read(self, first: int, last: int) -> bytes:
        expected = last - first + 1
        for attempt in range(4):
            try:
                request = Request(self.url, headers={"Range": f"bytes={first}-{last}", "Accept-Encoding": "identity"})
                with self.opener.open(request, timeout=100) as response:
                    cr = response.headers.get("Content-Range", "")
                    if response.status != 206 or not cr.startswith(f"bytes {first}-{last}/"):
                        raise RuntimeError(f"Range not honored: HTTP {response.status}, {cr}")
                    data = response.read()
                if len(data) != expected:
                    raise RuntimeError(f"Short read: {len(data)} instead of {expected}")
                return data
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1.5 * (attempt + 1))
                self.refresh()
        raise AssertionError("unreachable")


def aligned_window(boundary):
    west, south, east, north = boundary.bounds
    c0 = max(0, math.floor((west - (ULX_CENTER - PIXEL / 2)) / PIXEL))
    c1 = min(SOURCE_COLS, math.ceil((east - (ULX_CENTER - PIXEL / 2)) / PIXEL))
    r0 = max(0, math.floor(((ULY_CENTER + PIXEL / 2) - north) / PIXEL))
    r1 = min(SOURCE_ROWS, math.ceil(((ULY_CENTER + PIXEL / 2) - south) / PIXEL))
    assert 0 <= c0 < c1 <= SOURCE_COLS and 0 <= r0 < r1 <= SOURCE_ROWS
    return c0, c1, r0, r1


def png_tiles(data, folder: Path, tile_size=1024):
    folder.mkdir(parents=True, exist_ok=True)
    h, w = data.shape
    sizes = []
    for ty, y0 in enumerate(range(0, h, tile_size)):
        for tx, x0 in enumerate(range(0, w, tile_size)):
            tile = np.full((tile_size, tile_size), SOURCE_NODATA, dtype="<i2")
            patch = data[y0:y0+tile_size, x0:x0+tile_size]
            tile[:patch.shape[0], :patch.shape[1]] = patch
            offset = tile.astype(np.int32) + 32768
            rgb = np.empty((tile_size, tile_size, 3), dtype=np.uint8)
            rgb[:, :, 0] = (offset >> 8).astype(np.uint8)
            rgb[:, :, 1] = (offset & 255).astype(np.uint8)
            rgb[:, :, 2] = np.where(tile == SOURCE_NODATA, 0, 255).astype(np.uint8)
            path = folder / f"{tx}-{ty}.png"
            for attempt in range(3):
                Image.fromarray(rgb, "RGB").save(path, optimize=True)
                try:
                    with Image.open(path) as check:
                        check.load()
                    break
                except OSError:
                    if attempt == 2:
                        raise
            sizes.append(path.stat().st_size)
    return len(sizes), sum(sizes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boundary", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--tile-size", type=int, default=1024)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    feature = json.loads(args.boundary.read_text())
    if feature["properties"].get("shapeISO") != "TH-43":
        raise ValueError("Expected the Nong Khai Province (TH-43) polygon")
    polygon_utm = transform(Transformer.from_crs(4326, 32647, always_xy=True).transform, shape(feature["geometry"]))
    c0, c1, r0, r1 = aligned_window(polygon_utm)
    width, height = c1-c0, r1-r0
    grid = Affine(PIXEL, 0, ULX_CENTER - PIXEL/2 + c0*PIXEL,
                  0, -PIXEL, ULY_CENTER + PIXEL/2 - r0*PIXEL)
    print(f"Window: col[{c0}:{c1}], row[{r0}:{r1}], {width} x {height} native cells", flush=True)
    mask = rasterize([(polygon_utm, 1)], out_shape=(height, width), transform=grid, fill=0, dtype="uint8").astype(bool)
    data = np.empty((height, width), dtype="<i2")
    drive = DriveRanges()
    for i, row in enumerate(range(r0, r1, 64)):
        n = min(64, r1 - row)
        raw = drive.read(row * ROW_BYTES, (row + n) * ROW_BYTES - 1)
        data[row-r0:row-r0+n] = np.frombuffer(raw, dtype="<i2").reshape(n, SOURCE_COLS)[:, c0:c1]
        if i % 10 == 0 or row + n == r1:
            print(f"BIL rows: {row+n-r0}/{height}, valid inside polygon: {int(((data[:row+n-r0]!=SOURCE_NODATA)&mask[:row+n-r0]).sum()):,}", flush=True)

    subset_valid = data != SOURCE_NODATA
    included = subset_valid & mask
    if included.sum() < 1000:
        raise RuntimeError("Nong Khai window has too few valid DEM cells; verify CRS")
    image_path = args.output_dir / "nong-khai-30m.tif"
    with tempfile.TemporaryDirectory() as tmp:
        temp = Path(tmp) / "nong-khai-unoptimized.tif"
        with rasterio.open(temp, "w", driver="GTiff", height=height, width=width, count=1,
                           dtype="int16", crs="EPSG:32647", transform=grid,
                           nodata=SOURCE_NODATA, tiled=True, blockxsize=512,
                           blockysize=512, compress="DEFLATE") as dst:
            clipped = np.where(mask, data, SOURCE_NODATA).astype("<i2")
            dst.write(clipped, 1)
            dst.update_tags(DEM_SOURCE=DRIVE_URL, BOUNDARY_SOURCE=BOUNDARY_URL,
                            NATIVE_PIXEL_METERS=f"{PIXEL:.13f}", EXTRACTION="native grid, masked at provincial boundary")
        raster_copy(temp, image_path, driver="COG", compress="DEFLATE", blocksize=512,
                    overview_resampling="NEAREST", num_threads=2)

    tile_count, tile_bytes = png_tiles(data, args.output_dir / "tiles-final", args.tile_size)
    info = {
        "name": "Nong Khai Province native-resolution DEM",
        "original_dem": {"file": "DEM.bil", "drive_id": DRIVE_ID, "size_bytes": SOURCE_ROWS*ROW_BYTES,
                         "source_crs": "EPSG:32647", "dtype": "int16 little endian", "nodata": SOURCE_NODATA,
                         "georeferencing": "ULXMAP/ULYMAP are centers of upper-left source pixel",
                         "vertical_datum": "not specified by supplied .hdr/.prj"},
        "boundary": {"source": BOUNDARY_URL, "provider": "geoBoundaries THA ADM1 gbOpen / OSM",
                     "source_year": "2017", "license": "ODbL 1.0", "shape_iso": "TH-43",
                     "feature_sha256": hashlib.sha256(args.boundary.read_bytes()).hexdigest()},
        "projection": "EPSG:32647", "pixel_m": PIXEL, "source_window": {"col_start": c0, "col_end_exclusive": c1,
                                                               "row_start": r0, "row_end_exclusive": r1},
        "left_m": grid.c, "top_m": grid.f, "width": width, "height": height,
        "nodata": SOURCE_NODATA, "valid_cells_inside_province": int(included.sum()),
        "all_cells_inside_province": int(mask.sum()),
        "elevation_min_m": int(data[included].min()), "elevation_max_m": int(data[included].max()),
        "cog": image_path.name,
        "browser_tiles": {"directory": "tiles-final", "size": args.tile_size, "columns": math.ceil(width/args.tile_size),
                          "rows": math.ceil(height/args.tile_size), "encoding": "R:G are (signed elevation + 32768) high:low bytes; B=255 for valid, 0 for nodata; pixel centers map to original UTM grid",
                          "tiles_count": tile_count, "tiles_bytes": tile_bytes, "not_masked_to_province": True}
    }
    (args.output_dir / "metadata.json").write_text(json.dumps(info, ensure_ascii=False, indent=2)+"\n")
    print(f"COG: {image_path.stat().st_size:,} bytes; PNG tiles: {tile_count} / {tile_bytes:,} bytes; valid {included.sum():,} cells, {info['elevation_min_m']}..{info['elevation_max_m']}m", flush=True)


if __name__ == "__main__":
    main()
