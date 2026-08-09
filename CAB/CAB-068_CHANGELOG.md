# CAB-068 Changelog

- Corrected wide-header optical balance by anchoring the brand and status groups to equal 28px inner insets on viewports wider than 900px.
- Hardened rendering of the existing three transparent header PNG layers (rear wave / boat / front wave) without replacing the assets.
- Added CAB068 cache-busting to the three header PNG references and bumped the PWA service-worker cache name so deployed clients receive the corrected assets/styles.
- Preserved the existing compact mobile header (<=640px) and all application/data logic.
