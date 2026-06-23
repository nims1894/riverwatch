# Changelog

## 2026-06-23

### v0.2.1

Added

* Policy-driven River Matrix structure
* River Metric Weight configuration with automatic normalization
* Boat Health calculation structure
  * Configuration Alignment
  * Suitability
  * Growth Suitability
  * Defensive Suitability
  * Maneuverability
* Decision Engine PoC
* Render function separation in `script.js`

Changed

* Refactored `data.js` into CONST / POLICY / MANUAL / AUTO / CALC sections
* Updated USDKRW matrix for current 1,500+ KRW environment
* Kept low-frequency metrics such as AI CAPEX and NVDA DC Revenue as manual inputs

Notes

Sprint #006 moved from static dashboard toward policy-driven calculation engine.

---

## 2026-06-23

### v0.2.0

Added

* Voyage Health
* River Health
* Boat Health
* Current Allocation vs Boat Configuration
* Recommended Action
* Captain's Note
* Voyage Logbook
* RiverWatch Doctrine

Changed

* Replaced Portfolio Health with three-axis Health architecture
* Updated philosophy to Observe / Adapt / Continue

---

## 2026-06-22

### v0.1.3a

Added

* Last Sync information
* Mission Panel
* Portfolio Health widget
* Portfolio Alignment widget
* data.js separation

Changed

* Mission definition

Stay the Course

Status

ON TRACK

Operator

NIMS 🟢 ONLINE

Notes

First operational prototype completed.
