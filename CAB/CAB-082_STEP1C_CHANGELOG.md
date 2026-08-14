# CAB-082 STEP 1C — Doctrine Compliance Core

- Added local Last Known Captain Order tracking; only order transitions are eligible for persistence.
- First observed order establishes a baseline and does not create a false transition.
- Added optional non-blocking Apps Script Web App writer configuration; dashboard operation never depends on write success.
- Added `tools/RiverWatch_Doctrine_Audit.gs` to create CAPTAIN_ORDER_HISTORY, MONTHLY_AUDIT, and AUDIT_SETTINGS sheets.
- Baseline date is 2026-08-14 and default sell tolerance is KRW 500,000.
- NO ACTION policy remains: buying allowed, selling prohibited above tolerance.
- Principal is explicitly not used to infer SELL. Until an explicit transaction/sell source is connected, monthly Doctrine result is NOT_EVALUATED rather than fabricated.
- UI wiring is deferred to STEP 2.
