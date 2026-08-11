# CAB-081 — Voyage Log Source URL Fix

- Correct the standalone `RiverWatch_Voyage_Log / VOYAGE_LOG` Google Sheets CSV source URL using the exact spreadsheet URL supplied by the operator.
- Keep the CAB-080 logbook remap, Portfolio Journey behavior, compact Voyage Timeline, boot sequence, RETRY behavior, and Logbook refresh behavior unchanged.
- Bump the PWA cache key to CAB-081 so clients receive the corrected `data.js`.
