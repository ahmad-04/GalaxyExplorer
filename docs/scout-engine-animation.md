# Scout Engine Animation Implementation

## Overview

Successfully implemented engine animation overlay support for Scout enemies (and all enemy types) in the Galaxy Explorer game.

## Implementation Date

October 20, 2025

## Changes Made

### 1. EnemyBase.ts - Engine Overlay System

**Location:** `src/client/game/entities/enemies/EnemyBase.ts`

#### Added Properties:

```typescript
// Optional engine overlay (separate Aseprite sheet like 'kla_scout_engine')
private engineOverlay: Phaser.GameObjects.Sprite | null = null;
private engineKey?: string; // texture key for engine overlay
```

#### Added Methods:

**`deriveEngineKeyFromBase(baseKey: string)`**

- Derives engine texture key from base sprite key
- Pattern: `kla_scout` → `kla_scout_engine`

**`initEngineOverlay()`**

- Initializes engine sprite overlay
- Positions behind main ship sprite (`depth - 1`)
- Tries multiple animation key patterns:
  - `Move` (preferred)
  - `Idle`
  - `Thrust`
  - `Power`
- Auto-plays looping engine animation

**`syncEngineOverlay()`**

- Keeps engine sprite synchronized with main sprite
- Updates position, scale, angle, depth every frame

#### Modified Methods:

**`spawn()`**

- Added engine overlay initialization before weapons overlay
- Order: Main sprite → Engine (behind) → Weapons (front)

**`update()`**

- Added engine overlay sync at start of update loop
- Runs every frame to keep engine perfectly aligned

**`die()`**

- Added engine overlay cleanup on death
- Prevents memory leaks

**`handleRetreat()`**

- Added engine overlay cleanup when retreating off-screen

**`updateScript()` (selfdestruct state)**

- Added engine overlay cleanup during scripted self-destruct

## Asset Structure

### Scout Engine Animation

**File Path:** `src/client/public/assets/Kla'ed/export/kla_scout_engine.png`
**JSON Path:** `src/client/public/assets/Kla'ed/export/kla_scout_engine.json`

**Loaded In:** `LoadingScene.ts` (line 91)

```typescript
loadAse('kla_scout_engine', 'kla_scout_engine');
```

### Animation Keys Expected

The system automatically tries these animation keys:

- `kla_scout_engine_Move` (preferred)
- `kla_scout_engine_Idle`
- `kla_scout_engine_Thrust`
- `kla_scout_engine_Power`

## Rendering Order

```
Layer 3 (Front):  Weapons Overlay (depth + 1)
Layer 2 (Middle): Main Ship Sprite (depth)
Layer 1 (Back):   Engine Overlay (depth - 1)
```

This ensures:

- ✅ Engine flames render behind ship
- ✅ Weapons render in front of ship
- ✅ Proper visual layering

## How It Works

1. **Spawn Time:**

   - Main ship sprite created
   - Engine overlay initialized if texture exists
   - Engine positioned at same coordinates as ship
   - Engine animation starts playing (looping)
   - Weapons overlay initialized (if applicable)

2. **Every Frame:**

   - `syncEngineOverlay()` called first
   - Engine position/rotation/scale updated to match ship
   - Keeps engine perfectly aligned even during movement

3. **On Death:**
   - Engine overlay destroyed
   - Main ship plays death animation
   - Weapons overlay destroyed
   - Main sprite destroyed

## Benefits

### Visual Enhancement

- ✅ Animated engine exhaust/thrust
- ✅ Makes Scouts more visually interesting
- ✅ Adds sense of motion and speed
- ✅ Professional polish

### Code Reusability

- ✅ Works for **all enemy types** (not just Scout)
- ✅ Easy to add engines to Fighter, Bomber, etc.
- ✅ Same pattern as weapons overlay
- ✅ Clean, maintainable code

### Performance

- ✅ Minimal overhead (just sprite sync)
- ✅ Proper cleanup (no memory leaks)
- ✅ Only created if texture exists
- ✅ Efficient depth management

## Extensibility

### Adding Engine to Other Enemies

To add engine animation to any enemy:

1. **Create Engine Assets:**

   ```
   assets/Kla'ed/export/kla_fighter_engine.png
   assets/Kla'ed/export/kla_fighter_engine.json
   ```

2. **Load in LoadingScene:**

   ```typescript
   loadAse('kla_fighter_engine', 'kla_fighter_engine');
   ```

3. **Create Animations:**

   - Export from Aseprite with tags: `Move`, `Idle`, `Thrust`, or `Power`
   - System automatically detects and plays them

4. **That's It!**
   - EnemyBase automatically finds and applies engine
   - No code changes needed per enemy

## Testing with Debug Mode

With debug mode enabled, you can verify:

- ✅ Engine sprite loads correctly
- ✅ Engine animation plays
- ✅ Engine stays aligned with Scout
- ✅ Engine renders behind Scout body
- ✅ Engine disappears on death
- ✅ No console errors

### Debug Console Output

Look for:

```
🛸 Scout spawned: {
  position: { x: 234, y: -60 },
  bodyRadius: 16,
  speed: 90,
  hp: 1,
  movement: 'sine'
}
```

## Visual Result

### Before:

- Scout ship only (static)
- No engine effects
- Less visual interest

### After:

- Scout ship with animated engine behind
- Visible thrust/exhaust animation
- Enhanced visual appeal
- Professional game feel

## File Changes Summary

```
Modified: src/client/game/entities/enemies/EnemyBase.ts
  + Added engineOverlay property (line 19-20)
  + Added deriveEngineKeyFromBase() method
  + Added initEngineOverlay() method (45 lines)
  + Added syncEngineOverlay() method (15 lines)
  + Modified spawn() - added engine init
  + Modified update() - added engine sync
  + Modified die() - added engine cleanup
  + Modified handleRetreat() - added engine cleanup
  + Modified updateScript() - added engine cleanup
```

## Compatibility

- ✅ Works with existing enemy system
- ✅ Backwards compatible (no engine = no overlay)
- ✅ Works with debug mode hitboxes
- ✅ Works with weapons overlay
- ✅ Works with all movement patterns
- ✅ Works with all fire patterns

## Next Steps

### Recommended Enhancements:

1. **Variable Engine Intensity**

   - Animate faster when moving faster
   - Dim when hovering/idle
   - Brighten during acceleration

2. **Engine Particles**

   - Add particle trails behind engine
   - Color-coded by enemy type
   - Fade out over distance

3. **Audio Integration**

   - Engine hum sounds
   - Volume based on speed
   - Doppler effect as enemies pass

4. **Apply to All Enemies**
   - Create engine animations for Fighter, Bomber, Torpedo, Frigate
   - Each with unique visual style
   - Different colors/shapes

## Commit Message Suggestion

```
feat: Add animated engine overlay system for all enemies

- Implement engine sprite overlay support in EnemyBase
- Engine renders behind main sprite with proper depth
- Auto-detects and plays engine animations (Move/Idle/Thrust/Power)
- Synchronized position, scale, and rotation every frame
- Proper cleanup on death, retreat, and self-destruct
- Scout engine animation now displays correctly
- Extensible to all enemy types with no code changes
- Clean separation of concerns (engine, ship, weapons layers)
```

## Status

✅ **Implementation Complete**
✅ **Ready for Testing**
✅ **Extensible for Future Enemies**
