# Issue: Build Mode Phase 1 - Core Framework & Data Structure

## Description
Implement the core framework and data structures for Build Mode.

## Implementation Phase
Phase 1

## Tasks
- [ ] Create BuildModeScene class in `src/client/game/scenes/BuildModeScene.ts`
- [ ] Implement grid system with configurable snap settings
- [ ] Create BuildModeManager class to handle state management
- [ ] Implement data serialization/deserialization for levels
- [ ] Add basic UI components for editing (place, select, delete)

## Technical Details
- Grid system should use Phaser's existing coordinate system
- BuildModeManager should manage the current editing state and selected tools
- Serialization should follow the schema defined in `src/shared/types/buildMode.ts`

## Acceptance Criteria
- [ ] BuildModeScene can be accessed and renders a grid
- [ ] Grid supports different sizes and toggleable snap-to-grid
- [ ] Basic editor UI is functional with working buttons
- [ ] Can save a simple level layout to JSON format
- [ ] Can load a saved level layout from JSON format

## Files to Modify
- Create: `src/client/game/scenes/BuildModeScene.ts`
- Create: `src/client/game/ui/BuildModeUI.ts`
- Create: `src/client/game/entities/BuildModeManager.ts`
- Modify: `src/client/game/main.ts` (add BuildModeScene)

## Testing Instructions
1. Run the game in development mode
2. Access Build Mode (may require direct scene navigation until menu is updated)
3. Verify grid renders correctly
4. Test saving and loading a simple level layout
