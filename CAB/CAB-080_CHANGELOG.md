# CAB-080 — Voyage Log Remap & Compact Timeline

- Remap Open Sea Logbook data source from the legacy MarketHub `OpenSeaLogbook` tab to the standalone `RiverWatch_Voyage_Log / VOYAGE_LOG` sheet.
- Parse the new schema: Date, EventType, PrincipalKRW, MarketValueKRW, TargetValueKRW, PlanGap, DailyTrend, VoyageState, Trend, Title, Message, Logbook.
- Keep boot sequence unchanged: core data is loaded from MarketHub, then logbook data is loaded from the standalone voyage log file.
- Logbook navigation refreshes the standalone VOYAGE_LOG source; RETRY continues to restart the full boot sequence.
- Portfolio Journey uses every dated VOYAGE_LOG row and remains a marker-free line chart.
- Voyage Timeline filters only `Logbook=TRUE` rows.
- Compact Timeline metrics to `Market / Plan / Gap` and add separate VoyageState and Trend badges.
- Bump PWA cache key to CAB-080.
