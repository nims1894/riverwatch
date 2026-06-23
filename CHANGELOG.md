# Changelog

## 2026-06-23

### v0.3.2

Added
* Captain Recommendation Engine with BUILD PHASE / CONTINUE BUILDING state
* `buildPhaseEnd` Captain input
* Voyage Health simplified narrative UI without arrows
* Gap to Destination field

Changed
* Voyage Health values now display without descriptive sub-labels or parentheses
* River / Boat sub-metrics display label plus score where appropriate
* Days Since Action is calculated from `manual.lastRebalance`
* Version display updated to 0.3.2

Notes
* `data.js` MANUAL values are treated as Captain Approved inputs and must not be changed without approval.

Additional Sprint #011.1 polish
* Equalized Voyage / River / Boat Health card heights
* Added Effective CAGR back into Voyage Health
* Added River Bias row to River Health
* Rebalanced lower dashboard cards for a cleaner 3-column layout
