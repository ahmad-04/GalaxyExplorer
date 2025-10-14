# Reddit + Kiro Hackathon Roadmap

A focused, judge-aligned plan to ship delightful UX, community play, publish-ready polish, and a standout developer experience using Devvit + Phaser + TypeScript.

## Goals mapped to judging criteria

- Delightful UX: Animated splash, theme packs, helpful overlays, smooth editor microinteractions.
- Polish: Example levels and beautiful posts (with thumbnails/GIFs), clear walkthrough, fast loading.
- Reddit-y: Memetic themes, playful copy, and Devvit Blocks posts that feel native to Reddit.
- Community Play: Weekly Challenge, local leaderboard, rating/favorites (flagged), and Community tab.
- Best Kiro DX: One-command demo, asset pipeline automation, typed schemas, adoptable scripts.

---

## Feature 1: Animated Splash (theme-aware)

- Where: `src/client/index.html` (loading animation), reinforced in `src/client/game/scenes/BuildModeScene.ts` header.
- Why: Strong first impression, perceived performance, brand identity.
- Deliverables
  - Subtle shimmer/gradient animation using current theme palette.
  - BuildMode header micro-animation that mirrors splash styling.
- Acceptance
  - Loads within ~2s; animation visible and adapts to selected theme.
  - No layout shift or input lock beyond first paint.
- Implementation notes
  - Use CSS/Canvas-driven gradient shimmer; avoid heavy assets.
  - Read theme from `src/client/theme.ts` and persist via localStorage.
- Risks & mitigation
  - Risk: Over-animation on low-end devices → Use prefers-reduced-motion check.

---

## Feature 2: Theme Packs (3 presets)

- Where: `src/client/theme.ts`; applied in `UiKit.ts`, `DesignStep.ts`, `PublishStep.ts`.
- Presets: Cosmic Neon, Retro CRT, Cat Nebula.
- Deliverables
  - Theme dropdown; instant apply to palette, status bar, buttons.
  - Persist selection to localStorage; default to Cosmic Neon.
- Acceptance
  - Switching is instant (no reload) and consistent across UI components.
  - Keyboard hint appears in tutorial overlay (e.g., “T” for palette, “H” for UI toggle already exists).
- Implementation notes
  - Centralize tokens (colors, fonts, radii, shadows) in `theme.ts`.
  - Broadcast a `ui:theme:changed` event for live updates.

---

## Feature 3: Tooltip Tutorial + Judge Walkthrough Overlay

- Where: `src/client/game/ui/UiKit.ts` overlay helper; invoked from `BuildModeScene` on first open.
- Topics: palette, save, verify, publish, weekly challenge, theme switch.
- Deliverables
  - 4–6 concise steps; “Got it” progression; skippable; persists completion flag.
- Acceptance
  - Overlay guides a new user from placement → save → verify → publish → weekly challenge.
- Implementation notes
  - Use non-blocking overlays (click-through disabled only for highlighted regions).

---

## Feature 4: Weekly Challenge + Local Leaderboard

- Where: `src/client/game/ui/LevelBrowser.ts` (button/UX), `src/client/game/services/BuildModeService.ts` (persist), display in Blocks post.
- Deliverables
  - Deterministic weekly seed (e.g., ISO week) → generates a fair template level.
  - Local leaderboard (top 5): time-to-clear, enemies defeated; stored in LocalStorage.
  - “Play Weekly Challenge” button in Level Browser and CTA in Landing/Weekly Blocks.
- Acceptance
  - Seed is deterministic per week; leaderboard updates after runs.
  - Basic anti-cheese validation (must verify/clear to submit stats).
- Implementation notes
  - Reuse Starship test counters; write to service under `weekly:{weekId}:leaderboard`.

---

## Feature 5: GIF/Thumbnail Generator for Posts

- Where: `tools/thumbnail-or-gif.mjs` (Node; headless capture or compositor).
- Deliverables
  - 480×270 thumbnail (PNG) and 5–8s GIF per showcased level.
  - Stored under `src/client/public/assets/export/` for Devvit Blocks and README.
- Acceptance
  - Script runs in CI/local; artifacts generated for each sample level.
- Implementation notes
  - Prefer spritesheet/compositor fallback if headless capture is flaky.

---

## Feature 6: Example Levels + Posts

- Where: generate via `BuildModeService` save; publish via `PublishStep` (capture permalinks).
- Themes: Space, Retro, Cats; playful copy and names.
- Deliverables
  - 3–5 curated levels; verified and published; permalinks collated in README and a Landing Block.
- Acceptance
  - Levels load, verify, and publish; Block cards look great with thumbnails/GIFs.

---

## Feature 7: Rating/Favorite UX Stub (feature-flagged)

- Where: Community tab UI; local-only persistence; flag in `src/shared/config.ts`.
- Deliverables
  - Stars/hearts toggle stored locally, with aggregate counts derived locally for demo.
- Acceptance
  - Works without server; disabled behind flag by default; easy to wire to backend later.

---

## Feature 8: Fully-fledged Build Mode QoL

- Where: `DesignStep.ts`, `BuildModeService.ts`, `BuildModeScene.ts`, `UiKit.ts`.
- Deliverables
  - Save-on-exit and session restore: autosave on quit (already partially present), restore prompt on reopen.
  - Persist UI state (palette open, theme, header collapsed, last level opened).
  - Selection & locking polish; small property edit panel for common fields (e.g., enemy type, spawn rate).
  - Camera QoL: center-on-selection, optional bookmarks; maintain 60fps.
- Acceptance
  - Closing app preserves work; reopening resumes seamlessly.
  - Minor edits to entity properties possible without heavy modal.
- Notes
  - `BuildModeService` already has autosave events—extend and surface recovery UX.

---

## Devvit Blocks: First-Impression and Community Play

- Blocks to implement
  - Landing Block: hero, app pitch, 3 theme thumbnails, “Play Weekly Challenge”, “Browse Community Levels”.
  - LevelCard Block: thumbnail/GIF, difficulty, tags, Play/Discuss CTAs.
  - Weekly Challenge Block: this week’s seed, rules, mini-leaderboard, Play CTA.
  - Leaderboard Block: top 5 entries; “Try to beat this”.
  - Publish Success Block: permalink, Open/Copy actions, “Create new level”.
- Acceptance
  - Blocks render cleanly on mobile/desktop; branded; accessible; link back to app.

---

## Best Kiro DX: One-command demo + tooling

- Deliverables
  - `npm run demo:seed` to export assets, build client/server, seed example levels, generate thumbnails/GIFs, and open preview.
  - Type-checked level schema; friendly import errors.
  - Short “Steal this pipeline” doc for other teams.
- Acceptance
  - Fresh clone → one command → running demo with content and Blocks-ready assets.

---

## Timeline (7 days)

- Day 1: Animated splash + 3 theme packs + persistence.
- Day 2: Tooltip tutorial + judge overlay; sticky status polish.
- Day 3: Devvit Blocks (Landing + LevelCard) + style tokens.
- Day 4: Example levels, thumbnails/GIFs; publish and collect permalinks.
- Day 5: Weekly Challenge + local leaderboard + Blocks.
- Day 6: Rating/favorite stub (flagged); DX one-command; README “Try it (judges)”.
- Day 7: QoL save/restore, property mini-editor; QA + compliance + demo rehearsal.

---

## Acceptance matrix

- Delightful UX: Splash + themes + overlays; instant feedback; 60fps editor.
- Polish: Curated posts with media; README judge walkthrough; quick load.
- Reddit-y: Memetic themes; playful copy; Blocks-native presentation.
- Community Play: Weekly Challenge + leaderboard + ratings/favorites (local).
- Best Kiro DX: One-command demo; exporters; typed schema; adoptable scripts.

---

## Risks & fallbacks

- Devvit/API flake: keep permalinks captured + GIFs; copy-to-clipboard fallback.
- Headless capture flaky: use compositor fallback; pre-generate media.
- Time squeeze on ratings/leaderboards: keep local-only behind flag; clean UI now, wire later.
- Accessibility/contrast: validate with theme tokens; prefer high-contrast palette defaults.

---

## Owners & estimates (lightweight)

- UX polish (splash, themes, tooltips): 1 dev · 1.5 days
- Blocks (Landing/LevelCard/Weekly/Leaderboard): 1 dev · 1.5 days
- Weekly Challenge + leaderboard: 1 dev · 1 day
- Example levels + media + publish: 1 dev · 1 day
- QoL build mode + save/restore + mini-editor: 1 dev · 1 day
- DX + README + demo: 0.5–1 day

---

## Integrations & flags

- Feature flags: `src/shared/config.ts` → ENABLE_BUILD_MODE, ENABLE_BUILD_MODE_SHARING, ENABLE_BUILD_MODE_COMMUNITY, ENABLE_RATING_FAVORITE (new).
- Media outputs: `src/client/public/assets/export/`.
- Scripts: `tools/thumbnail-or-gif.mjs`, `npm run demo:seed`.

---

## Done = ready to demo

- Themeable animated splash, tutorial overlay, instant theme toggle.
- 3–5 example levels published; permalinks + media collated.
- Weekly Challenge playable with local leaderboard; Blocks posts live.
- Rating/favorite stub (flagged) visible in Community tab.
- One-command demo sets up content and opens the app.
