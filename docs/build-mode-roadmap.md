# Galaxy Explorer: Build Mode Feature Roadmap

## Project Overview

This document outlines a comprehensive plan for implementing a Build Mode feature in Galaxy Explorer, a Phaser-based space shooting game. The Build Mode will allow users to create, edit, save, and share custom game levels.

## Technical Assessment

### Project Architecture

Galaxy Explorer is built with:
- **Frontend**: Phaser 3.88.2 (Game framework)
- **Backend**: Devvit web platform (@devvit/web 0.12.0)
- **Storage**: Redis (via Devvit) for server-side storage

### Key Entry Points

- **Game Initialization**: `src/client/game/main.ts`
- **Main Menu**: `src/client/game/scenes/MainMenu.ts`
- **Game Scene**: `src/client/game/scenes/StarshipScene.ts`
- **Server API**: `src/server/index.ts`

### Build Mode Feature Summary

Build Mode will enable users to:
1. Create custom game levels with a visual editor
2. Place enemies, obstacles, power-ups, and decorations
3. Save and load levels locally
4. Test levels in the game
5. Share levels with the community (future phase)

## Implementation Strategy

### Core Principles

- **Feature Flag Development**: All new code will be behind feature flags to allow for easy toggling
- **Minimal Refactoring**: Avoid major refactoring of existing code where possible
- **Progressive Enhancement**: Implement in phases, with each phase providing testable functionality
- **Local First**: Focus first on client-side functionality, then add server integration

## JSON Schema

Build Mode will use the following data structure for levels:

```typescript
// Key types (abbreviated, see src/shared/types/buildMode.ts for full schema)
export interface LevelData {
  settings: LevelSettings;
  entities: BaseEntity[];
}

export interface LevelSettings {
  name: string;
  author: string;
  difficulty: number;
  backgroundSpeed: number;
  backgroundTexture: string;
  musicTrack: string;
  description?: string;
  version: string;
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Position;
  rotation: number;
  scale: number;
}
```

Full schema is defined in `src/shared/types/buildMode.ts`

## Phased Implementation Plan

### Phase 1: Core Framework & Data Structure

**Goal**: Set up the foundational architecture for Build Mode

**Key Files**:
- `src/client/game/scenes/BuildModeScene.ts` (new)
- `src/client/game/ui/BuildModeUI.ts` (new)
- `src/client/game/entities/BuildModeManager.ts` (new)
- `src/shared/types/buildMode.ts` (created)

**Features**:
- Grid system for precise object placement
- Basic UI for editor controls
- Data serialization for level storage
- State management for the editor

### Phase 2: Entity Placement & Properties

**Goal**: Enable placing, editing, and configuring all entity types

**Key Files**:
- `src/client/game/factories/BuildModeEntityFactory.ts` (new)
- `src/client/game/ui/PropertyEditor.ts` (new)
- `src/client/game/ui/BuildModeToolbar.ts` (new)

**Features**:
- Entity creation and placement
- Property editors for each entity type
- Selection, movement, and rotation tools
- Undo/redo functionality

### Phase 3: Level Management & Testing

**Goal**: Enable saving, loading, and testing custom levels

**Key Files**:
- `src/client/game/ui/LevelBrowser.ts` (new)
- `src/client/game/utils/LevelStorage.ts` (new)
- `src/client/game/scenes/LevelTestScene.ts` (new)

**Features**:
- Local storage for level data
- Level browser UI for managing saved levels
- Import/export functionality for level sharing
- "Test Level" feature for playtesting

### Phase 4: Advanced Features & Polish

**Goal**: Add advanced features and polish the Build Mode experience

**Key Files**:
- `src/client/game/ui/BuildModeTutorial.ts` (new)
- `src/client/game/utils/LevelValidator.ts` (new)
- `src/client/game/data/levelTemplates.json` (new)

**Features**:
- Tutorial system for new users
- Level validation to check for issues
- Camera controls (zoom, pan)
- Visual themes and environment options

### Phase 5: Integration & Community Features

**Goal**: Integrate with the main game and add community features

**Key Files**:
- `src/client/game/scenes/MainMenu.ts` (modify)
- `src/client/game/api.ts` (modify)
- `src/server/routes/buildMode.ts` (new)

**Features**:
- Main menu integration
- Level sharing with other players
- Rating and favoriting system
- Level challenges and achievements
- Leaderboards for custom levels

## Acceptance Testing

Each phase includes specific acceptance criteria documented in the issue templates. Generally, each feature should:

1. **Function correctly** without errors
2. **Maintain performance** within acceptable limits
3. **Be accessible** via proper UI/UX design
4. **Preserve existing functionality** of the game
5. **Include documentation** for both users and developers

## Development Timeline

**Estimated effort by phase:**

| Phase | Description | Estimated Effort |
|-------|-------------|-----------------|
| 1 | Core Framework | 1-2 weeks |
| 2 | Entity Placement | 2-3 weeks |
| 3 | Level Management | 1-2 weeks |
| 4 | Advanced Features | 2-3 weeks |
| 5 | Community Features | 2-3 weeks |

Total estimated timeline: 8-13 weeks depending on developer availability and scope adjustments.

## Git Workflow

1. **Issue Creation**: Use the provided issue templates in `.github/ISSUE_TEMPLATE/`
2. **Branching Strategy**: Create feature branches from `main` using format `feature/build-mode-phaseX`
3. **Pull Requests**: Use the PR template in `.github/PULL_REQUEST_TEMPLATE/build-mode-feature.md`
4. **Reviews**: Each PR requires code review before merging
5. **Testing**: All acceptance criteria must be met before merging

## Machine-Readable Summary

```json
{
  "feature": "Build Mode",
  "version": "1.0.0",
  "description": "Level editor for Galaxy Explorer",
  "phases": [
    {
      "id": 1,
      "name": "Core Framework & Data Structure",
      "status": "planned",
      "estimatedEffort": "1-2 weeks",
      "key_files": [
        "src/client/game/scenes/BuildModeScene.ts",
        "src/client/game/ui/BuildModeUI.ts",
        "src/client/game/entities/BuildModeManager.ts",
        "src/shared/types/buildMode.ts"
      ]
    },
    {
      "id": 2,
      "name": "Entity Placement & Properties",
      "status": "planned",
      "estimatedEffort": "2-3 weeks",
      "key_files": [
        "src/client/game/factories/BuildModeEntityFactory.ts",
        "src/client/game/ui/PropertyEditor.ts",
        "src/client/game/ui/BuildModeToolbar.ts"
      ]
    },
    {
      "id": 3,
      "name": "Level Management & Testing",
      "status": "planned",
      "estimatedEffort": "1-2 weeks",
      "key_files": [
        "src/client/game/ui/LevelBrowser.ts",
        "src/client/game/utils/LevelStorage.ts",
        "src/client/game/scenes/LevelTestScene.ts"
      ]
    },
    {
      "id": 4,
      "name": "Advanced Features & Polish",
      "status": "planned",
      "estimatedEffort": "2-3 weeks",
      "key_files": [
        "src/client/game/ui/BuildModeTutorial.ts",
        "src/client/game/utils/LevelValidator.ts",
        "src/client/game/data/levelTemplates.json"
      ]
    },
    {
      "id": 5,
      "name": "Integration & Community Features",
      "status": "planned",
      "estimatedEffort": "2-3 weeks",
      "key_files": [
        "src/client/game/scenes/MainMenu.ts",
        "src/client/game/api.ts",
        "src/server/routes/buildMode.ts"
      ]
    }
  ],
  "featureFlags": [
    {
      "name": "ENABLE_BUILD_MODE",
      "description": "Master toggle for Build Mode features",
      "default": false
    },
    {
      "name": "ENABLE_LEVEL_SHARING",
      "description": "Toggle for level sharing functionality",
      "default": false
    }
  ],
  "schema": "src/shared/types/buildMode.ts",
  "issueTemplates": ".github/ISSUE_TEMPLATE/",
  "prTemplate": ".github/PULL_REQUEST_TEMPLATE/build-mode-feature.md"
}
```
