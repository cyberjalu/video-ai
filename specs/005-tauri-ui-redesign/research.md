# Research: Tauri UI Redesign ("Corporate Dark")

## Decision: Setup Frameless Window
**Rationale**: Native desktop apps look much more modern when the default OS window decorations are removed and replaced with a custom navigation bar that matches the app's aesthetic.
**Implementation details**: 
- Ensure `tauri.conf.json` specifies `"decorations": false` or `"transparent": true` (depending on OS needs).
- Use an application shell with `data-tauri-drag-region`.

## Decision: Tailwind "Corporate Dark" System Layer
**Rationale**: The user wants a beautiful, professional UI. "Corporate Dark" entails:
- Deep backgrounds like `#09090b` or `#101014`
- Glassmorphism effects using background blur and translucent borders (`border-white/5` or `border-white/10`).
- Glow effects using radial gradients.
- Tailwind v4 handles these effects effectively.

## Decision: Framer Motion for Transitions
**Rationale**: Native-feeling desktop applications require smooth micro-interactions (e.g., hover states on buttons, modal pop-ups, page transitions).
**Implementation details**: Include motion primitives for view transitions between templates, history, and creation pages.

## Alternatives Considered
- Standard CSS modules: Too slow for rapid iteration compared to Tailwind.
- Native UI frameworks (GTK/SwiftUI): Not possible within the Tauri + React ecosystem.
