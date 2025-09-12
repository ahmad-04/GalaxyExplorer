# Issue: Build Mode Phase 2 - Entity Placement & Properties

## Description
Implement entity placement and property editing capabilities for the Build Mode.

## Implementation Phase
Phase 2

## Tasks
- [ ] Create entity factories for all buildable objects
- [ ] Implement property editors for each entity type
- [ ] Add selection, movement, and rotation tools
- [ ] Implement undo/redo functionality
- [ ] Add entity preview/ghost visualization

## Technical Details
- Use factory pattern similar to EnemyFactory for creating build mode entities
- Property editors should dynamically update based on selected entity type
- Undo/redo should use command pattern for operation tracking

## Acceptance Criteria
- [ ] All entity types can be placed in the editor
- [ ] Entity properties can be edited via UI
- [ ] Selection tool allows selecting, moving and rotating entities
- [ ] Undo/redo functionality works for all operations
- [ ] Preview/ghost visualization shows where entities will be placed

## Files to Modify
- Create: `src/client/game/factories/BuildModeEntityFactory.ts`
- Create: `src/client/game/ui/PropertyEditor.ts`
- Create: `src/client/game/ui/BuildModeToolbar.ts`
- Create: `src/client/game/entities/buildMode/` (directory for build mode entities)
- Modify: `src/client/game/scenes/BuildModeScene.ts`

## Testing Instructions
1. Access Build Mode
2. Test placing each entity type
3. Test selecting and modifying entity properties
4. Test undo/redo on various operations
5. Verify entity movement and rotation
