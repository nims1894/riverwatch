# RiverWatch

A personal doctrine execution system for reaching the Open Sea.

## Doctrine

* Observe the River.
* Adapt the Boat.
* Continue the Voyage.

## v0.4.0 CAB-004.1

This release establishes Google Sheet v2.0 as the operating database and introduces a phase-aware Voyage State Machine.

### Google Sheet v2.0

RiverWatch now reads:

* MarketData: USDKRW, VIX, ETF and stock prices
* Portfolio: shares, AvgCostKRW, target weights
* ManualConfig: captain judgment and voyage assumptions
* CaptainGuide: human operating manual

### Core Engines

* River Engine: market and macro environment
* Boat Engine: portfolio structure and alignment
* Voyage Engine: adjusted arrival versus Open Sea target
* Voyage State Machine: current voyage phase based on current position and time progress

### Voyage Phases

* BUILD_PHASE
* EARLY_VOYAGE
* MID_VOYAGE
* OPEN_SEA_APPROACH
* OPEN_SEA_REACHED
* TARGET_DATE_REACHED

### Key Changes

* AvgCostKRW is used for true KRW cost basis.
* BrentPrice is manually controlled in ManualConfig.
* Brent scoring treats 65~85 USD/bbl as a normal growth zone.
* Captain's Note is dynamically generated from phase, River, Boat, Voyage, and action.
* Latest Snapshot replaces the static Voyage Logbook placeholder.

## Captain Input Rule

Google Sheet is the Single Source of Truth.
`data.js` is fallback only.


### Sync detail

Topbar now shows sheet-level sync status: `MKT OK · PORT OK · CFG OK`.
