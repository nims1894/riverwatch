# CAB-082 STEP 2 — Health Engine Rewire

## Scope
- Rewire Boat Health to TRIM BALANCE / RIVER FIT / ENGINE POWER / FUEL SUPPLY.
- Apply Boat Health weights 30 / 20 / 30 / 20; unavailable FUEL SUPPLY is excluded until a finalized month exists.
- Keep ENGINE POWER input SSOT as VOYAGE_PLAN!B11 Required CAGR and existing Expected CAGR.
- Evaluate FUEL SUPPLY from closed months only; baseline 2026-08-14, first full evaluation month 2026-09.
- Replace legacy Doctrine Compliance inference from Boat Health with explicit PENDING until the monthly audit source returns ALIGNED/VIOLATION.
- Rebuild Voyage Health as TARGET GAP 60% + ETA 40%, both normalized and capped at 100.
- Display Current Value progress against Target Value.
- Display REMAINING and ETA with y/m/d precision; ETA label includes signed calendar deviation with zero units omitted.
- Bump PWA cache key so updated JS/HTML are delivered.

## Acceptance focus
- ENGINE POWER reacts to Expected/Required CAGR changes.
- FUEL SUPPLY shows PENDING before a finalized eligible month.
- Doctrine Compliance no longer mirrors Boat Health.
- Voyage Health reacts to Target Gap and ETA deviation only.
- ETA/Remaining render day-level values and ETA deviation.
