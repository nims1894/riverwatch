# CAB-032 Changelog

## Current Deck WATCH Badge Fix

- Fixed WATCH badge background not appearing in Current Deck.
- Root cause: allocation engine returns `className: "building"` for WATCH state, while CAB-031 badge CSS only targeted `.under` / `.watch`.
- Added filled yellow pill styling for `.badge.building`.
- KEEP / other badge styling and portfolio calculation logic unchanged.
