# Radio Coverage Lab

Independent, static radio coverage planning prototype. On GitHub, open `index.html`; in the Sites checkout, open `dist/index.html`. No build dependencies or connection to the Azimuth website.

## Google satellite basemap

Use the map selector to choose **Google satellite imagery** (Google Maps JavaScript API, hybrid map type). Paste a Maps JavaScript API key in the page and click the load button. The key is sent directly from the browser to Google only when requested; it is not included in this repository or persisted in browser storage. The Google Cloud project must have the Maps JavaScript API enabled and suitable billing or a supported demo key. Restrict the key to the deployment website's HTTP referrer and to Maps JavaScript API. The Google imagery is a basemap; terrain diffraction still comes from independent Mapzen/AWS DEM tiles, not Google elevation data. OpenStreetMap remains the default when no Google key is supplied.

The Google Maps JavaScript API is a 2D satellite/hybrid map, not the Google Earth 3D application.

## Model

For every point in the circular grid (105×105, 201×201, or 301×301 selectable):

1. Read Mapzen Terrarium terrain tiles (AWS Open Data) at an adaptive zoom; decode terrain metres as `R × 256 + G + B / 256 − 32768`.
2. Sample the radial terrain profile from base to receiver (up to 120 or 180 interior samples, depending on selected resolution). Use a `K = 4/3` effective Earth radius and the entered antenna heights.
3. Find the largest knife-edge diffraction parameter `v` along that path. Approximate its excess loss using `J(v) = 6.9 + 20 log10(√((v−0.1)²+1) + v−0.1)` for `v > −0.78`, otherwise 0 dB. This is a **single dominant edge approximation**; it does not account for multiple obstacles or site-specific propagation percentages.
4. `FSPL(dB) = 32.44 + 20 log10(f_MHz) + 20 log10(d_km)`; a 10 m floor avoids a singularity at the transmitter.
5. `path loss = FSPL + user-entered constant clutter loss + diffraction loss`.
6. `downlink = base TX + horizontal antenna gain - base feeder loss + mobile gain - mobile loss - path loss`.
7. `uplink = mobile TX + mobile gain - mobile loss + horizontal base antenna gain - base feeder loss - path loss`.
8. A point passes two-way service only when both received powers exceed the entered receive threshold.

Sector approximation: `A(θ) = min(30, 12 × (Δθ / HPBW)^2) dB`. This is a simplified horizontal pattern, not an equipment-specific antenna pattern. The plotted circle uses a local equirectangular coordinate approximation for display and CSV coordinates over an OpenStreetMap basemap.

The map can be zoomed with buttons or mouse wheel and panned by dragging. The full-study grid is rendered as a cached raster for smooth panning. Zoomed views can recalculate receiver points at screen resolution; the global coverage percentage and CSV retain the full-study grid. Higher grid settings load finer DEM tiles where available, limited to 80 tiles and the source DEM resolution. Zooming alone does not increase the underlying DEM tile resolution. Calculation runs in batches with progress feedback; a new run cancels the previous one.

The DEM dataset's native resolution varies by source and region; the adaptive tile zoom and at most 100 radial samples can miss narrow ridges. It does not model multiple-edge diffraction, vegetation, buildings, interference, antenna elevation pattern, multipath, rain, or a specific ITU-R propagation Recommendation. Results are exploratory and require field calibration. If terrain data fails to load, the terrain mode does not present a fallback as though it were terrain-adjusted coverage. A separate baseline mode displays FSPL plus constant clutter loss.

Sources: https://registry.opendata.aws/terrain-tiles/ and https://operations.osmfoundation.org/policies/tiles/.
