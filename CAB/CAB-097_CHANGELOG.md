# CAB-097 · Intro Scene Header Reuse

## Scope
- Replace the legacy fixed Intro sailing artwork with the production Scene Header asset system.
- Intro shares `js/mobile-header-config.js` placement, scale, z-index, opacity, and animation settings.
- Intro does not render the Header Common UI (Koru symbol / brand / Last Sync / ONLINE / Retry).
- Intro scene selection is available before remote data sync and does not depend on VoyageState/Trend data.

## Intro Round-Robin
The local calendar day selects one of 25 deterministic State × Trend combinations and resets by calendar month:

- States: `TAILWIND`, `CALM`, `HEADWIND`, `ROUGH`, `STORM`
- Trends: `STRONG_DOWN`, `DOWN`, `STABLE`, `UP`, `STRONG_UP`
- Days 1–5: TAILWIND × Trend 1–5
- Days 6–10: CALM × Trend 1–5
- Days 11–15: HEADWIND × Trend 1–5
- Days 16–20: ROUGH × Trend 1–5
- Days 21–25: STORM × Trend 1–5
- Days 26–31 repeat from combination 1.

## SSoT Rule
No Intro-specific Boat/Wave/Trend placement or animation configuration is introduced. Scene-Lab export changes applied to `js/mobile-header-config.js` affect both the production mobile Header and Intro scene.
