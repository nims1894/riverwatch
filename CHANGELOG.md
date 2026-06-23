# Changelog

## 2026-06-23

### v0.3.1

Added
* Captain Recommendation Engine with BUILD PHASE / CONTINUE BUILDING state
* `buildPhaseEnd` Captain input
* Voyage Health simplified narrative UI without arrows
* Gap to Destination field

Changed
* Voyage Health values now display without descriptive sub-labels or parentheses
* River / Boat sub-metrics display label plus score where appropriate
* Days Since Action is calculated from `manual.lastRebalance`
* Version display updated to 0.3.1

Notes
* `data.js` MANUAL values are treated as Captain Approved inputs and must not be changed without approval.
