# CAB-089 TIME LEFT / ETA Display Improvement

- Renamed Voyage Health `Time to Target` to `TIME LEFT`.
- Replaced year/month/day duration display with comma-separated whole days.
- Added Target Date as a secondary value beside TIME LEFT.
- Kept ETA calculation logic unchanged and displayed ETA duration in whole days.
- Added ETA Date as a secondary value beside the ETA day count.
- Replaced mixed calendar ETA deviation with a signed day-only secondary status (`(+Nd)`, `(-Nd)`, `(0d)`).
- Preserved the existing ETA deviation numeric value used by Voyage Health scoring.
- Added primary/secondary typography hierarchy and mobile nowrap rules without changing metric-card size or Summary layout.
- Bumped the service-worker cache key so the updated UI assets refresh on deployed PWA clients.
