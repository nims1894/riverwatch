# CAB-028 — Current Deck Investment Performance UI

## Current Deck UI
- Added per-asset investment performance information to each Trim Deck card while preserving Holdings and Current / Target / Gap.
- Added four right-side rows: Cost, Current, P/L, Return.
- Current / P/L / Return follow Korean market color semantics: profit red, loss blue; Cost remains neutral.
- Full KRW amounts use thousands separators and right alignment.
- Reserved numeric width for 10-billion-KRW-class values and tabular figures.
- Added responsive card rules optimized for Galaxy S26 portrait-class widths (approximately 360–430 CSS px), compressing spacing before typography and retaining the two-pane card structure.
