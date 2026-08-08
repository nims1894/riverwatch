# CAB-023 — Google Sheet ControlRules SSOT

## Scope
Portfolio allocation status thresholds and labels are now loaded from the Google Sheet `ControlRules` tab.

## Sheet schema
`controlType`, `evaluationMode`, `satThreshold`, `buildThreshold`, `satStatus`, `buildStatus`, `rebalanceStatus`

## Applied rules
- MIN / ABS: absolute target deviation is evaluated.
- MAX / UPPER_ONLY: only target excess is evaluated; values below target produce zero deviation.
- deviation < SAT threshold → SAT
- SAT threshold ≤ deviation ≤ BUILD threshold → BUILD
- deviation > BUILD threshold → REBALANCE

Threshold units are percentage points. Google Sheet is the SSOT; embedded rules remain as offline fallback.
