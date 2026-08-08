# CAB-021c CHANGELOG

## PortfolioConfig CRYPTO Alignment

### Purpose
Align RiverWatch fallback data model with the finalized Google Sheet PortfolioConfig structure.

### Changes
- Updated fallback `PortfolioConfig.configId` from `BTC` to `CRYPTO`.
- Updated fallback `Portfolio.holdingGroup` for `BITQ` from `BTC` to `CRYPTO`.
- Updated fallback `manual.boatConfiguration` key from `BTC` to `CRYPTO`.
- Confirmed `assetClass = CRYPTO` remains the Structural Integrity source for speculation scoring.
- No UI layout or typography changes.

### Final Google Sheet schema alignment

PortfolioConfig columns:
`configOrder`, `configId`, `displayLabel`, `assetClass`, `targetWeight`, `controlType`, `assetRole`, `isEnabled`

Portfolio columns:
`holdingTicker`, `holdingGroup`, `quantity`, `avgPriceKRW`

MarketData columns:
`marketSymbol`, `marketPriceUSD`

### Architecture Note
`configId` represents the stable portfolio logic group, not a ticker or product name. Therefore the crypto sleeve uses `CRYPTO` rather than `BTC`, while the current displayed/held instrument remains `BITQ`.
