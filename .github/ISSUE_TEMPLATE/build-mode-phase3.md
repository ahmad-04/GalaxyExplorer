# Issue: Build Mode Phase 3 - Level Management & Testing

## Description
Implement level management and testing capabilities for Build Mode.

## Implementation Phase
Phase 3

## Tasks
- [ ] Implement local storage for levels
- [ ] Create a level browser UI
- [ ] Add import/export functionality for levels (JSON)
- [ ] Implement a "Test Level" feature
- [ ] Add level metadata editing (name, description, difficulty)

## Technical Details
- Use browser localStorage for client-side level storage
- Export/import should validate JSON against the schema
- Test Level feature should transition to game mode with custom level

## Acceptance Criteria
- [ ] Levels can be saved to localStorage and retrieved
- [ ] Level browser UI allows browsing, selecting, and deleting saved levels
- [ ] Levels can be exported as JSON files and imported from JSON files
- [ ] "Test Level" button launches the current level in game mode
- [ ] Level metadata can be edited and is properly saved

## Files to Modify
- Create: `src/client/game/ui/LevelBrowser.ts`
- Create: `src/client/game/utils/LevelStorage.ts`
- Create: `src/client/game/scenes/LevelTestScene.ts`
- Modify: `src/client/game/scenes/BuildModeScene.ts`
- Modify: `src/client/game/scenes/StarshipScene.ts` (to load custom levels)

## Testing Instructions
1. Create and save a level
2. Browse saved levels and load one
3. Export a level to JSON and import it back
4. Test a custom level in game mode
5. Edit level metadata and verify it's saved correctly
