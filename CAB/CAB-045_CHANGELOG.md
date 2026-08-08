# CAB-045 CHANGELOG

## Portfolio Journey · Long-Horizon Time Axis Cleanup
- Removed persistent data-point markers from Principal, Market Value, and Planned Course lines to reduce visual clutter, especially on mobile.
- Replaced dense year tick labels with only the first recorded date and latest recorded date on the X-axis.
- First date is always rendered as `'YY.MM/DD`; latest date uses `MM/DD` within the same year and `'YY.MM/DD` after the year changes.
- Added a subtle vertical year divider at each January 1 boundary between the first and latest recorded dates.
- Preserved the existing three Portfolio Journey series and all investment calculations.
- Reorganized individual `CAB-*_CHANGELOG.md` files into the `/CAB` directory while keeping `CAB_BACKLOG.md` and the aggregate `CHANGELOG.md` at repository root.
- Bumped the PWA cache key to `riverwatch-v1.0-pwa-cab045`.
