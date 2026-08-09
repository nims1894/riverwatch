# CAB-056 Changelog

## Timestamp grammar and intro title alignment
- Fixed the compact intro layout so `v1.0` moves with the RiverWatch title instead of drifting into the Captain block.
- Changed Mission `Days Since Action` to show the date in the label: `Days Since Action (YYYY.MM.DD)` with `N Days` as the standalone value.
- Added MarketData `FX_AsOf` ingestion and display for USDKRW as label metadata.
- Changed Brent presentation to `Brent (YYYY.MM.DD)` with the value rendered as `xx.x USD (score)`, removing the inline `@ M/D` date.
- Left other River Health metrics without explicit dates to avoid redundant timestamp clutter.
- Updated the PWA cache namespace to CAB056.
