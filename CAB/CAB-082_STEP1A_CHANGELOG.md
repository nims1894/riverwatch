# CAB-082 STEP 1A — ENGINE POWER input engine

## Scope
- Add `VOYAGE_PLAN` CSV source from `RiverWatch_Voyage_Log` (`gid=345167648`).
- Read Required CAGR from `VOYAGE_PLAN!B11` as the SSoT.
- Preserve existing `ManualConfig.expectedCAGR` Google Sheet source for Expected CAGR.
- Calculate `riverwatch.calc.enginePower = Expected CAGR / Required CAGR * 100`.
- Do not silently fall back to the legacy internal Required CAGR solver when B11 is unavailable.
- Accept percentage CSV forms such as `10.2%`, `10.2`, or `0.102`.

## Validation
- JavaScript syntax checks passed for `js/data.js`, `js/marketEngine.js`, and `js/app.js`.
- UI/Boat Health weighting is intentionally deferred to STEP 2.
