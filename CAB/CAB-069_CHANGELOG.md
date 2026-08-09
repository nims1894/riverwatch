# CAB-069 Changelog

- Added separate responsive boat placement/size rules for wide, intermediate, and mobile headers while retaining the existing `header-boat.png` asset.
- Restrained rear/front wave layers to a shallow lower header band on wide screens so the ocean scene no longer fills the full panel height.
- Raised and enlarged the boat for clear visibility above the wave band; mobile places the boat on the right-side wave area to avoid brand/sync text.
- Increased existing rear-wave, front-wave, and boat animation speed by 1.2x by reducing durations to 0.8333 of CAB068 values.
- Updated header PNG cache-busting and PWA service-worker cache name to CAB069.
- No application/data/Health/Deck logic changes.
