# CAB-020f CHANGELOG

## Boat Profile Narrow-Width Stack Lock

### Scope
- CAB-020 continuation.
- No new feature added.

### Changes
- Prevented Boat Profile from collapsing into a 2-column layout on narrow screens.
- Forced Boat Profile metric boxes to stack in a single column under narrow viewport conditions.
- Preserved ADR-002 Typography Baseline Lock.
- Maintained label/value two-line metric box structure and right-aligned values.

### Rationale
- Narrow 2-column Boat Profile layout reduced readability and weakened consistency with the Health metric box style.
- Layout density must be solved by stacking, not by reducing font size.
