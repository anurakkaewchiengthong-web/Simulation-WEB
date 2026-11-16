# Auto-range and tiled coverage computation — design (2026-11-16)

## Observed defect and current behavior
In `dist/single.html`, `expandRange()` uses `maxRadius = gridTarget ? Math.min(200, gridTarget/2) : 200`. Thus 50 m target caps a 25 km initial radius at 25 km, even if the outer ring contains RSSI >= -105 dBm. This is an intentional fidelity guard, not evidence of a propagation cutoff. `colouredEdge()` samples 144 bearings at 0.985 × radius and requires complete DEM samples. The current grid uses a fixed maximum of 1,001 × 1,001 cells.

## Product contract
- `initialRadiusKm` is the starting search radius, not the final clipping radius.
- `maxSearchRadiusKm` is an explicit independent setting, capped at 200 km.
- `targetGridSpacingM` controls spatial fidelity (25/50/100/250 m), independent of the search limit. No silent resolution degradation.
- `computeMode`: `fixed-grid-preview` (current legacy behavior) or `tiled-detail` (future engine). The legacy option must be labeled as radius-limited and must not pretend to have located a coverage boundary.
- Report both `searchedRadiusKm` and `renderedRadiusKm`; do not conflate coverage edge, map viewport, and compute domain.

## Search stage (before detailed rasterization)
1. Validate initial radius <= max search radius, frequency/model, DEM completeness, and a per-run budget.
2. Probe concentric rings, with angular sample spacing bounded by a physical arc length rather than a fixed 144 bearings at all radii. Check downlink and uplink separately and record whether either meets -105 dBm.
3. Expand by a bounded growth factor until two successive complete, uncoloured rings, the explicit max radius, cancellation, or an error. Record the stop reason and the last coloured radius. The two-ring heuristic is an approximate bound, not a proof that no isolated lobes exist farther out.
4. A missing DEM sample means `dem-incomplete`, never `coverage-ended`. `clutterScenario=map` and unsupported propagation models must report `unsupported-mode` rather than imply auto-range succeeded.
5. Use a reproducible search trace (radius, samples, coloured count, missing count, elapsed time) for troubleshooting and tests.

## Detailed compute stage
- Partition the selected bounding box into fixed-size tiles (e.g. 256 × 256 receivers), each at the chosen target spacing; compute only cells inside the searched circular domain.
- Keep tile coordinates in a stable projected/local metric frame; handle pixel-to-coordinate transforms consistently with existing map/KMZ exports.
- Cache DEM samples/tiles by source, resolution and bounds; bound concurrent requests, memory, and total cells. Use workers for independent tiles with cancellation tokens.
- Process near-field tiles first, then progressively outward. Keep partially computed tiles visually distinct and **disable final export** until all required tiles succeed.
- For 50 m spacing at radius 25 km, the circular domain already contains about 785,000 samples; at 200 km it would contain about 50 million. A 200 km high-detail run must therefore require a visible compute budget, area/ROI restriction or progressive on-demand tiles; it cannot be promised as a quick all-area render.
- Do not change `propagation()`, antenna pattern, terrain diffraction or RSSI palette as part of the grid-engine refactor.

## Explicit stop reasons
`coverage-edge-approx`, `max-search-radius`, `grid-preview-limit`, `dem-incomplete`, `cancelled`, `unsupported-mode`, `compute-budget`, `error`. UI text must state whether the boundary is approximate or unconfirmed.

## Incremental implementation
Phase 1: UI messaging and automated regression tests for the existing grid cap (no change to RF math). Phase 2: extract ring-search pure functions and test synthetic isotropic, directional-lobe, missing DEM and cancellation cases. Phase 3: tile worker, cache, progress and budget guard behind a feature flag. Phase 4: map overlay, marker lookup, dual-station RFPair, KMZ export parity and production rollout only after numerical/reference-vector tests.

## Acceptance criteria
- 25 km initial radius + 50 m target explicitly reports `grid-preview-limit` in legacy mode; never says coverage ended.
- Tiled mode can search beyond 25 km without silently changing 50 m spacing; if budget is exceeded it reports `compute-budget` and offers ROI/preview alternatives.
- Cancelling computation cannot leave stale tiles or exportable incomplete results.
- Fixed model inputs produce equivalent RSSI values at sampled coordinates in both engines within a documented numerical tolerance.
- Existing Sim 1/Sim 2, microwave and Wi-Fi smoke tests remain green.
