# CAB-044 CHANGELOG

## Voyage Timeline · VoyageState
- Added `VoyageState` parsing from the OpenSeaLogbook Google Sheet.
- Preserved `EventType` and `VoyageState` as independent classification axes.
- Timeline now renders EventType on the left and VoyageState as a compact right-aligned badge.
- Added responsive VoyageState badges for `TAILWIND`, `CALM`, `HEADWIND`, and `STORM`.
- Timeline visibility remains controlled only by the existing `Milestone` TRUE/FALSE flag.
- Portfolio Journey calculations and investment logic are unchanged.
- Bumped the PWA cache key to `riverwatch-v1.0-pwa-cab044`.
