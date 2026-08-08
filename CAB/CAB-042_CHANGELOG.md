# CAB-042 CHANGELOG

- Adjusted Health Matrix summary score alignment so Voyage / River / Boat Health values sit clearly inside the card border on both desktop and mobile.
- Preserved 3-digit score capacity (up to `100`) while removing the narrow mobile fixed score-column constraint that could make the value appear to touch or cross the card edge.
- No Health scoring logic, typography scale, icon size, or detail-card layout changes.
- Bumped the PWA service-worker cache key from CAB041 to CAB042.
- Existing installed PWA clients can receive the updated app shell automatically after deployment; manual uninstall/reinstall is not required for normal CSS/JS updates.
