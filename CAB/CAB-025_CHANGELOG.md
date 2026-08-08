# CAB-025 — Boat Profile Value SSOT & Return Detail

## Scope
- Added **Current Value** below Cost Basis in Boat Profile.
- Boat Profile Current Value reuses `riverwatch.calc.currentPosition`, the same value shown as Voyage Health **Current Position**.
- Boat Return now displays both value change and return rate, for example `+7M (+3.0%)`.
- Value change uses the existing derived metric `riverwatch.calc.boatPnL = currentPosition - costBasis`.

## Design Principle
- Current portfolio value remains a single source of truth.
- No duplicate market-value calculation was introduced.
