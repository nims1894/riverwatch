# CAB-027 — Health Engine Calibration & Rule Consolidation

## River Health
- Reframed Brent as energy-pressure stress instead of inferring recession directly from low oil prices.
- Brent score anchors: 50=90, 65=95, 85=95, 100=75, 120=50, 140+=20.
- Added linear interpolation for numeric River Health metrics to remove score-step discontinuities.
- Added Fed Policy to River Health detail metrics.
- Invalid/blank numeric and state inputs now remain N/A instead of becoming zero/default high-scoring values; valid metric weights are automatically re-normalized.
- Growth/Defensive Environment now reads the same `riverHealthScoring` rule set used by River Health (SSoT). `riverMatrix` remains only for backward compatibility.
- River Action Reason and Captain Note now derive wording from the centralized River status table.

## Voyage Health
- Expected CAGR contract: Google Sheet value is percent, valid range 0~30; invalid values produce `DATA N/A` rather than silently using 0%.
- Target date now uses the full `YYYY.MM.DD` date and remaining time is day-aware.
- Projection supports fractional final months instead of discarding the target-day portion.
- Voyage Health is continuous: target match=90, downside slope=1 score per -1% drift, upside slope=0.5 score per +1% drift, clamped 0~100.
- COURSE CORRECTION and LOST COURSE ranges are now reachable.
- Replaced one-sided Gap with signed `Target Margin` so both ahead (+) and short (-) amounts are visible.
