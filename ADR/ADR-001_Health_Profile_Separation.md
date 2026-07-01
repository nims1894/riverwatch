# ADR-001 — Health / Profile Separation

## Status
Accepted

## Context
Boat Health previously mixed health metrics with profile information.

## Decision
Dashboard Boat Health owns only health metrics:
- Trim Alignment
- River Suitability
- Role Coverage
- Captain Discipline

Boatyard owns profile and trim inspection:
- Boat Profile: Boat Archetype, Voyage Phase, Cost Basis, Boat Return
- Trim Deck: Holdings and allocation trim

## Consequences
- Information ownership is clearer.
- Dashboard becomes an evaluation surface.
- Boatyard becomes the vessel profile and trim inspection surface.
