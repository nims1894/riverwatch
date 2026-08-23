# RiverWatch Android Widget v15

## Changes
- Removed widget-root tap navigation to RiverWatch.
- Added dedicated manual refresh button.
- Manual refresh calls the existing Live Snapshot API immediately.
- Manual refresh failure keeps LAST_GOOD and does not schedule a retry.
- Existing automatic schedule remains unchanged: 10:00 primary, 10:30 one-time retry on failure.
- Added `UPDATED HH:mm` based on the last successful Snapshot fetch.

## Scheduling invariant
Manual refresh does not cancel, move, or recreate the automatic 10:00 / 10:30 schedule.
