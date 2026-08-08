# CAB-021b CHANGELOG

## Title
PortfolioConfig AssetClass Structural Integrity Integration

## Status
Implemented

## Summary
Structural Integrity scoring no longer depends on hard-coded ticker references for IAUM and BITQ.

## Changes
- Added `assetClass` parsing to PortfolioConfig CSV loader.
- Propagated `assetClass` into allocation holdings.
- Updated Reserve score to use `assetClass = GOLD` or `RESERVE`.
- Updated Speculation score to use `assetClass = CRYPTO` or `SPECULATIVE`.
- Added fallback `assetClass` values to `data.js` portfolioConfiguration.
- Preserved existing UI and typography baseline.

## Architecture Decision
- `assetRole` is used for Growth / Defensive exposure and River Suitability.
- `assetClass` is used for structural reserve/speculation scoring.
- Ticker-specific assumptions are removed from Boat Health structural evaluation.
