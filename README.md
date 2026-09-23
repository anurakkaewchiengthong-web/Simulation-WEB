# Radio Coverage Lab

Independent, static radio coverage planning prototype. Open `index.html` in a browser. No dependencies and no connection to the original Azimuth website.

## Model

For each sample point within the study radius:

- `FSPL(dB) = 32.44 + 20 log10(f_MHz) + 20 log10(d_km)`; a 10 m floor avoids a singularity at the transmitter.
- `path loss = FSPL + user-entered constant excess loss`.
- `downlink = base TX + horizontal antenna gain - base feeder loss + mobile gain - mobile loss - path loss`.
- `uplink = mobile TX + mobile gain - mobile loss + horizontal base antenna gain - base feeder loss - path loss`.
- A point passes two-way service only when both received powers exceed the entered receive threshold.
- Sector approximation: `A(θ) = min(30, 12 × (Δθ / HPBW)^2) dB` where `Δθ` is the wrapped bearing offset. This is a simplified horizontal pattern, not an equipment-specific antenna pattern.

The plotted circle uses a local equirectangular coordinate approximation for display and CSV coordinates. It does not model terrain, diffraction, buildings, foliage, antenna elevation pattern, interference, or a specific ITU-R propagation recommendation. Its outputs are exploratory and must not be represented as validated field coverage.

## Next engineering milestone

Add elevation/land-cover data, a specified and independently validated implementation of ITU-R P.1812, measured equipment-specific patterns and receive thresholds, pointwise uplink/downlink calibration, and acceptance against drive-test data. The terrain-model implementation must expose its version, datasets, resolutions, time percentage and input assumptions in exports.
