# CAB-034 · PWA Application Shell

## Scope
Convert RiverWatch v1.0 / RV Koru into an installable Progressive Web App without changing investment, health-engine, or data-pipeline logic.

## Changes
- Added `manifest.webmanifest` for installable app metadata.
- Added 192px, 512px, and maskable Koru application icons.
- Added `service-worker.js` with app-shell caching and network-first navigation behavior.
- Added Android/iOS mobile-app metadata and theme settings.
- Added `viewport-fit=cover` and safe-area handling for standalone mobile display.
- Configured relative `./` scope/start paths for GitHub Pages repository deployments.
- PWA display mode is `standalone`, removing browser address/navigation chrome when launched from the installed home-screen icon.

## Guardrail
No RiverWatch scoring, health-engine, portfolio, market-data, or CAB-033 functional logic changed.

## GitHub Pages deployment path lock
- PWA `id`, `start_url`, and `scope` explicitly fixed to `/riverwatch/`.
- Production URL: `https://nims1894.github.io/riverwatch/`
