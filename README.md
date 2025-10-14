## Galaxy Explorer

An arcade space shooter with a built-in Build Mode editor, designed for Reddit’s Devvit platform. Create levels, place enemies with a grid-based editor, verify they’re beatable, and publish to a Reddit post for others to play.

### What’s inside

- Client: Phaser 3 + TypeScript, built with Vite (`src/client`)
- Server: Express + Devvit web integration (`src/server`)
- Shared types and feature flags (`src/shared`)
- Build Mode editor (Design, Publish, Browser) under `src/client/game`
- Asset export tools for Aseprite and Kla’ed art (`tools/*`)

### Quick start

Prereqs: Node 22, a Reddit developer account (for Devvit playtest/publish).

- Development (client+server+Devvit playtest):
  - `npm run dev`
- Faster local iteration (client+server only):
  - `npm run dev:fast`
- Preview only the client build:
  - `npm run preview:client`
- Build both client and server:
  - `npm run build`
- Type-check, lint, and format:
  - `npm run check`
- Devvit auth and lifecycle:
  - `npm run login`, `npm run deploy`, `npm run launch`

### Build Mode overview

- Scenes: `BuildModeScene` orchestrates steps and common UI

  - Design step: `scenes/buildMode/DesignStep.ts`
    - 20-column fixed grid, snap-to-grid placement
    - Right-side entity palette with tooltips and keyboard shortcuts (H/T/F)
    - Status bar with coordinates, selection count, save state, and Test/Publish pills
    - Local autosave and explicit save via `BuildModeService`
  - Publish step: `scenes/buildMode/PublishStep.ts`
    - “Verification run” launches gameplay and requires a full clear without dying
    - On success, enables publishing to a Reddit post via `publishLevelToReddit`
    - Shows permalink and share helpers
  - Level Browser: `ui/LevelBrowser.ts` for local levels

- Services and state:
  - `BuildModeService` handles LocalStorage persistence, autosave, import/export, and validation
  - `BuildModeManager` maintains editor state (selection, tools, grid)
  - Feature flags in `src/shared/config.ts` (ENABLE_BUILD_MODE, ENABLE_BUILD_MODE_SHARING, etc.)

### Asset pipeline (Aseprite + Kla’ed)

- Aseprite exports are served from `src/client/public/assets/**`
- Provided tools to export spritesheets/PNGs and JSON meta:
  - `npm run export:aseprite:all` or targeted scripts (see `package.json`)
  - `npm run export:kla:all` to export Kla’ed packs
  - See `docs/aseprite-integration.md` for Phaser loading and tagging

### Repo structure (high-level)

- `src/client/game` – gameplay and editor
  - `scenes/BuildModeScene.ts`
  - `scenes/buildMode/DesignStep.ts`, `PublishStep.ts`
  - `ui/LevelBrowser.ts`, `ui/UiKit.ts`
  - `services/BuildModeService.ts`
  - `entities/BuildModeManager.ts`
- `src/server` – Express API and Devvit integration
- `src/shared` – types, feature flags
- `docs` – Aseprite integration, Build Mode roadmap, workflow diagram
- `tools` – export and data-generation scripts

### Notes for hackathon judges

- Delightful UX: Clean editor layout, sticky status bar, tooltips, tasteful animations
- Community Play: Verification ensures fair published levels; publishing posts via Devvit
- Best Dev Experience: Asset export scripts, strong TypeScript config, ESLint + Prettier, automated builds

### Credits

- Phaser team for the Vite TS template inspiration
- Devvit team for the Reddit developer platform
