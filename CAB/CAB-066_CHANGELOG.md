# CAB-066 CHANGELOG

- Fixed missing header ocean artwork by mounting the rear-wave, boat, and front-wave PNG layers in the actual header DOM.
- Removed the legacy inline SVG header artwork from the active header markup.
- Corrected non-mobile responsive alignment by overriding the legacy <=900px stacked topbar rule for all widths above 640px.
- Added an intermediate 641–760px layout that keeps the general header horizontal while trimming only the tagline to preserve spacing.
- Preserved the mobile compact header behavior and three-layer CSS animation.
- Bumped the PWA cache key to CAB066.
