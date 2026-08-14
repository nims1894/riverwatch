# CAB-083 STEP 3 FINAL

- River Health calibration source: `RIVER_CALIBRATION` (gid 39917011), block-name dynamic parsing.
- FED = Rate Level 60% + Direction 40%.
- VIX / Brent / USD_KRW use editable UpperBound calibration tables.
- NVDA DC revenue growth uses editable LowerBound calibration table.
- AI CAPEX / M2 use fixed 5-state trend scores.
- AI CAPEX and NVDA manual inputs become STALE after 120 days; stale sensors are excluded.
- River Health weights: FED25 / VIX20 / M2 15 / Brent10 / USD_KRW10 / AI CAPEX10 / NVDA DC10.
- Minimum valid River sensor weight 70%; below that River Health is PENDING.
- River status thresholds: TAILWIND 90+, CALM 80+, HEADWIND 70+, ROUGH 55+, STORM <55.
- River Fit changed from tactical growth-exposure fit to Koru design-range fit: 100 / 90 / 60.
- Trim Balance TARGET/BAND uses corrected gap (`Math.trunc`), making |gap|<1% a zero-gap zone.
- Engine Power score buckets: 100 / 95 / 85 / 70 / 50; Health card shows converted score, not raw ratio.
- Fuel Supply score buckets: 100 / 95 / 85 / 70 / 50; PENDING displays `PENDING (-)`.
- Boat Health card order: Engine Power → Fuel Supply → Trim Balance → River Fit; mobile remains one item per row.
