# Implementation Plan: Tauri UI Redesign

**Branch**: `005-tauri-ui-redesign` | **Date**: 2026-05-15 | **Spec**: N/A

**Input**: User requested "nghiên cứu về làm giao diện tauri, làm lại giao diện cho đẹp".

## Summary

Research modern Tauri UI aesthetics ("Corporate Dark") and redesign the application to be sleek and beautiful, leveraging Framer Motion and Tailwind CSS. The app will feature a standard native-like "App Shell" with a custom drag region for the window, ensuring a gorgeous Desktop feel.

## Technical Context

**Language/Version**: React 19, TypeScript, Rust

**Primary Dependencies**: Tailwind CSS v4, Framer Motion, Lucide React

**Storage**: N/A for styling

**Testing**: N/A

**Target Platform**: Desktop App (Tauri - macOS/Windows)

**Project Type**: Desktop UI Restyling

**Performance Goals**: 60fps animations 

**Constraints**: Tailwind CSS constraints, must render elegantly across standard desktop resolutions.

**Scale/Scope**: Refactoring existing structural components (AppShell, Cards)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No strict gates violated. This is purely a front-end aesthetic pass.

## Project Structure

### Documentation (this feature)

```text
specs/005-tauri-ui-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── AppShell.tsx
│   ├── InputModeCard.tsx
│   ├── Sidebar.tsx
│   └── Buttons.tsx
├── pages/
│   ├── CreateVideoPage.tsx
│   └── HistoryPage.tsx
└── styles.css
```
