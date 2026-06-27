# CAB-014_CHANGELOG

## RiverWatch v1.0 RC2c
## Trim Deck Detail-Only Simplification

### Changed
- Removed Trim Deck accordion toggle box.
- Removed Trim Deck summary rows.
- Kept detailed trim cards as the default and only Trim Deck view.
- Restored stat labels in detail cards:
  - Current
  - Target
  - Delta

### Layout
- Desktop / Tablet: detail cards use two-column layout.
- Mobile: detail cards remain single-column layout.
- Mobile overflow protection retained.

### Rationale
- The accordion + summary + detail structure duplicated the same values and increased mobile clutter.
- Detail-only layout keeps the richer visual signal while reducing interaction fatigue.
