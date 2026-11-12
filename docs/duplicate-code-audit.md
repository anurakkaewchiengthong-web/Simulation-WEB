# Duplicate-code audit and safe refactor plan — RF Sim v64

**Baseline:** `audit/rf-regression-baselines-20261112` (CI Run #7 passed).  
**Method:** Read-only comparison of source files; these findings do not establish byte-for-byte duplicate functions or runtime equivalence.

## Findings

| Area | Files / evidence | Assessment | Decision |
|---|---|---|---|
| DEM decode / sample | `terrain-fast.js` exports `RFTerrain.decode,prepare,sampler`; `mw-dem.js` calls `RFTerrain.decode` and `RFTerrain.sampler` | **Already shared** core implementation | **KEEP** shared utility. Do not duplicate or rewrite. Add edge/NoData tests before changes. |
| Native DEM metadata | `mw-dem.js` declares `nongDEM`, `defaultDEM` and UTM47 conversion; Sim 1 embeds substantial JS in `single.html` | **Potential duplication** of dataset metadata/projection; not yet proven equivalent across every code path | **COMPARE** source coordinates, zone, boundaries and metadata. Extract constants only after parity tests. |
| Antenna | `antenna-model.js` interpolates Sinclair PRN patterns; `mw-antennas.js` is Huawei dish preset UI with gain/diameter catalog | **Different responsibilities**, not duplicate algorithms | **KEEP SEPARATE**. Avoid merging by filename similarity. |
| Sim 2 | `multi.js` uses iframe `contentWindow.RFPair` exported by `pair-bridge.js` | **Intentional reuse** of Sim 1 validated engine | **FREEZE CONTRACT** until browser-level tests cover ready/run/cancel/status. |
| MW geometry and availability | `mw-math.js` provides Vincenty, Fresnel, knife-edge; `mw-availability.js` implements P.530 rain/multipath; `mw-xpd.js` implements polarization margin | **Distinct formulas** | **KEEP SEPARATE**; add reference-vector tests before refactor. |
| Climate | `mw-climate.js` handles map-grid bilinear interpolation and cache | **Separate data pipeline** | **KEEP**; test grid edges and failure paths. |
| Field data | `field-reader.js` parses CSV/XLSX; `field-import.js` owns UI/map overlay | **Good separation** | **KEEP**; browser tests for file import and marker click. |
| UI orchestration | `single.html` contains >120 KB inline script; Microwave loads 20 classic scripts | **Maintainability and script-order risk** | **SPLIT LATER** in small commits only after browser regression checks. |

## Priority decisions

1. **P0 — Protect results and APIs:** retain `RFPair` contract and current classic-script order. Do not alter RF formulas.
2. **P1 — Expand browser integration tests:** Sim 1/Sim 2 iframe lifecycle, DEM fallback, Microwave startup, CSV/XLSX overlay. The current Node tests cover isolated deterministic invariants only.
3. **P1 — Record numerical reference vectors:** fixed coordinate, frequency, DEM source and expected RSSI/path loss/availability with tolerances and model version.
4. **P2 — Metadata consolidation candidate:** compare native DEM metadata and UTM47 transforms in `single.html` vs `mw-dem.js`; only extract if exact parity is demonstrated.
5. **P3 — Move UI and large inline scripts:** split by concern without changing behavior, gate each step with tests.

## Explicit non-actions

- **No removal of 'unused' globals:** current inventory misses bare identifier references and iframe calls.
- **No wholesale migration to ES modules:** current loading order is a runtime contract.
- **No production merge/deploy:** this report is a plan, not a code refactor.
- **No claim that the entire repository has been exhaustively compared:** deeper AST-based inspection and runtime coverage are pending.

## Verification

- Dependency audit, JavaScript API baseline and RF model invariants: GitHub Actions Run #7, https://github.com/anurakkaewchiengthong-web/Simulation-WEB/actions/runs/43174091937 — success.
- Source-level browser parity and end-to-end RF accuracy: **not yet tested**.
