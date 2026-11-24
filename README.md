# Radio Coverage Lab

Independent, static radio coverage planning prototype. On GitHub, open `index.html`; in the Sites checkout, open `dist/index.html`. No build dependencies or connection to the Azimuth website.

## DEM stored in GitHub

### Default station: 15.993741° N, 99.364571° E

The page opens at **15.993741, 99.364571** with a 25 km study radius and automatically selects [`dem/default-site/default-site-30m.tif`](dem/default-site/default-site-30m.tif), extracted from the user's 3.35 GB `DEM.bil` on Google Drive. The stored raster covers the station's study square plus 5 km of margin, with its native 30.1469654783933 m signed 16-bit UTM zone 47N (EPSG:32647) cells preserved without resampling. [`dem/default-site/tiles-final`](dem/default-site/tiles-final) contains lossless PNG tiles encoding the same heights for the browser. [`dem/default-site/metadata.json`](dem/default-site/metadata.json) records the exact source window and coordinate transform. The extraction script is [`scripts/extract_default_site_dem.py`](scripts/extract_default_site_dem.py).

The browser uses the locally stored subset automatically at this coordinate; it does not stream the full BIL from Google Drive at page load. When the full study square falls outside a locally stored area, the existing Mapzen fallback applies. The DEM pixel size does not change the receiver simulation grid: at a 25 km radius the default 201 × 201 grid is spaced about 249 m, and terrain profiles are still sampled at up to 120 or 180 points along each radial path.

### Nong Khai from the user-provided BIL

[`dem/nong-khai/nong-khai-30m.tif`](dem/nong-khai/nong-khai-30m.tif) is a cloud-optimized GeoTIFF clipped to the Nong Khai provincial polygon. Its original 30.1469654783933 m UTM zone 47N grid (EPSG:32647), signed 16-bit heights, and NoData = −32767 are preserved without interpolating or resampling. The raster window is 4770 × 2671 pixels; 3,657,436 native cells inside the province have valid elevations. Only the source BIL rows overlapping Nong Khai were downloaded using HTTP byte ranges, rather than copying the 3.35 GB Drive file into Git.

[`dem/nong-khai/metadata.json`](dem/nong-khai/metadata.json) records the full georeferencing, extraction window, pixel encoding, and provenance. The original small [`source.hdr`](dem/nong-khai/source.hdr) and [`source.prj`](dem/nong-khai/source.prj) are retained for audit. The reproducible extractor is [`scripts/extract_nong_khai_dem.py`](scripts/extract_nong_khai_dem.py), requiring NumPy, Pillow, rasterio, pyproj, and Shapely. Browser-ready lossless RGB PNG tiles are in [`dem/nong-khai/tiles-final`](dem/nong-khai/tiles-final), preserving every source elevation value and its NoData mask; tiles include the raster's rectangular surroundings so a simulated path can cross the provincial line.

The boundary comes from [geoBoundaries THA ADM1 gbOpen](https://www.geoboundaries.org/api/current/gbOpen/THA/ADM1/), feature TH-43, based on OpenStreetMap/Wambacher (source year 2017), licensed under ODbL 1.0. Credit: © OpenStreetMap contributors / geoBoundaries, ODbL 1.0. Administrative outlines are approximate and may differ from current official boundaries. The original DEM's horizontal CRS is documented in its `.prj`, but its **vertical datum and source survey date are not specified** in the supplied `.hdr`/`.prj`; do not infer sub-metre vertical accuracy from the 30 m pixel size.

For simulation, the browser selects Nong Khai's native DEM tiles when the full study square fits in the extracted raster window. The button **ดูตัวอย่างพื้นที่หนองคาย** loads an example coordinate (17.878° N, 102.747° E, 25 km radius); it is not a real base station. If the square is outside the window or a tile cannot load, the existing Mapzen data source is selected for that whole calculation. The GeoTIFF is masked to the province for GIS use; browser tiles intentionally include the rectangular neighboring terrain. The 105/201/301 receiver grid and up to 120/180 terrain samples per radio path remain separate limits: selecting the 30 m DEM alone does not create a 30 m coverage prediction everywhere.

### Earlier study-area mosaic

The earlier study area centred at **16.029156° N, 100.627809° E** with a 25 km radius uses [`dem/study-area-z12.png`](dem/study-area-z12.png). This is a lossless 1536 × 1536 Terrarium RGB mosaic of 36 Mapzen terrain tiles at Web Mercator zoom 12 (approximately 37 m between output pixels near this latitude). It is under 1 MB rather than storing a multi-gigabyte source dataset. [`dem/study-area.json`](dem/study-area.json) contains its georeferencing, source, and attribution. The underlying elevation source may have lower native resolution; this file does not add elevation detail beyond its source.

When the complete study square fits inside one of the stored DEM areas, the browser reads the local DEM and needs no AWS terrain request. Moving the station or increasing the radius beyond it uses the previous AWS terrain tile download; a missing or unreadable local file also falls back to AWS. DEM can be enabled in FSPL, Hata, and COST‑231 Hata modes. In the empirical modes, a separate single-edge diffraction estimate is added to the Hata loss; this hybrid estimate should be calibrated with field measurements. The satellite basemap is independent from DEM.

Mapzen Terrain Tiles were accessed on 2026-09-24 from [the AWS Open Data registry](https://registry.opendata.aws/terrain-tiles/). See [source-specific terrain data credits](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) and [Mapzen data rights](https://www.mapzen.com/rights/). The earlier Mapzen mosaic is distinct from the user's 3 GB BIL; the new Nong Khai COG and PNGs come from that BIL.

## Propagation model selector

The original **FSPL + clutter + optional DEM diffraction** mode remains the default. Two empirical alternatives are selectable:

| Mode | ETSI TR 101 362 Annex B limits | Environments |
| --- | --- | --- |
| Okumura–Hata | 150–1000 MHz; base height 30–200 m; mobile height 1–10 m; distance 1–20 km | Medium city; large city (special mobile antenna correction); suburban; quasi-open rural; open rural |
| COST‑231 Hata | 1500–2000 MHz; same antenna and distance ranges | Medium city/suburban centre (`Cm=0`), metropolitan centre (`Cm=3 dB`); quasi-open/open rural use the Hata rural corrections described in the ETSI document |

For Hata, the urban median path loss is `69.55 + 26.16 log10(f) − 13.82 log10(hB) − a(hM) + (44.9 − 6.55 log10(hB)) log10(d)`. For COST‑231 Hata it is `46.3 + 33.9 log10(f) − 13.82 log10(hB) − a(hM) + (44.9 − 6.55 log10(hB)) log10(d) + Cm`, with frequency in MHz and distance in km. The medium-city/mobile correction is `(1.1 log10(f) − 0.7) hM − (1.56 log10(f) − 0.8)`; Hata's large-city option uses the frequency-dependent correction in ETSI Annex B. Suburban Hata and rural corrections follow that same annex. The app rejects invalid frequency/antenna heights and fills distances below 1 km with a near-station estimate anchored to Hata at 1 km, using a 20 log10(d) slope and a 10 m distance floor; beyond 20 km remains uncoloured. The pass percentage and CSV in an empirical mode include the labelled near-station estimate and the valid 1–20 km samples. The base-height field is treated as the **effective** base antenna height required by these models; a nominal mast height may need to be adjusted for terrain.

Hata and COST‑231 Hata already include aggregate environment effects, so they replace FSPL + separate P.2108 clutter + DEM diffraction. Selecting either empirical model disables the separate clutter correction. The DEM checkbox remains available and adds the calculated single-edge diffraction estimate to the empirical loss; leave it unchecked for the unmodified empirical model. COST‑231 Hata does not apply to the default 857 MHz frequency. The current terrain-aware baseline is still the useful map view for mountainous areas, though it remains a simplified single-edge approximation.

Reference: [ETSI TR 101 362 V7.0.0, Annex B](https://www.etsi.org/deliver/etsi_tr/101300_101399/101362/07.00.00_60/tr_101362v070000p.pdf).

## Google satellite basemap

Use the map selector to choose **Google satellite imagery** (Google Maps JavaScript API, hybrid map type). Paste a Maps JavaScript API key in the page and click the load button. The key is sent directly from the browser to Google only when requested; it is not included in this repository or persisted in browser storage. The Google Cloud project must have the Maps JavaScript API enabled and suitable billing or a supported demo key. Restrict the key to the deployment website's HTTP referrer and to Maps JavaScript API. The Google imagery is a basemap; terrain diffraction comes from the selected local BIL-derived DEM or independent Mapzen/AWS terrain tiles, not Google elevation data. OpenStreetMap remains the default when no Google key is supplied.

The Google Maps JavaScript API is a 2D satellite/hybrid map, not the Google Earth 3D application.

## Model

For every point in the circular grid (105×105, 201×201, or 301×301 selectable):

1. In the default station area or Nong Khai where the full study window fits, read the native 30.146965 m BIL-derived RGB tiles; otherwise use the earlier Mapzen Terrarium mosaic at zoom 12 or Mapzen terrain tiles (AWS Open Data) at an adaptive zoom. The BIL-derived tile channels encode signed height + 32768 across red/green, with blue marking valid/NoData; Mapzen uses `R × 256 + G + B / 256 − 32768`.
2. Sample the radial terrain profile from base to receiver (up to 120 or 180 interior samples, depending on selected resolution). Use a `K = 4/3` effective Earth radius and the entered antenna heights.
3. Find the largest knife-edge diffraction parameter `v` along that path. Approximate its excess loss using `J(v) = 6.9 + 20 log10(√((v−0.1)²+1) + v−0.1)` for `v > −0.78`, otherwise 0 dB. This is a **single dominant edge approximation**; it does not account for multiple obstacles or site-specific propagation percentages.
4. `FSPL(dB) = 32.44 + 20 log10(f_MHz) + 20 log10(d_km)`; a 10 m floor avoids a singularity at the transmitter.
5. `path loss = FSPL + receiver terminal clutter correction + diffraction loss`. Select a manual constant (the original 8 dB default), or choose a terminal clutter category from Recommendation ITU-R P.2108-1 Annex 1 §3.1 Table 3. The categories are water/sea (10 m), open/rural (10 m), suburban (10 m), urban/trees/forest (15 m), and dense urban (20 m). The height gain correction uses its equations (1), (2a)–(2g), frequency in GHz, street width 27 m and the entered mobile antenna height. The automatic option accepts 30–3000 MHz only; receiver height at or above representative clutter height produces 0 dB correction. For an automatic category the terrain profile is evaluated to the representative clutter height at the receiver and then the terminal correction is applied. The selected category is uniform across all receiver points; it is not derived from the map image. The base station is assumed above its local clutter, so no base terminal correction is added.
6. `downlink = base TX + horizontal antenna gain - base feeder loss + mobile gain - mobile loss - path loss`.
7. `uplink = mobile TX + mobile gain - mobile loss + horizontal base antenna gain - base feeder loss - path loss`.
8. A point passes two-way service only when both received powers exceed the entered receive threshold.

Sector approximation: `A(θ) = min(30, 12 × (Δθ / HPBW)^2) dB`. This is a simplified horizontal pattern, not an equipment-specific antenna pattern. The plotted circle uses a local equirectangular coordinate approximation for display and CSV coordinates over an OpenStreetMap basemap.

The map can be zoomed with buttons or mouse wheel and panned by dragging. A continuous color ramp and bilinear interpolation between computed signal values make the heatmap smoother in both full and zoomed views; antialiasing is applied at the study-circle edge or at the empirical outer 20 km circle. This interpolation is for display only, and cannot improve the physical resolution of DEM or the point calculations. The coverage percentage and CSV retain the actual sampled grid for the selected model. The CSV includes path loss, a model ID, and diagnostic FSPL; in empirical modes the calculated path loss is the Hata base value plus optional DEM diffraction, without separate clutter correction. The CSV includes the Hata base value in `hata_base_db`. The earlier Mapzen study area always reads the same zoom 12 DEM file; the default station and Nong Khai use fixed native 30.15 m DEM windows, while areas outside all stored windows load online DEM tiles at adaptive zoom, limited to 80 tiles and their source resolution. Zooming alone does not increase the underlying DEM tile resolution. Calculation runs in batches with progress feedback; a new run cancels the previous one.

Terrain sources vary in native accuracy; even in the new 30.15 m windows, at most 120 or 180 samples per radio path can miss narrow ridges. The model uses a specific terminal correction from ITU-R P.2108-1, but is **not** a full ITU-R P.1812 propagation implementation. It does not infer actual building or tree cover at each pixel and does not model multiple-edge diffraction, interference, antenna elevation pattern, multipath or rain. Results are exploratory and require field calibration. If terrain data fails to load, the terrain mode does not present a fallback as though it were terrain-adjusted coverage. A separate baseline mode displays FSPL plus the selected clutter correction.

Sources: https://www.itu.int/rec/R-REC-P.2108, https://registry.opendata.aws/terrain-tiles/ and https://operations.osmfoundation.org/policies/tiles/.

## Coverage colors

The map uses the supplied Zone palette at levels ≥−45, ≥−55, ≥−65, ≥−75, ≥−85, ≥−95, and ≥−100 dBm, respectively (blue, cyan, turquoise, green, lime, orange, red), taking colors from the left column and numeric thresholds from the right column of the supplied reference. The interval from −105 to below −100 dBm remains red. Values strictly below −105 dBm have no overlay. Colors describe selected downlink, uplink, or weaker two-way receive power; the separate configurable receive threshold still determines the pass percentage.

## Near-station display in Hata modes

Hata is specified for 1–20 km and would otherwise leave a 1 km blank circle around the station. The site now draws the interior using `L(d) = L_Hata(1 km) + 20 log10(max(d, 0.01 km))` for `d < 1 km`. This is continuous at 1 km and is labelled as an approximation in the interface; it is not a Hata prediction validated at short range. If DEM is enabled, the existing terrain diffraction term is still evaluated for interior paths of at least 100 m. Values below −105 dBm remain transparent.

## Export to Google Earth

After a simulation, choose Downlink, Uplink, or Two-way and click **ส่งออก Google Earth (KML)**. The self-contained vector KML includes colored coverage polygons, the base-station point and the study-radius outline. Import it in Google Earth Pro or Google Earth web. The exported colors use the selected signal direction and the current Zone palette; values below −105 dBm have no polygons. Valid grid samples are averaged into a grid of at most 96 × 96 cells and same-color horizontal neighbors are merged, keeping the file below 10,000 features for web import. The export grid can therefore be coarser than the web calculation grid. The separate CSV retains all computed receiver samples.

## Smooth export for Google Earth Pro

Use **Google Earth Pro (KMZ)** to export a self-contained terrain-draped PNG image with the selected coverage colors, a station point, and a study-radius boundary. It uses bilinear interpolation of the original simulation grid at four display pixels per grid cell and preserves transparency below −105 dBm. This makes the display smooth but does not add new RF or DEM detail. The **Earth บนเว็บ (KML)** button retains the coarse vector polygons for the web importer.
# เปรียบเทียบ Clutter Classes (หนองคาย)

หน้าเว็บมีตัวเลือก “ไม่ใช้แผนที่” กับ “ใช้ ESA WorldCover” สำหรับพิกัดตัวอย่างหนองคาย รัศมี 10 km ในโหมด FSPL + clutter + DEM เท่านั้น การคำนวณทั้งสองกรณีใช้ความถี่ กำลังส่ง สายอากาศ DEM และกริดจุดรับชุดเดียวกัน แล้วแสดงความต่างของพื้นที่ผ่านเกณฑ์และ RSSI รายจุด การส่งออก CSV เพิ่มค่ากรณีใช้แผนที่ไว้เทียบกับค่าเดิม

`dist/clutter/nong-khai-worldcover-2021.png` ตัดจาก ESA WorldCover 2021 v200 แผ่น `N15E102` โดยรักษารหัสประเภทพิกเซล 10 ม. ในกรอบ 102.62–102.88°E, 17.77–17.985°N ตาม EPSG:4326 ชั้นสีที่แสดงบนหน้าเว็บลดความละเอียดเพื่อการแสดงผล แต่การคำนวณเลือกประเภทจากพิกเซลต้นฉบับ ข้อมูลและเครดิต: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. ใบอนุญาต CC BY 4.0.

การแมปประเภทเป็นค่าอ้างอิงตาม ITU-R P.2108-1: ต้นไม้และสิ่งปลูกสร้าง → urban (R=15 m), น้ำ → water (R=10 m), เกษตร/หญ้า/พุ่มไม้/ดินโล่ง/ชุ่มน้ำ → rural (R=10 m). เป็นสมมติฐานทดลองสำหรับ terminal correction; ความสูง R ไม่ใช่ความสูงสิ่งปลูกสร้างหรือเรือนยอดจริง การเปรียบเทียบกรณีแผนที่แทนค่า clutter เดิม ไม่บวกทับกัน และปรับความสูงอ้างอิงปลายทางในการคำนวณ diffraction ให้สอดคล้องกับประเภทที่เลือก ไม่ใช้การแมปพิกเซลนี้กับ Hata/COST-231 เพราะสภาพแวดล้อมอยู่ในสูตรแล้ว ข้อมูลปี 2021 อาจต่างจากสภาพพื้นที่ปัจจุบัน ต้องตรวจเทียบผลสำรวจจริง
