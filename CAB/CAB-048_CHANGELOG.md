# CAB-048 CHANGELOG

## Baseline
- RiverWatch v1.0 · RV Koru CAB047

## Changes
1. Trim Deck Cost numerics
   - Restored Cost numeric size to the same scale as Current/P&L for rapid digit-length comparison.
   - Retained muted gray reference color so Cost remains visually subordinate.
   - Applied the same comparison principle to the portfolio summary Cost value.

2. Doctrine Compliance
   - Removed the fixed `100%` presentation.
   - Doctrine Compliance is now derived from Boat Health:
     - 85–100: `ALIGNED` (muted seafoam)
     - 70–84: `DRIFTING` (muted amber)
     - 0–69: `BREACHED` (muted coral)
   - Boat Health remains the quantitative measure; Doctrine Compliance is its qualitative operating-state interpretation.

3. Mission Status palette
   - `COURSE RESET` is explicitly mapped to the action/coral state instead of falling through to the default seafoam state.

4. Open Sea Logbook KPI metadata
   - Increased label-parenthetical metadata size by roughly 15–20% while retaining muted tone and subordinate hierarchy.

5. PWA
   - Cache key bumped to CAB048.
