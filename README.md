# Radio Coverage Lab

Independent, static radio coverage planning prototype. On GitHub, open `index.html`; in the Sites checkout, open `dist/index.html`. No build dependencies or connection to the Azimuth website.

## Propagation model selector

The original **FSPL + clutter + optional DEM diffraction** mode remains the default. Two empirical alternatives are selectable:

| Mode | ETSI TR 101 362 Annex B limits | Environments |
| --- | --- | --- |
| Okumura–Hata | 150–1000 MHz; base height 30–200 m; mobile height 1–10 m; distance 1–20 km | Medium city; large city (special mobile antenna correction); suburban; quasi-open rural; open rural |
| COST‑231 Hata | 1500–2000 MHz; same antenna and distance ranges | Medium city/suburban centre (`Cm=0`), metropolitan centre (`Cm=3 dB`); quasi-open/open rural use the Hata rural corrections described in the ETSI document |

For Hata, the urban median path loss is `69.55 + 26.16 log10(f) − 13.82 log10(hB) − a(hM) + (44.9 − 6.55 log10(hB)) log10(d)`. For COST‑231 Hata it is `46.3 + 33.9 log10(f) − 13.82 log10(hB) − a(hM) + (44.9 − 6.55 log10(hB)) log10(d) + Cm`, with frequency in MHz and distance in km. The medium-city/mobile correction is `(1.1 log10(f) − 0.7) hM − (1.56 log10(f) − 0.8)`; Hata's large-city option uses the frequency-dependent correction in ETSI Annex B. Suburban Hata and rural corrections follow that same annex. The app rejects invalid frequency/antenna heights and leaves distances below 1 km or above 20 km uncoloured rather than extrapolating. The pass percentage and CSV in an empirical mode cover only valid receiver samples. The base-height field is treated as the **effective** base antenna height required by these models; a nominal mast height may need to be adjusted for terrain.

Hata and COST‑231 Hata already include aggregate environment effects, so they replace FSPL + separate P.2108 clutter + DEM diffraction. Selecting either empirical model disables the separate clutter and DEM controls; returning to the baseline restores the previous selections. COST‑231 Hata does not apply to the default 857 MHz frequency. The current terrain-aware baseline is still the useful map view for mountainous areas, though it remains a simplified single-edge approximation.

Reference: [ETSI TR 101 362 V7.0.0, Annex B](https://www.etsi.org/deliver/etsi_tr/101300_101399/101362/07.00.00_60/tr_101362v070000p.pdf).

## Google satellite basemap

Use the map selector to choose **Google satellite imagery** (Google Maps JavaScript API, hybrid map type). Paste a Maps JavaScript API key in the page and click the load button. The key is sent directly from the browser to Google only when requested; it is not included in this repository or persisted in browser storage. The Google Cloud project must have the Maps JavaScript API enabled and suitable billing or a supported demo key. Restrict the key to the deployment website's HTTP referrer and to Maps JavaScript API. The Google imagery is a basemap; terrain diffraction still comes from independent Mapzen/AWS DEM tiles, not Google elevation data. OpenStreetMap remains the default when no Google key is supplied.

The Google Maps JavaScript API is a 2D satellite/hybrid map, not the Google Earth 3D application.

## Model

For every point in the circular grid (105×105, 201×201, or 301×301 selectable):

1. Read Mapzen Terrarium terrain tiles (AWS Open Data) at an adaptive zoom; decode terrain metres as `R × 256 + G + B / 256 − 32768`.
2. Sample the radial terrain profile from base to receiver (up to 120 or 180 interior samples, depending on selected resolution). Use a `K = 4/3` effective Earth radius and the entered antenna heights.
3. Find the largest knife-edge diffraction parameter `v` along that path. Approximate its excess loss using `J(v) = 6.9 + 20 log10(√((v−0.1)²+1) + v−0.1)` for `v > −0.78`, otherwise 0 dB. This is a **single dominant edge approximation**; it does not account for multiple obstacles or site-specific propagation percentages.
4. `FSPL(dB) = 32.44 + 20 log10(f_MHz) + 20 log10(d_km)`; a 10 m floor avoids a singularity at the transmitter.
5. `path loss = FSPL + receiver terminal clutter correction + diffraction loss`. Select a manual constant (the original 8 dB default), or choose a terminal clutter category from Recommendation ITU-R P.2108-1 Annex 1 §3.1 Table 3. The categories are water/sea (10 m), open/rural (10 m), suburban (10 m), urban/trees/forest (15 m), and dense urban (20 m). The height gain correction uses its equations (1), (2a)–(2g), frequency in GHz, street width 27 m and the entered mobile antenna height. The automatic option accepts 30–3000 MHz only; receiver height at or above representative clutter height produces 0 dB correction. For an automatic category the terrain profile is evaluated to the representative clutter height at the receiver and then the terminal correction is applied. The selected category is uniform across all receiver points; it is not derived from the map image. The base station is assumed above its local clutter, so no base terminal correction is added.
6. `downlink = base TX + horizontal antenna gain - base feeder loss + mobile gain - mobile loss - path loss`.
7. `uplink = mobile TX + mobile gain - mobile loss + horizontal base antenna gain - base feeder loss - path loss`.
8. A point passes two-way service only when both received powers exceed the entered receive threshold.

Sector approximation: `A(θ) = min(30, 12 × (Δθ / HPBW)^2) dB`. This is a simplified horizontal pattern, not an equipment-specific antenna pattern. The plotted circle uses a local equirectangular coordinate approximation for display and CSV coordinates over an OpenStreetMap basemap.

The map can be zoomed with buttons or mouse wheel and panned by dragging. A continuous color ramp and bilinear interpolation between computed signal values make the heatmap smoother in both full and zoomed views; antialiasing is applied at the study-circle edge or at the empirical 1–20 km annulus. This interpolation is for display only, and cannot improve the physical resolution of DEM or the point calculations. The coverage percentage and CSV retain the actual sampled grid for the selected model. The CSV includes path loss, a model ID, and diagnostic FSPL; in empirical modes **FSPL + clutter + diffraction is not the calculated path loss**, and clutter/diffraction columns are zero because those separate corrections are not applied. Higher grid settings load finer DEM tiles where available, limited to 80 tiles and the source DEM resolution. Zooming alone does not increase the underlying DEM tile resolution. Calculation runs in batches with progress feedback; a new run cancels the previous one.

The DEM dataset's native resolution varies by source and region; the adaptive tile zoom and at most 120 or 180 radial samples can miss narrow ridges. The model uses a specific terminal correction from ITU-R P.2108-1, but is **not** a full ITU-R P.1812 propagation implementation. It does not infer actual building or tree cover at each pixel and does not model multiple-edge diffraction, interference, antenna elevation pattern, multipath or rain. Results are exploratory and require field calibration. If terrain data fails to load, the terrain mode does not present a fallback as though it were terrain-adjusted coverage. A separate baseline mode displays FSPL plus the selected clutter correction.

Sources: https://www.itu.int/rec/R-REC-P.2108, https://registry.opendata.aws/terrain-tiles/ and https://operations.osmfoundation.org/policies/tiles/.
