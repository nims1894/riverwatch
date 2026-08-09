# CAB-054 Changelog

## Intro Boot HUD refinement
- Converted the Boot Sequence monitor to a viewport overlay so it does not reserve vertical layout space.
- Kept the monitor at the upper-left with left-aligned boot steps.
- Added a persistent RETRY control slot. RETRY is muted/disabled during normal boot states and becomes active only after a boot failure.
- RETRY continues to perform a full page reload.
- Added compact-height mobile positioning so the intro composition is pulled upward and ENTER BRIDGE remains reachable without unnecessary scrolling.
- Updated the PWA cache namespace to CAB054.
