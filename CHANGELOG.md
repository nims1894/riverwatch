# Changelog

## 2026-06-24

### v0.4.0-rc2

Added
* Google Sheet v2.0 support
* Portfolio CSV loader
* ManualConfig CSV loader
* Multi-source load status: AUTO / PARTIAL / FALLBACK
* BrentPrice manual input model

Changed
* `data.js` is now fallback-only for Captain inputs
* Portfolio cost basis changed from `AvgPriceUSD × USDKRW` to `AvgCostKRW`
* `lastRebalance` display logic migrated to `lastActionDate`
* `buildPhaseEnd` migrated to `portfolioBuildEndDate`
* Voyage target values migrated to ManualConfig
* MarketData now excludes BrentPrice; BrentPrice belongs to ManualConfig

Removed
* BNO 30-day reference model from active River Health calculation
* Manual portfolio as primary data source

Notes
* Google Sheet is the Single Source of Truth for daily operation.
* CaptainGuide is not fetched by RiverWatch; it remains a human operating manual.

## 2026-06-23

### v0.3.2

Added
* Captain Recommendation Engine with BUILD PHASE / CONTINUE BUILDING state
* Voyage Health simplified narrative UI without arrows
* Gap to Destination field

Changed
* River / Boat sub-metrics display label plus score where appropriate
* Days Since Action is calculated from action date
* Equalized Voyage / River / Boat Health card heights
* Added Effective CAGR back into Voyage Health
* Added River Bias row to River Health
* Rebalanced lower dashboard cards for a cleaner 3-column layout

## 2026-06-24

### v0.4.0 CAB-004

Added
* Voyage State Machine v3 with AUTO / manual phase mode
* Voyage phases: BUILD_PHASE, EARLY_VOYAGE, MID_VOYAGE, OPEN_SEA_APPROACH, OPEN_SEA_REACHED, TARGET_DATE_REACHED
* Latest Snapshot card replaces static Voyage Logbook placeholder
* Extra Time Required calculation for TARGET_DATE_REACHED state

Changed
* Brent scoring recalibrated: 65~85 USD/bbl is treated as a normal growth zone
* Captain's Note is now phase-aware and dynamically generated
* Recommendation logic now considers Voyage Phase before health-only decisions
* River Bias label thresholds refined

### v0.4.0 CAB-004.1

Changed
* Added sheet-level sync detail to the topbar: MKT / PORT / CFG.
* `PARTIAL` status now shows which sheet failed to load.
* Confirmed portfolio valuation formula: current value = shares × current USD price × USDKRW; cost basis = shares × AvgCostKRW.


### v0.4.0 CAB-005

Added
* Captain's Bridge integrated card
* Today's Log inside Captain's Bridge
* Captain's Order section
* Voyage Recovery Options: Time Extension, Contribution Needed, Required CAGR

Changed
* Replaced separate Captain's Note / Latest Snapshot / Recommended Action cards with one Bridge card
* Version display updated to CAB-005


### v0.4.0 CAB-005.2

Changed
* Rebalanced dashboard layout around the Captain-approved hierarchy: Mission → Health → Boat Configuration → Captain's Bridge → System Status.
* Promoted Boat Configuration to a full-width visible panel instead of hiding it behind an expandable section.
* Renamed allocation panel label to `Boat Configuration`.

Notes
* `Next Move` was intentionally not added to avoid unnecessary operational complexity.
