#!/usr/bin/env python3
"""Extract the default radio site's native DEM window from the supplied Drive BIL."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile

import numpy as np
from affine import Affine
from pyproj import Transformer
import rasterio
from rasterio.shutil import copy as raster_copy

from extract_nong_khai_dem import (
    DRIVE_URL, DriveRanges, PIXEL, ROW_BYTES, SOURCE_COLS, SOURCE_NODATA,
    ULX_CENTER, ULY_CENTER, aligned_window, png_tiles,
)

CENTER_LAT = 15.993741
CENTER_LON = 99.364571
STUDY_RADIUS_KM = 25
EXTRA_KM = 5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    east, north = Transformer.from_crs(4326, 32647, always_xy=True).transform(CENTER_LON, CENTER_LAT)
    half_width = (STUDY_RADIUS_KM + EXTRA_KM) * 1000
    bounds = SimpleNamespace(bounds=(east-half_width, north-half_width, east+half_width, north+half_width))
    c0, c1, r0, r1 = aligned_window(bounds)
    width, height = c1-c0, r1-r0
    grid = Affine(PIXEL, 0, ULX_CENTER-PIXEL/2+c0*PIXEL,
                  0, -PIXEL, ULY_CENTER+PIXEL/2-r0*PIXEL)
    print(f"Original DEM window: columns {c0}:{c1}, rows {r0}:{r1} = {width} × {height}", flush=True)

    data = np.empty((height, width), dtype="<i2")
    drive = DriveRanges()
    for index, row in enumerate(range(r0, r1, 64)):
        count = min(64, r1-row)
        raw = drive.read(row*ROW_BYTES, (row+count)*ROW_BYTES-1)
        data[row-r0:row-r0+count] = np.frombuffer(raw, dtype="<i2").reshape(count,SOURCE_COLS)[:,c0:c1]
        if index % 8 == 0 or row+count == r1:
            print(f"Read {row+count-r0}/{height} rows", flush=True)

    valid = data != SOURCE_NODATA
    if valid.sum() < data.size * 0.95:
        raise ValueError(f"Default site has excessive NoData: {valid.sum()} of {data.size} pixels")

    tif = args.output_dir / "default-site-30m.tif"
    with tempfile.TemporaryDirectory() as tempdir:
        temp = Path(tempdir)/"full-grid.tif"
        with rasterio.open(temp,"w",driver="GTiff",width=width,height=height,count=1,
                           dtype="int16",crs="EPSG:32647",transform=grid,
                           nodata=SOURCE_NODATA,tiled=True,blockxsize=512,
                           blockysize=512,compress="DEFLATE") as dst:
            dst.write(data,1)
            dst.update_tags(DEM_SOURCE=DRIVE_URL,STATION_LAT=CENTER_LAT,STATION_LON=CENTER_LON,
                            NATIVE_PIXEL_METERS=PIXEL,EXTRACTION="native UTM grid, no resampling")
        raster_copy(temp,tif,driver="COG",compress="DEFLATE",blocksize=512,
                    overview_resampling="NEAREST",num_threads=2)

    tile_count,tile_bytes = png_tiles(data,args.output_dir/"tiles-final",1024)
    metadata = {
        "description": "Native DEM for the default simulated base station",
        "center": {"lat":CENTER_LAT,"lon":CENTER_LON},
        "study_radius_km": STUDY_RADIUS_KM, "margin_km": EXTRA_KM,
        "original_dem": {"file":"DEM.bil", "drive_url":DRIVE_URL,
                         "crs":"EPSG:32647", "dtype":"int16 little endian", "nodata":SOURCE_NODATA,
                         "vertical_datum":"not specified by supplied source .hdr/.prj"},
        "pixel_m":PIXEL,"projection":"EPSG:32647",
        "left_m":grid.c,"top_m":grid.f,"width":width,"height":height,"nodata":SOURCE_NODATA,
        "source_window":{"col_start":c0,"col_end_exclusive":c1,"row_start":r0,"row_end_exclusive":r1},
        "valid_cells":int(valid.sum()),"elevation_min_m":int(data[valid].min()),
        "elevation_max_m":int(data[valid].max()),
        "cog":tif.name,
        "browser_tiles":{"directory":"tiles-final","size":1024,"tiles_count":tile_count,
                         "tiles_bytes":tile_bytes,"encoding":"R:G = signed elevation + 32768; B=255 valid, 0 NoData"},
    }
    (args.output_dir/"metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n")
    print(f"COG {tif.stat().st_size:,} bytes; {tile_count} PNG tiles / {tile_bytes:,} bytes; elevations {metadata['elevation_min_m']}..{metadata['elevation_max_m']} m",flush=True)


if __name__ == "__main__":
    main()
