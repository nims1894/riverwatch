# CAB-059 Changelog

## Intro animation language
- Added a restrained one-shot intro arrival sequence for the Koru mark, title/version, crew block, doctrine lines, and bridge-entry control.
- Added subtle vector wave layers and a small RV Koru boat silhouette behind the intro composition.
- Added a single readiness highlight sweep to ENTER BRIDGE when Boot Sequence reaches BRIDGE READY.
- Kept the Boot Sequence HUD and all data/boot logic intact.

## Persistent header ocean motion
- Added three low-opacity SVG wave layers to the shared top header so all application pages retain the same sailing-state visual language.
- Added a small RV Koru silhouette with slow heave/roll motion on wide screens.
- Decorative layers are clipped inside the header and remain independent from content layout.

## Responsive / accessibility
- SVG/viewBox geometry and clipped overflow preserve wave proportions across zoom and viewport changes.
- Reduced wave intensity on narrow screens; header/intro boat decorations are removed where density becomes high.
- Added `prefers-reduced-motion` fallback that disables all CAB059 motion without hiding content.

## PWA
- Updated service-worker cache namespace to CAB059.
