# CAB-058 Changelog

## Intro top-flow rebalance
- Changed the intro composition from viewport-centered alignment to top-flow alignment so tall displays keep the content anchored from the top rather than drifting toward the bottom.
- Removed the CAB057 compact negative Y translation and replaced it with responsive top padding.
- Kept Boot Sequence as an independent fixed HUD overlay.
- Set compact/mobile bottom breathing room to approximately 1.6 times the ENTER BRIDGE button height while allowing shorter screens to scroll naturally.

## Mission KPI desktop layout
- Changed Mission KPI cards from a full-width vertical stack to the same five-column desktop rhythm used by Open Sea Logbook.
- Status, Days Since Action, and Doctrine Compliance now occupy the first three desktop metric-card slots.
- Preserved the existing single-column stacked layout at widths of 900px and below.

## PWA
- Updated the service-worker cache namespace to CAB058 so deployed clients fetch the revised CSS.
