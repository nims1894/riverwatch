# CAB-020g CHANGELOG

## Title
Logbook KPI Narrow-Width Stack Lock

## Scope
CAB-020 follow-up refinement.

## Changes
- Locked Open Sea Logbook KPI boxes to single-column stacking on narrow screens.
- Removed 2-column fallback behavior for `.logbook-kpis` under narrow viewport widths.
- Preserved ADR-002 Typography Baseline Lock; no font-size reduction was introduced.
- Kept KPI value right alignment.

## Rationale
Boat Profile and Logbook KPI areas should share the same responsive behavior. When screen width is narrow, readability and visual consistency take priority over compact 2-column density.

## Status
Completed.
