# CAB-009 Sea Trial UX Polish Pack

Version: RiverWatch v1.0 RC1b  
Baseline: RiverWatch v1.0 RC1 / CAB-008.4a PortfolioJourney Mobile Margin

## Applied Changes

### CAB-009.1 Global Number Formatting
- Added comma-based numeric readability through shared format functions.
- KRW million values now render as `1,600M` instead of `1600M`.
- Monthly KRW and signed values also use comma-aware formatting.

### CAB-009.2 Health Card Collapse
- Added collapsible behavior to Voyage Health, River Health, and Boat Health cards.
- Collapsed view keeps title, score, status, and expand indicator visible.
- Expanded view exposes the detailed metric body.

### CAB-009.3 Trim Deck Collapse
- Added collapsible cards to Trim Deck holdings.
- Collapsed view shows ticker, doctrine status, delta, and expand indicator.
- Expanded view shows trim bar and current/target/delta details.

### CAB-009.4 Trim Summary Complete Removal
- Removed Trim Summary card from Boatyard page markup.
- Removed unused `renderTrimSummary()` implementation.
- Removed direct `trimSummary` / `trim-summary-card` references.

### CAB-009.5 Refresh Button
- Added refresh button near Last Sync.
- Button reloads market data, recalculates engines, and re-renders the active page.

### CAB-009.6 Compact Health Header
- Health cards now use a compact header suitable for mobile Sea Trial use.
- Mobile default uses lower card height and preserves one-screen visibility intent.

### CAB-009.7 Collapse State Persistence
- Health and Trim Deck collapse states are persisted in `localStorage`.
- User-selected expanded/collapsed states are restored after refresh.

### CAB-009.8 Version Label Update
- Intro version label updated from `Version 1.0 Beta` to `Version 1.0 RC1b`.

### CAB-009.9 Dashboard Reload Control
- Added dashboard initialization state to avoid unnecessary data reloads on repeat dashboard entry.
- Explicit refresh still forces data reload.

## Modified Files
- `index.html`
- `css/style.css`
- `js/app.js`

## Notes
- No new external dependencies added.
- Google Sheet data path remains unchanged.
- GitHub Pages static deployment model remains unchanged.

## CAB-010 — Mobile Layout Alignment Polish

- Health cards now default to collapsed state with CAB-010 scoped localStorage keys.
- Health card compact headers were re-gridded to prevent title / score / status overlap.
- Trim Deck cards now default to collapsed state with CAB-010 scoped localStorage keys.
- Trim Deck collapsed rows now show ticker, current allocation, target allocation, delta, and status.
- Trim Deck collapsed labels are aligned with a table-like header row.
- Mobile navigation now keeps Dashboard / Boatyard / Logbook in one row.


## CAB-010a / RC1c Follow-up
- Dashboard system/nav width aligned to content grid.
- Readability restored with larger dashboard text.
- Trim Deck header labels changed to English.
