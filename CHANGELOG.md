
## CAB-050
- Cost typography corrected: same size and weight as Current/P&L, with muted color only.
# RiverWatch v1.0 — Official Release
- Promoted the RC4a/CAB-032 baseline to the official RiverWatch v1.0 release.
- Rebuilt the intro identity around vessel name `RV Koru`.
- Added a scalable Koru fern emblem as inline SVG.
- Added official crew roles: Captain NIMS / First Officer ChatGPT.
- Added ACTIVE status, `Stay the Course` mission, and retained the three-line voyage doctrine.
- Changed intro entry action to `ENTER RIVERWATCH`.
- No calculation, data pipeline, Health Engine, or portfolio-control logic changes.

## CAB-045 — Portfolio Journey Time Axis Cleanup & CAB Archive
- Removed persistent Portfolio Journey point markers for a cleaner long-horizon chart.
- Added first/latest X-axis date labels and subtle annual boundary dividers.
- Moved individual CAB changelog files into `/CAB`; root backlog and aggregate changelog remain in place.
- No investment calculation or Health Engine logic changes.

## CAB-032 — Current Deck WATCH Badge Fix
- Fixed WATCH status badge background by styling the actual `building` class emitted by the allocation engine.
- No calculation or data logic changes.

## CAB-029 — Current Deck Return Precision

- Current Deck Return values now always display one decimal place.
- Display-only change; no calculation logic changed.

# CAB-027 Health Engine Calibration & Rule Consolidation
- River Health: Brent semantics corrected, continuous score interpolation, Fed detail display, N/A-safe inputs, scoring/environment SSoT, status narrative alignment.
- Voyage Health: CAGR 0~30% validation, day-aware target date, continuous 0~100 drift score, signed Target Margin.

## CAB-025 — Boat Profile Value SSOT & Return Detail
- Added Current Value to Boat Profile using the Voyage Health Current Position value.
- Changed Boat Return to combined amount/rate format: `+7M (+3.0%)`.
- Reused `boatPnL` as the derived gain/loss amount.

## CAB-023 — ControlRules Google Sheet SSOT
- Added ControlRules CSV loading (gid 1223105705).
- Added sheet-driven MIN/MAX evaluation modes, thresholds, and status labels.
- Allocation and trim-deck statuses now use SAT / BUILD / REBALANCE.
- Added offline fallback rules matching the current sheet configuration.

## CAB-021c - PortfolioConfig CRYPTO Alignment

- Aligned fallback data model with finalized Google Sheet schema.
- Changed crypto sleeve `configId` from `BTC` to `CRYPTO`.
- Changed BITQ fallback holding group to `CRYPTO`.
- No UI/design changes.

## CAB-021b - PortfolioConfig AssetClass Structural Integrity Integration

- Structural Integrity now uses PortfolioConfig `assetClass` instead of hard-coded IAUM/BITQ references.
- Reserve scoring uses GOLD/RESERVE exposure.
- Speculation scoring uses CRYPTO/SPECULATIVE exposure.
- UI design unchanged.

# CHANGELOG
## CAB-021 - Portfolio Configuration Refactor

- Added Google Sheet `PortfolioConfig` integration.
- Refactored portfolio target logic from ticker-based to configId/holdingGroup-based.
- Added support for `controlType` (`MIN`, `MAX`) and `assetRole` (`GROWTH`, `DEFENSIVE`).
- Removed hardcoded growth/defensive ticker classification from Boat Health calculation.
- Updated Portfolio schema to `holdingTicker`, `holdingGroup`, `quantity`, `avgPriceKRW`.


## v1.0 RC4 — Sprint #010 / CAB-020 Complete

- Completed CAB-020 Boat Health Information Architecture Refactoring.
- Standardized Boat Health, Boat Profile, and Logbook KPI metric-box behavior.
- Locked RC2i Typography Baseline under ADR-002.
- Added Design Constitution.
- Restored Intro typography into the locked baseline.
- Forced Boat Profile and Logbook KPI to one-column layout on narrow screens.
- Preserved value right alignment on mobile.
- Consolidated CAB-020 revision logs into a single CAB-020 changelog.

Status: Sprint #010 baseline release.

# CAB-020d — Typography Baseline Hard Lock

- RC2i readability style elevated to locked typography baseline.
- Header / Health / Metric / Boat Profile / Logbook / Trim Deck text scale reinforced.
- Added Design Constitution and ADR-002 clarification.

# RiverWatch v1.0 RC2c — CAB-014 Trim Deck Detail-Only

- Removed Trim Deck accordion toggle and summary rows.
- Restored detail stat labels.
- Detail cards remain 2-column on desktop/tablet and 1-column on mobile.


## v1.0 RC2 — CAB-011 Bridge Layout Refactoring
- Unified Health Matrix and Trim Deck toggles.
- Default collapsed overview for mobile readability.
- Removed Trim Deck label header.
- Increased text readability and aligned dashboard bridge card widths.

# CHANGELOG

## Version 1.0 Beta — CAB-007 Shipyard Reorganization

- Reorganized project into product-oriented folders.
- Moved CSS to `css/style.css`.
- Moved JavaScript to `js/`.
- Added `docs/` for Design Doctrine, Operational Doctrine, and Investment Constitution.
- Added `archive/CAB006/` with the previous CAB-006.1 baseline ZIP.
- Removed duplicate Current Status and Recovery sections from Captain's Bridge.
- Preserved Dashboard / Boatyard / Logbook role-based spaces.
- Added Target Path display to Logbook journey bars using internal calculation.
- Improved Trim Summary with delta values and ranking.
- Applied Naval Console theme overrides and responsive refinements.

Status: Version 1.0 Beta baseline.


## Version 1.0 Beta — CAB-007.1 Eye Comfort / UX Comfort Pass

- Reduced primary text brightness by approximately 10%.
- Slightly lifted the background tone for lower contrast fatigue.
- Added `TOP` utility button next to `BACK TO INTRO`.
- Replaced Logbook journey abbreviations `T / P / V` with `Planned Course / Principal / Market Value`.
- Preserved static, calm UI policy with no animation.

Status: Eye Comfort patch ready for review.

## Version 1.0 Beta — CAB-007.2 Drydock Polish
- Reframed Trim Deck as Doctrine Compliance Panel.
- Replaced OVER/UNDER logic with SATISFIED / BUILDING / DILUTING / WITHIN CAP.
- Removed Target text label from trim bars and added clean target indicator line with triangle marker.
- Tightened Captain's Bridge note spacing and added bullet markers.
- Rebuilt Portfolio Journey as time-scaled line chart with Principal / Market Value / Planned Course.
- Updated Voyage Timeline to latest-first milestone entries with Principal, Market Value, and Planned Course values.

## CAB-007.3 Scrollbar Comfort Pass
- Portfolio Journey horizontal scrollbar restyled to match Voyage Timeline scrollbar.
- Kept horizontal scroll for time-scaled journey chart; vertical scroll remains disabled.

## CAB-008.1 Portfolio Journey Scale Patch
- Fixed Portfolio Journey X-axis range to use actual OpenSeaLogbook record dates instead of the long-term target date.
- Long-term Open Sea target remains represented in summary/progress cards.
## CAB-008.3 Trim Deck Visual Enhancement Pass
- Changed Trim Deck bar logic from ratio-based progress to doctrine-line deviation visualization.
- Current bar remains filled from the left.
- Minimum/Cap marker is fixed to a consistent local position.
- Gap/Excess is shown as 5%-point block-style deviation around the doctrine marker.
## CAB-008.3b Trim Deck Cleanup Pass
- Removed gap-side auxiliary block rendering for cleaner Trim Deck bars.
- Changed deviation block calculation to round away from zero by 5%-point units.
- Kept only the upward target triangle marker shape.
## CAB-008.3c Trim Deck Cleanup Final
- Removed remaining faint deviation block overlays from Trim Deck bars.
- Removed Trim Summary section from the Boatyard page.
- Kept the simplified target marker with a single upward triangle.

## v1.0 RC1b — CAB-009 Sea Trial UX Polish Pack

- Applied comma-based numeric formatting.
- Added collapsible Health cards and Trim Deck cards.
- Persisted collapse state with localStorage.
- Removed Trim Summary card and unused render function.
- Added Last Sync refresh button.
- Updated intro label to Version 1.0 RC1b.
- Added dashboard reload control to avoid unnecessary repeated reloads.


## v1.0 RC1c — CAB-010a Dashboard Width & Readability Correction

- Aligned top RiverWatch system bar and navigation width with the dashboard content grid.
- Restored dashboard text readability after RC1b compact layout.
- Kept Health cards collapsed by default while improving title / score / status spacing.
- Converted Trim Deck collapsed header labels from Korean to English: Asset / Current / Target / Delta / Status.
- Stabilized Trim Deck collapsed row column positions.


## RiverWatch v1.0 RC2b — CAB-013 Information Diet
- Trim Deck information density reduced for mobile readability.
- Status labels shortened.
- Detail-card duplicate labels removed.
- Boatyard mobile overflow containment improved.
- Intro philosophy restored on mobile.


## v1.0 RC2d — CAB-015 Trim Metric Semantic Labels

- Added Current / Target / Gap labels to Trim Deck detail metrics.
- Added status badge icons: SAT ✓ / BUILD ▲ / DILUTE ▼.
- Kept Trim Deck detail-only structure from CAB-014.


## v1.0 RC2e — CAB-015b Trim Metric Label Visibility Fix

- Restored visible Current / Target / Gap labels in Trim Deck detail cards.
- Added stronger CSS override for previous UI Diet label-hiding rule.


## v1.0 RC2f — CAB-016 Portfolio Journey Mobile Margin Regression Fix

- Restored mobile Portfolio Journey left-margin optimization.
- Reduced mobile SVG chart padding and prevented horizontal chart overflow.


## v1.0 RC2g — CAB-018 Health Status Threshold Tables

- Centralized Voyage / River / Boat health status thresholds in `app.js`.
- Updated Voyage status labels to ON COURSE / STABLE COURSE / DRIFTING / COURSE CORRECTION / LOST COURSE.
- Updated River and Boat status bands to shared 90 / 75 / 60 / 40 thresholds.


## v1.0 RC2i — CAB-019a Health Visual Polish Completion

- Completed Health status suffix removal and Voyage status table binding.
- Unified `Gap to Destination` / `ETA Extension` styling with other Voyage metric cards.


## v1.0 RC3 — CAB-020 Boat Health Information Architecture

- Refactored Boat Health to health-only metrics.
- Added Boat Profile section to Boatyard.
- Renamed Diversification Integrity to Role Coverage.
- Added Development Constitution and ADR-001.


## v1.0 RC3a — CAB-020a Health Row Alignment + Typography Restoration

- Aligned Boat Health metric row heights with Voyage/River Health.
- Restored metric typography for readability.
- Right-aligned Boat Profile values.
- Matched Trim Deck caption style with Boatyard subtitle style.


## v1.0 RC3b — CAB-020b Health Width + Typography Baseline Lock

- Finalized CAB-020 visual correction pass.
- Boat Health now follows the same full-width metric row rhythm as River/Voyage Health.
- Typography was restored and locked to the RC2i readability baseline.
- Boat Profile right-aligned values remain unchanged.
- Trim Deck caption now follows the same subtitle rhythm as Boat Profile.


## v1.0 RC3c — CAB-020c Typography Constitution + Metric Box Standardization

- Added ADR-002 Typography Baseline Lock.
- Locked RC2i as the minimum readability baseline.
- Restored stronger header typography.
- Standardized Boat Profile KPI boxes to two-line Health metric style.
- Right-aligned Logbook KPI values.
- Updated Development Constitution with typography protection principle.


## v1.0 RC3e — CAB-020e Intro Typography Baseline Lock
- Intro screen added to ADR-002 Typography Hard Lock scope.
- Intro brand/subtitle/operator/philosophy/button typography restored and tokenized.
- No functional change.


## CAB-020f
- Boat Profile narrow-width layout locked to single-column stack.
- Typography baseline preserved; no font-size reduction.


## CAB-020g - Logbook KPI Narrow-Width Stack Lock
- Locked Logbook KPI boxes to 1-column stacking on narrow screens.
- Preserved ADR-002 Typography Baseline Lock and KPI value right alignment.

## v1.0 RC4a - Metric Box Height Responsive Lock

- Added shared Metric Box height tokens.
- Unified Dashboard Health, Boat Profile, and Logbook KPI item heights.
- Reduced mobile metric box vertical height target from 68px to 54px.
- Preserved Typography Baseline Lock and value right alignment.

## CAB-028 — Current Deck Investment Performance UI
- Added Cost / Current / P/L / Return to each Trim Deck asset card.
- Preserved Holdings and Current / Target / Gap.
- Added profit-red / loss-blue performance colors and full KRW thousands formatting.
- Added responsive width protection for 10B+ values and Galaxy S26 portrait-class mobile widths.

## CAB-030 — Galaxy S26 Portrait Trim Metric Compact
- Compacted Current / Target / Gap boxes at <=520px, with an additional <=380px refinement.
- Preserved Current Deck performance typography and two-pane layout.
- Added dynamic viewport height (`100dvh`) support for mobile browsers with visible browser chrome.

## CAB-031 — Current Deck mobile balance & status visibility
- Added compact filled pill badges for WATCH / KEEP with white text.
- Expanded the mobile allocation pane and narrowed the performance pane to approximately 62:38.
- Tightened performance label/value spacing while preserving large KRW value readability.
- No calculation or data logic changes.

## CAB-033 — Current Deck Mobile 70:30 Layout
- Rebalanced mobile Current Deck cards to approx. 70:30 allocation/performance width.
- Preserved existing font sizes and typography.
- No calculation or data logic changes.

## CAB-042 — Health Score Inset + PWA Cache Refresh
- Moved Health Matrix summary scores slightly inward from the right edge on desktop and mobile.
- Preserved up-to-100 score width while using content-sized score allocation on narrow screens.
- Bumped service-worker cache key to CAB042 for deployed PWA refresh.

## CAB-053 — Intro Boot Sequence Monitor
- Moved the Intro boot monitor from the upper-right to the upper-left.
- Expanded boot status into a left-aligned four-step sequence: INITIALIZING → SYNCING CORE DATA → SYNCING LOGBOOK → BRIDGE READY.
- Added progressive step markers for pending, active, completed, failed, and ready states.
- Kept ENTER BRIDGE interlocked until BRIDGE READY.
- On boot failure, displays SYNC FAILED and a RETRY button below the monitor; RETRY performs a full page reload.
- Bumped the PWA cache key to CAB053.


## CAB-054
- Intro Boot Monitor converted to non-layout overlay HUD.
- Persistent disabled RETRY slot; activates on boot failure and reloads the page.
- Compact-height intro positioning improves ENTER BRIDGE visibility on mobile.

## CAB-055
- Tightened intro vertical spacing on compact/mobile screens to keep ENTER BRIDGE in the first viewport.
- Reduced RETRY to a compact badge-style control while preserving failure-only activation.
- Updated PWA cache namespace to CAB055.

## CAB057
- Rebalanced the mobile intro vertically by moving the content block about 40px downward while leaving the Boot Sequence HUD untouched.
- Updated PWA cache namespace to CAB057.
