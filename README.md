# RiverWatch

A personal doctrine execution system for reaching the Open Sea.

## Doctrine

* Observe the River.
* Adapt the Boat.
* Continue the Voyage.

## v0.3.2

This release completes the main River / Boat / Voyage dashboard flow and adds Captain Recommendation logic.

### Core Health

* River Health: market environment and river bias
* Boat Health: portfolio allocation, suitability, structure, and discipline
* Voyage Health: arrival estimate against Open Sea target

### Captain Recommendation

The Decision Engine now supports:

* BUILD PHASE / CONTINUE BUILDING
* RECOVER COURSE / INCREASE EFFORT
* ADAPT THE BOAT / REBALANCE
* KEEP WATCH / REVIEW
* STAY THE COURSE / NO ACTION

### MarketHub

Google Sheet CSV Hub provides AUTO values for:

* USDKRW
* VIX
* BNO
* QQQM / SPYM / SCHD / IAUM / BITQ
* NVDA / MSFT / GOOGL / PLTR

### Captain Input Zone

The MANUAL section in `data.js` is controlled by the Captain.
Do not modify without Captain approval.

### Dashboard polish

* Equal-height health cards
* Balanced lower dashboard layout
* River Bias and Effective CAGR visible in the main health area
