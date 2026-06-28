# CAB-018_CHANGELOG

## RiverWatch v1.0 RC2g — Health Status Threshold Tables

### Added
- Centralized health status threshold tables in `js/app.js`.
- Voyage Health status table:
  - 90+: ON COURSE
  - 75+: STABLE COURSE
  - 60+: DRIFTING
  - 40+: COURSE CORRECTION
  - 0+: LOST COURSE
- River Health status table:
  - 90+: STRONG CURRENT
  - 75+: FAVORABLE CURRENT
  - 60+: MIXED CURRENT
  - 40+: HEAD CURRENT
  - 0+: STORM WARNING
- Boat Health status table:
  - 90+: OPTIMALLY TRIMMED
  - 75+: PROPERLY TRIMMED
  - 60+: NEEDS ADJUSTMENT
  - 40+: POORLY TRIMMED
  - 0+: REBALANCING REQUIRED

### Changed
- Health status labels can now be tuned by editing one table in `app.js`.
- Version advanced from v1.0 RC2f to v1.0 RC2g.

### Validation
- JavaScript syntax check passed.
