# Implementation Tasks: Tauri UI Redesign

**Branch**: `005-tauri-ui-redesign` | **Feature**: Tauri UI Redesign

## Phase 1: Setup

- [x] T001 Verify `tauri.conf.json` supports frameless window (`"decorations": false`) in `src-tauri/tauri.conf.json`

## Phase 2: Foundational

- [x] T002 Verify Framer Motion and Tailwind dependencies in `package.json`

## Phase 3: [US1] App Shell Redesign

- [x] T003 [US1] Refactor `src/components/AppShell.tsx` to include native macOS window traffic lights spacer and `data-tauri-drag-region`
- [x] T004 [US1] Polish `src/components/Sidebar.tsx` backgrounds and glassmorphism

## Phase 4: [US2] Input Mode Refinement

- [x] T005 [P] [US2] Refactor `src/components/InputModeCard.tsx` with radial glowing gradients and thin translucent borders
- [x] T006 [P] [US2] Refactor `src/components/Buttons.tsx` primary and secondary button hover effects

## Phase 5: [US3] View Transitions

- [x] T007 [P] [US3] Wrap route views in `src/pages/CreateVideoPage.tsx` with Framer Motion primitives
- [x] T008 [P] [US3] Wrap route views in `src/pages/HistoryPage.tsx` with Framer Motion primitives
- [x] T009 [P] [US3] Wrap route views in `src/pages/TemplatesPage.tsx` with Framer Motion primitives

## Phase 6: Polish

- [x] T010 Review integration and final responsive constraints across the app shell
