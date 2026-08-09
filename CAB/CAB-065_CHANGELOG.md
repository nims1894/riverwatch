# CAB-065 CHANGELOG

- Added responsive dual-mode header behavior: full operational header on tablet/desktop, compact identity + sync header on mobile.
- Mobile hides the subtitle, Captain/ACTIVE line, and MKT/PORT/CFG detail to reduce vertical density.
- Replaced the legacy header SVG wave/boat artwork with three independent transparent PNG layers: rear wave, RV Koru boat, and front wave.
- Added restrained CSS motion: slow parallax wave drift and subtle boat bobbing.
- Preserved desktop header information while keeping mobile layout compact and readable.
- Added reduced-motion fallback and bumped the PWA cache key to CAB065.
