# CAB-096 UI Density / Label Consistency / Engine Power Review Date

- Added Engine Power review date beside the ENGINE POWER section label.
- Review date is dynamically read from `ManualConfig.ENGINE_POWER_REVIEW_DATE`; no hard-coded date is used.
- Standardized Boat Health detail labels to uppercase: ENGINE POWER / FUEL SUPPLY / TRIM BALANCE / RIVER FIT.
- Refined CAGR GAP marker/value alignment as one right-aligned readout.
- Reduced Voyage Track -> Voyage Log card gap from 18px to 11px (~60%).
- Reduced Market Peak vertical padding to ~50% while preserving chart geometry, typography, and four-zone layout.
- Bumped stylesheet query/cache key to CAB096.
