# CAB-020 — Boat Health Information Architecture Refactoring

Status: DONE  
Release: RiverWatch v1.0 RC4  
Sprint: #010

## Objective
Refactor Boat Health information architecture and lock the approved RiverWatch typography / metric-box standard so future changes do not silently degrade readability.

## Final Scope
- Separated Boat Health and Boat Profile responsibilities.
- Aligned Boat Health metric row height and width with River Health / Voyage Health.
- Standardized Health metric rows as a shared component pattern.
- Converted Boat Profile to the approved two-line Metric Box style.
- Preserved Boat Profile value right alignment.
- Matched Trim Deck explanatory typography with Boat Profile typography.
- Locked RC2i readability as the Typography Baseline.
- Added ADR-002 Typography Baseline Lock.
- Added Design Constitution.
- Restored Intro typography under ADR-002 scope.
- Prevented Boat Profile and Logbook KPI from rendering as two columns on narrow screens.
- Preserved mobile value right alignment for Boat Profile and Logbook KPI.

## Revision History

### Rev.A — Health / Profile Separation
- Boat Health and Boat Profile roles separated.
- Boat Health limited to health metrics.
- Boat Profile retained doctrine/profile information.

### Rev.B — Health Row Height / Width Alignment
- Boat Health row height and spacing aligned with River Health.
- Boat Health row width aligned with Voyage / River metric rows.

### Rev.C — Typography Constitution
- RC2i typography selected as approved readability baseline.
- Typography changes moved under CAB control.

### Rev.D — Typography Hard Lock
- Header, Dashboard, Health, Boat Profile, Trim Deck, Captain's Bridge, Logbook, and Timeline typography reinforced.
- Design Constitution added.

### Rev.E — Intro Typography Lock
- Intro screen typography added to ADR-002 scope.
- Intro title, subtitle, operator, philosophy, and button typography restored.

### Rev.F — Boat Profile Responsive Stack
- Boat Profile forced to one-column stack on narrow screens.
- Typography preserved; layout changed instead of reducing font size.

### Rev.G — Logbook KPI Responsive Stack
- Logbook KPI forced to one-column stack on narrow screens.
- Visual behavior aligned with Boat Profile.

### Rev.H — Mobile Value Right Alignment
- Boat Profile values remain right-aligned on mobile.
- Logbook KPI values remain right-aligned on mobile.

## Completion Criteria
- CAB-020 is complete.
- RiverWatch v1.0 RC4 is the Sprint #010 baseline release.
- Future typography changes require explicit CAB approval.
