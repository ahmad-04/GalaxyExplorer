# Scout Debug Mode - Implementation Summary

## Overview

Debug mode has been implemented to focus on Scout enemy development in isolation with visual hitbox debugging.

## Changes Made

### 1. EnemyManager.ts

**Location:** `src/client/game/entities/EnemyManager.ts`

Added Scout-only spawning mode:

```typescript
// DEBUG: Force Scout-only spawning for testing
const DEBUG_SCOUT_ONLY = true;
if (DEBUG_SCOUT_ONLY) {
  const scoutDef = ENEMIES['scout'];
  if (scoutDef && this.scene.textures.exists(scoutDef.key)) {
    console.log('🛸 [DEBUG] Spawning Scout (debug mode active)');
    const kla = new EnemyBase(this.scene, x, -60, scoutDef).spawn();
    this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
    return;
  }
}
```

**What it does:**

- When `DEBUG_SCOUT_ONLY = true`, only Scout enemies spawn
- Falls back to legacy Scout if Kla'ed version unavailable
- Prevents other enemy types from spawning

### 2. StarshipScene.ts

**Location:** `src/client/game/scenes/StarshipScene.ts`

Enabled physics debug visualization:

```typescript
// DEBUG: Enable physics debug to see hitboxes
const DEBUG_MODE = true;
if (DEBUG_MODE) {
  this.physics.world.drawDebug = true;
  this.physics.world.debugGraphic.clear();
  console.log('[StarshipScene] 🔍 DEBUG MODE: Physics debug hitboxes ENABLED');
}
```

Added player hitbox color:

```typescript
// DEBUG: Set player hitbox color (cyan for player)
body.debugBodyColor = 0x00ffff;
```

**What it does:**

- Enables Phaser's built-in physics debug rendering
- Shows collision boundaries as colored outlines
- Player hitbox: Cyan (0x00ffff)
- Enemy hitboxes: Green (0x00ff00)

### 3. EnemyBase.ts

**Location:** `src/client/game/entities/enemies/EnemyBase.ts`

Added enemy hitbox color and logging:

```typescript
// DEBUG: Set hitbox color for visibility (green for enemies)
body.debugBodyColor = 0x00ff00;

// DEBUG: Log Scout creation with details
if (this.def.key && this.def.key.toLowerCase().includes('scout')) {
  console.log('🛸 Scout spawned:', {
    position: { x: this.x, y: this.y },
    bodyRadius: radius,
    speed: this.def.movement?.speed || 'N/A',
    hp: this.hp,
    movement: this.def.movement?.type || 'N/A',
  });
}
```

**What it does:**

- Sets green hitbox color for all enemies
- Logs detailed Scout spawn information to console
- Includes position, hitbox size, speed, HP, and movement type

## How to Use

### Enable Debug Mode:

1. Set `DEBUG_SCOUT_ONLY = true` in `EnemyManager.ts` (line ~162)
2. Set `DEBUG_MODE = true` in `StarshipScene.ts` (line ~259)
3. Run the game normally

### Disable Debug Mode:

1. Set `DEBUG_SCOUT_ONLY = false` in `EnemyManager.ts`
2. Set `DEBUG_MODE = false` in `StarshipScene.ts`
3. All enemy types will spawn normally, no hitboxes shown

## Visual Indicators

When debug mode is active, you'll see:

- **Cyan circular outline** around player ship (hitbox)
- **Green circular outlines** around Scout enemies (hitboxes)
- Console logs showing Scout spawn details:
  ```
  🛸 Scout spawned: {
    position: { x: 234, y: -60 },
    bodyRadius: 16,
    speed: 120,
    hp: 1,
    movement: 'sine'
  }
  ```

## Console Indicators

Look for these messages:

- `🔍 DEBUG MODE: Physics debug hitboxes ENABLED`
- `🛸 DEBUG MODE: Scout-only spawning active`
- `🛸 [DEBUG] Spawning Scout (debug mode active)`
- `🛸 Scout spawned: {...}` (with detailed stats)

## Next Steps

Now that Scout-only mode is active with debug hitboxes, you can:

1. **Observe Scout behavior** - Movement patterns, speed, evasion
2. **Test hitbox accuracy** - Ensure collision detection feels right
3. **Implement Scout characteristics** - Add unique behaviors like:
   - Enhanced evasion mechanics
   - Speed bursts
   - Zigzag patterns
   - Hit-and-run tactics
   - No weapons (pure speed/evasion)

## Scout Characteristics Ideas

Based on the codebase analysis, here are suggested Scout enhancements:

### Movement

- **Current:** Sine wave movement at 120 speed
- **Enhance:** Add dodge behavior when player bullets are nearby
- **Add:** Random speed bursts (150-200 speed for 1-2 seconds)
- **Add:** More erratic zigzag (higher frequency/amplitude)

### Behavior

- **Add:** Flee behavior when HP low
- **Add:** Circling patterns around player
- **Add:** Dive-through attacks (no shooting, just ramming threat)

### Visual

- **Add:** Cyan particle trail effect
- **Add:** Speed lines when boosting
- **Add:** Engine glow intensity changes with speed

### Stats

- **HP:** 1 (glass cannon, high risk/reward)
- **Speed:** 120-200 (variable with bursts)
- **Score:** High value (200-300 points for difficulty)
- **No weapons:** Pure mobility threat

## File Structure

```
src/client/game/
├── entities/
│   ├── EnemyManager.ts          [Scout-only toggle]
│   └── enemies/
│       └── EnemyBase.ts         [Debug hitbox + logging]
└── scenes/
    └── StarshipScene.ts         [Debug mode + player hitbox]
```

## Commit Message Suggestion

```
feat: Add Scout-only debug mode with hitbox visualization

- Enable Scout-only enemy spawning via DEBUG_SCOUT_ONLY flag
- Add physics debug rendering with color-coded hitboxes
- Player hitbox: Cyan (0x00ffff)
- Enemy hitbox: Green (0x00ff00)
- Console logging for Scout spawn details
- Prepare for Scout behavior enhancement
```
