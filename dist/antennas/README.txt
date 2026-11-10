Source: user-supplied Sinclair Technologies Inc. Planet PRN archives:
3.Yagis_Planet.zip (255 files), 4.Collinear_Omnis_Planet.zip (1365 files).
All 1620 files contain 360 horizontal and 360 vertical attenuation samples in dB, with GAIN explicitly in dBi and FREQUENCY in MHz.
476 eligible model groups / 1574 frequency samples. 6 model groups are withheld because multiple different cuts claim the same FREQUENCY; see issues.json. Do not silently infer corrected frequency from filenames.
Model groups preserve suffixes/options, removing only the final numeric frequency filename suffix.
Catalog min/max are the bounds of supplied samples, NOT manufacturer-certified operating bands.
At intermediate frequencies the simulator interpolates gain and per-angle attenuation linearly in dB. It does not extrapolate outside sampled bounds.
Vertical convention: 0 horizon, 90 down, 270 up. Mechanical tilt rotates local antenna coordinates. Intrinsic tilt in the cuts is retained.
The simulator approximates directional attenuation as H(local azimuth) + V(local depression); two principal cuts do not determine a unique 3-D pattern. Departure direction is geometric (DEM endpoint elevations and effective-Earth curvature if DEM enabled), not a ray-traced diffracted ray.
Only the base antenna uses these patterns. Terminal gain remains the configured constant.
