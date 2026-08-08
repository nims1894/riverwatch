# CAB-047 — Information Hierarchy Refinement

## Changes
- Portfolio Journey KPI context moved from the primary value to the label:
  - Latest Value (latest observation date)
  - Open Sea Target (target date)
  - Progress (actual / planned course, variance)
- Latest observation remains the newest OpenSeaLogbook row regardless of Milestone TRUE/FALSE.
- Trim Deck Cost values de-emphasized as muted reference data, including portfolio summary COST.
- Trim Deck GAP values now use RiverWatch semantic direction colors:
  - positive = muted seafoam
  - negative = muted steel blue
  - zero = neutral
- Mission card hierarchy refined:
  - Recommended Action emphasized as primary command
  - Last Action retained as primary operational context
  - Days Since Action and Doctrine Compliance muted as secondary instrumentation
- Mission Status colors aligned with RiverWatch semantic palette:
  - normal/on-course = seafoam
  - watch/build = amber
  - adapt/correction/rebalance = coral
  - recover/lost/critical = red
  - unknown/N/A = gray
