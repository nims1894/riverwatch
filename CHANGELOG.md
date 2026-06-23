# Changelog

## 2026-06-23

### v0.2.9

Added
* Decision Engine v0.1 connected to River / Boat / Voyage Health
* Captain input `lastRebalance` moved to MANUAL zone
* Individual stock current prices now use Google Sheet AUTO values
* Voyage Health card updated to Base / Adjusted Arrival model
* Larger health-card icons for readability

Changed
* Version display updated to 0.2.9
* `currentPriceUSD` removed from individual stock manual inputs
* `Status` and `Recommended Action` no longer rely on fallback constants

Notes
* `data.js` MANUAL values are treated as Captain Approved inputs and must not be changed without approval.
