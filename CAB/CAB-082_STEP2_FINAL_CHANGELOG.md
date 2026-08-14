# CAB-082 STEP 2 FINAL

- Fix FUEL SUPPLY null score rendering: unavailable/unevaluated month now shows `PENDING` instead of `SHORTFALL (0)`.
- Prefix absolute Voyage monetary values with `KRW`: Current / Expected / Target.
- Render Target Gap direction as `▲ KRW xxM` or `▼ KRW xxM`; zero is `KRW 0M`.
- Preserve lowercase time units in ETA deviation labels (`y/m/d`) by disabling uppercase transform for the dynamic ETA label.
- Bump PWA cache key for deployment refresh.
