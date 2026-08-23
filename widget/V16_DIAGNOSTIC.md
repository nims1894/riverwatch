# RiverWatch Widget v16

Baseline: v14 live-snapshot verified source.

Changes:
- Removed dedicated refresh button.
- Whole widget tap now triggers manual snapshot refresh.
- Manual refresh uses the existing v14 snapshot fetch/parsing/storage path.
- Manual refresh failure keeps LAST_GOOD and does not alter the automatic schedule.
- Existing 10:00 primary / 10:30 retry logic is preserved.
- Added UPDATED HH:mm from KEY_LAST_GOOD_AT.
- XML sample values changed to clear placeholders so live binding can be visually verified.

Data-path check:
- The v14 Live Snapshot URL and parser were preserved instead of copied from later experimental branches.
