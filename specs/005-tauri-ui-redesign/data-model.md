# Data Model

For the UI Redesign, the data models remain largely untouched from the React perspective, but structural hierarchies (Shell vs Content) are more strictly enforced.

## UI Entities

### AppShell
- State: `activeTab`
- Responsibilities: Sidebar, Drag Region, Window controls (macOS traffic lights spacer), Content Area wrapper.

### InputModeCard
- State: `url`, `prompt`, `inputMode` ("url" | "prompt")
- Provides input fields with aesthetic glows and focus rings.

### VideoPreviewCard
- Represents the final stage of generation, showing the `mp4Path`.

### Theme
- Colors: Zinc-based dark theme (`zinc-900` to `zinc-50`), cyan accents for primary actions, emerald for success states.
