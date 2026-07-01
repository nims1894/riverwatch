# CAB-021 Change Log

## Title
Portfolio Configuration Refactor

## Status
APPROVED / IMPLEMENTED

## Baseline
RiverWatch v1.0 RC4a

## Summary
Introduced Google Sheet `PortfolioConfig` as the source of truth for target allocation, group identity, control type, and asset role. Refactored Portfolio handling from ticker-based target logic to configuration-based group logic.

## Key Changes

### 1. PortfolioConfig Sheet Integration
Added `portfolioConfigCsvUrl` to MarketDataHub configuration.

Expected columns:

| configOrder | configId | displayLabel | targetWeight | controlType | assetRole | isEnabled |
|---:|---|---|---:|---|---|---|
| 10 | GROWTH_ETF | QQQM | 40 | MIN | GROWTH | TRUE |
| 20 | CORE_ETF | SPYM | 25 | MIN | DEFENSIVE | TRUE |
| 30 | DIVIDEND | SCHD | 15 | MIN | DEFENSIVE | TRUE |
| 40 | GOLD | IAUM | 8 | MIN | DEFENSIVE | TRUE |
| 50 | BTC | BITQ | 2 | MIN | GROWTH | TRUE |
| 60 | INDIVIDUAL | INDIVIDUAL | 10 | MAX | GROWTH | TRUE |

### 2. Portfolio Sheet Schema Refactor
Portfolio holdings now use stable group linkage.

Expected columns:

| holdingTicker | holdingGroup | quantity | avgPriceKRW |
|---|---|---:|---:|
| QQQM | GROWTH_ETF | 109 | 404687 |
| SPYM | CORE_ETF | 119 | 133078 |
| SCHD | DIVIDEND | 174 | 48857 |
| IAUM | GOLD | 113 | 63863 |
| BITQ | BTC | 29 | 39915 |
| NVDA | INDIVIDUAL | 20 | 273395 |
| MSFT | INDIVIDUAL | 10 | 590350 |
| GOOGL | INDIVIDUAL | 10 | 453983 |
| PLTR | INDIVIDUAL | 30 | 220642 |

### 3. Calculation Engine Refactor
- Current value = `quantity × marketPriceUSD × USDKRW`
- Cost basis = `quantity × avgPriceKRW`
- Allocation is aggregated by `holdingGroup`
- Display order, label, target, control type, and asset role come from `PortfolioConfig`

### 4. Boat Health Refactor
Removed hardcoded growth/defensive ticker sets.

Before:
- `QQQM`, `BITQ`, `INDIVIDUAL` hardcoded as growth
- `SPYM`, `SCHD`, `IAUM` hardcoded as defensive

After:
- Asset role is loaded from `PortfolioConfig.assetRole`
- `controlType=MIN` means maintain at or above target
- `controlType=MAX` means cap at or below target

## Architecture Impact
This CAB moves RiverWatch from ticker-centered logic to configuration-centered logic.

- Stable Core preserved
- Google Sheets evolved as data/configuration layer
- UI editing not introduced
- Dashboard design language unchanged

## Files Changed
- `js/data.js`
- `js/marketEngine.js`
- `js/app.js`
- `CAB-021_CHANGELOG.md`

## Notes
Backward-compatible aliases remain in the parser for older Portfolio sheet names such as `Ticker`, `Shares`, and `AvgCostKRW`.
