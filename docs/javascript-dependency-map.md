# JavaScript Dependency Map — Radio Coverage Lab v64

**Baseline branch:** `sync/radio-coverage-lab-v64-20261110`  
**Audit branch:** `audit/javascript-dependency-map-20261112`  
**Scope:** Static inspection of four HTML entrypoints and key JavaScript modules. No runtime changes.

## Entry-point script load order

### Sim 1 — `dist/single.html`
1. theme.js
2. terrain-fast.js
3. power-units.js
4. antenna-model.js
5. coverage-contours.js
6. pair-bridge.js
7. field-kmz.js
8. field-reader.js
9. field-import.js

**Important:** substantial inline JavaScript lives in single.html. The `RFPair` bridge is used by Sim 2.

### Sim 2 — `dist/index.html`
1. theme.js
2. pair-math.js
3. antenna-model.js
4. multi.js

The page embeds **two** `single.html?pair=1` / `single.html?pair=2` iframes. `multi.js` obtains `frame.contentWindow.RFPair` and awaits each `ready` promise. This is a cross-document contract, not just an ordinary script dependency.

### Microwave — `dist/microwave.html`
1. theme.js
2. power-units.js
3. terrain-fast.js
4. mw-math.js
5. mw-dem.js
6. mw-availability.js
7. microwave.js
8. mw-availability-ui.js
9. mw-modulations.js
10. mw-orbit.js
11. mw-climate.js
12. mw-climate-ui.js
13. mw-equipment.js
14. mw-dish.js
15. mw-xpd.js
16. mw-report.js
17. mw-dish-ui.js
18. mw-xpd-ui.js
19. mw-antennas.js
20. mw-layout.js

**Important:** many scripts publish APIs on `globalThis` / `window`. Their script order is a compatibility constraint until all initialization paths are traced and tested.

### Wi-Fi — `dist/wifi.html`
1. theme.js
2. wifi-setup.js

## Confirmed global APIs (selected)

| Provider | API | Known consumer / purpose |
|---|---|---|
| pair-bridge.js | RFPair | multi.js via iframe contentWindow |
| pair-math.js | RFPairMath | Sim 2 calculations |
| antenna-model.js | RFAntennas | pair-bridge.js and antenna modeling |
| terrain-fast.js | RFTerrain | shared terrain utilities |
| power-units.js | RFPower | shared power conversion |
| mw-math.js | MWMath | microwave geometry / Fresnel |
| mw-dem.js | MWDEM | microwave terrain sampling |
| mw-availability.js | MWAvailability | link availability |
| mw-climate.js | MWClimate | climate grid lookup |
| mw-dish.js | MWDish | dish sizing |
| mw-xpd.js | MWXPD | polarization evaluation |
| mw-availability-ui.js | MWAvailabilityUI | microwave.js |
| mw-dish-ui.js | MWDishUI | microwave.js |
| mw-xpd-ui.js | MWXPDUI | microwave.js |
| mw-antennas.js | MWAntennas | microwave.js |

This is an **entrypoint and API inventory**, not a claim that every dynamic or bare-identifier call edge has been resolved.

## Decisions and development order

| Priority | Decision | Rationale | Verification gate |
|---|---|---|---|
| P0 | Freeze `RFPair` public interface until tests exist | Sim 2 depends on Sim 1's iframe bridge | Two stations load, calculate and cancel successfully |
| P0 | Preserve microwave script ordering | Classic-script global initialization may be order-dependent | Microwave load and all UI modules initialize |
| P1 | Add dependency audit script (this branch) | Detect missing local scripts and list known APIs | Run `python scripts/audit_js_dependencies.py` |
| P1 | Capture numeric baselines before refactor | Protect RF results against unintended changes | RSSI, DEM, Fresnel, link budget, availability |
| P2 | Extract inline JS from single.html incrementally | Reduce editing risk in a large mixed HTML/JS file | Sim 1 + Sim 2 regression parity |
| P2 | Compare DEM decoders before deduplication | Similar purpose does not guarantee equivalent semantics | Same coordinates, NoData, native raster and fallback |
| P3 | Evaluate ES modules / bundler | Make dependencies explicit after tests | No missing APIs, no initialization race |

## What is deliberately NOT done

- No application JS/HTML changed, moved, deleted or deduplicated.
- No deployment or merge.
- No assertion that unreferenced files are unused: dynamically loaded files, iframe APIs, and assets must be checked.
- No claim of complete function-level graph: a parser/AST and runtime tests are needed for high confidence.

## Reproduce

```bash
python scripts/audit_js_dependencies.py
```

This uses only the Python standard library and reports to stdout; it does not mutate the repository.

## CI verification

The branch workflow is configured to run on pushes to `audit/**`, pull requests, and manual dispatch. Check the latest Actions run for actual pass/fail results before modifying application code. The static inventory is not an AST-level graph and cannot prove runtime initialization correctness.
