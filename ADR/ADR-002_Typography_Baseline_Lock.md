# ADR-002 — Typography Baseline Lock

## Status
Accepted

## Context
RiverWatch is a personal navigation dashboard. Its usability depends on quick recognition, not maximum information density. During CAB-020 refactoring, several UI areas became visually smaller even though the component structure improved.

RC2i is approved as the preferred visual readability baseline.

## Decision
RiverWatch typography scale is part of the product identity and is locked to the RC2i readability baseline.

The following areas must not have font sizes reduced without explicit CAB approval:

- Intro
- Header
- Navigation
- Mission
- Status
- Dashboard Summary
- Section Title
- Health Card
- Metric Box
- Boat Profile
- Trim Deck
- Captain's Bridge
- Logbook
- Timeline

When layout pressure occurs, the implementation order is:

1. Adjust component structure
2. Adjust layout
3. Adjust spacing
4. Adjust typography only after CAB approval

## Consequences
Typography changes are no longer incidental CSS edits. They are design decisions and must be reviewed through CAB when they reduce readability or alter the visual scale.


## CAB-020d Clarification
Typography is now enforced through a CSS hard-lock section and documented in `DESIGN_CONSTITUTION.md`.

The implementation rule is: avoid direct size reductions in downstream selectors. New UI elements should inherit the locked typography tokens or use an approved existing component class.
