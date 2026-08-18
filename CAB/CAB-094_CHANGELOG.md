# CAB-094 Structural Label/Meta + Voyage Track Polish

- Fixed the actual `LABEL (META)` wrap cause: generic metric-card span rules were forcing nested label spans to `display:block`.
- Added higher-specificity structural rules so Label and parenthetical Meta remain on one physical row.
- Kept a consistent gap before `(META)` and increased metadata readability.
- Set Latest Snapshot date to the same font size as `LATEST`, using muted tone/weight for hierarchy.
- Removed `(ALL TIME)` from Market Peak.
- Enlarged the Market Peak icon.
- Kept Market Peak as four equal zones:
  - MARKET PEAK (single-row brand)
  - Peak / value
  - Date / value
  - Gap / value
- Enlarged Peak/Date/Gap typography and uses tone/weight rather than strong size differences for hierarchy.
- Removed fixed `logbook-chart` container slack while preserving the 250px SVG, plot area, data coordinates, and auto-scale logic.
- Changed legend display order and names to `Market / Plan / Principal`.
- Preserved actual SVG render order as `Principal -> Plan -> Market`.
