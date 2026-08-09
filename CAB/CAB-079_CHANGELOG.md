# CAB-079 CHANGELOG

SSoT: RiverWatch v1.1 CAB078(1)

## Root-cause fix
- Removed 1 legacy Header rule(s) that forced:
  - `animation: none !important`
  - `transform: none !important`
  on Rear Wave / Front Wave / Boat.
- This legacy `transform:none !important` prevented transform-based keyframes
  from visibly moving on mobile even when later animation declarations were running.
- Kept Seagulls behavior unchanged.

## Position correction
- Mobile Header Boat raised 10px:
  - CAB078 `bottom:-3px`
  - CAB079 `bottom:7px`
- Desktop Header Boat position unchanged.

## Preserved
- Intro assets and Intro animation unchanged.
- Desktop Header motion parameters unchanged.
- Health, portfolio, data, navigation, and investment logic unchanged.
