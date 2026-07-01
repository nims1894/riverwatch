# RiverWatch Design Constitution

## Principle D01 — Typography is Product Identity
Typography is not an incidental CSS attribute. It is part of RiverWatch's visual identity and readability contract.

## Principle D02 — RC2i Readability Baseline
RC2i is the approved typography readability baseline. Future releases must not reduce the perceived font scale below the RC2i level without CAB approval.

## Principle D03 — Layout Before Typography
When screen density becomes difficult, solve it in this order:

1. Component structure
2. Layout
3. Spacing
4. Typography only with CAB approval

## Principle D04 — Metric Box Standard
Metric boxes use a two-line structure:

- First line: label
- Second line: value
- Value: right-aligned

This applies to Health, Boat Profile, Logbook KPI, and similar metric displays.

## Principle D05 — No Silent Typography Regression
Any change to `font-size`, `line-height`, `letter-spacing`, or typography tokens must be documented in a CAB changelog.


## CAB-020e Addendum
Intro screen typography is explicitly included in the ADR-002 Typography Baseline Lock scope.


## Principle D06 — Responsive Consistency
Narrow screens may stack metric boxes into one column, but they must not change the semantic alignment rule. Labels remain left-aligned and values remain right-aligned.

