# CAB-091 Voyage Track UI

- Added Latest Snapshot above the Voyage Track chart using the existing VoyageState/Trend badge language.
- Added shared Snapshot metric styling for Market / Plan / Gap and applied it to Voyage Log.
- Added MARKET_PEAK CSV endpoint (gid=1970222773) and direct A2/C2/E2 reader; no peak calculation is performed in RiverWatch.
- Added reference-style Market Peak record bar below the chart.
- Changed SVG render order to Principal -> Planned Course -> Market Value.
- Unified Chart and Legend series styles through shared CSS variables.
- Planned Course dash pattern set to 4px / 3px; existing series line widths are retained (Market 4px, Principal/Plan 2px).
- Existing chartWidth/chartHeight, Plot Area padding, maxValue auto-scale, and data coordinates remain unchanged.
- Voyage Log Gap display now uses the sheet-provided PlanGap value instead of recalculating it at render time.
- Service worker cache bumped to CAB091.
