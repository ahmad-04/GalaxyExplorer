# Scout Engine Animation - Debug & Fix

## Issue

Engine sprite was appearing but not animating.

## Root Cause

The animation wasn't being played because:

1. Animation key naming might not match expected patterns
2. No fallback if named animations don't exist
3. Insufficient debugging to see what's available

## Solution Applied

### Enhanced `initEngineOverlay()` Method

**Added Features:**

1. **Multiple Animation Key Patterns**

   ```typescript
   const animPatterns = [
     `${engineKey}_Move`, // kla_scout_engine_Move
     `${engineKey}_Idle`, // kla_scout_engine_Idle
     `${engineKey}_Thrust`, // kla_scout_engine_Thrust
     `${engineKey}_Power`, // kla_scout_engine_Power
     `${engineKey}_move`, // lowercase variants
     `${engineKey}_idle`,
     `${engineKey}_thrust`,
     `${engineKey}_power`,
     engineKey, // kla_scout_engine (raw key)
   ];
   ```

2. **Debug Logging (Scout Only)**

   ```typescript
   console.log('🔥 Engine overlay created for:', baseKey);
   console.log('🔥 Engine key:', engineKey);
   console.log('🔥 Looking for animations...');
   ```

3. **Fallback Animation Creation**

   - If no named animation exists, creates one from frames
   - Uses all frames from the sprite sheet
   - Frame rate: 10 FPS
   - Loops infinitely

   ```typescript
   const fallbackKey = `${engineKey}_auto`;
   this.sceneRef.anims.create({
     key: fallbackKey,
     frames: frameObjs,
     frameRate: 10,
     repeat: -1,
   });
   ```

4. **Success/Failure Logging**
   ```
   ✅ Engine animation playing: kla_scout_engine_Move
   OR
   ⚠️ No engine animation found. Checking texture frames...
   💡 Creating fallback frame-by-frame animation...
   ✅ Fallback animation playing: kla_scout_engine_auto
   ```

## What to Look For

### Console Output (When Scout Spawns):

**Scenario 1: Named Animation Found**

```
🛸 Scout spawned: { position: {...}, ... }
🔥 Engine overlay created for: kla_scout
🔥 Engine key: kla_scout_engine
🔥 Looking for animations...
✅ Engine animation playing: kla_scout_engine_Move
```

**Scenario 2: Fallback Animation Created**

```
🛸 Scout spawned: { position: {...}, ... }
🔥 Engine overlay created for: kla_scout
🔥 Engine key: kla_scout_engine
🔥 Looking for animations...
⚠️ No engine animation found. Checking texture frames...
📦 Available frames: 8
💡 Creating fallback frame-by-frame animation...
✅ Fallback animation playing: kla_scout_engine_auto
```

**Scenario 3: No Animation or Frames**

```
🛸 Scout spawned: { position: {...}, ... }
🔥 Engine overlay created for: kla_scout
🔥 Engine key: kla_scout_engine
🔥 Looking for animations...
⚠️ No engine animation found. Checking texture frames...
📦 Available frames: 1
(No fallback created - static sprite will show)
```

## Expected Result

After this fix, you should see:

- ✅ Engine sprite behind Scout
- ✅ Engine animation playing (flickering/pulsing/moving)
- ✅ Engine following Scout's sine-wave movement
- ✅ Console logs showing which animation is playing

## Troubleshooting

### If Engine Still Not Animating:

1. **Check Console Logs**

   - Look for `🔥 Engine overlay created` messages
   - Check if animation is playing or fallback is being created
   - Look for `📦 Available frames` count

2. **Check Asset Export**

   - Verify `kla_scout_engine.json` has animation tags
   - Verify `kla_scout_engine.png` has multiple frames
   - Check if Aseprite exported with tags enabled

3. **Manual Animation Check**

   - Open browser console
   - Type: `game.scene.scenes[0].anims.anims`
   - Look for entries starting with `kla_scout_engine`

4. **Frame Count**
   - If only 1 frame exists, animation won't play (nothing to animate)
   - Need at least 2 frames for animation

## Asset Requirements

For engine animation to work:

### Minimum (Static):

- `kla_scout_engine.png` - Single frame
- `kla_scout_engine.json` - Frame metadata
- **Result:** Static engine sprite (no animation)

### Ideal (Animated):

- `kla_scout_engine.png` - Multiple frames (4-8 frames)
- `kla_scout_engine.json` - With animation tags (Move, Idle, etc.)
- **Result:** Animated engine with smooth transitions

### Aseprite Export Settings:

```
✅ Export as Sprite Sheet
✅ Enable "Output File" (.png)
✅ Enable "JSON Data" (.json)
✅ Sheet Type: "Packed" or "By Rows"
✅ Include Tags in JSON
✅ Tag names: Move, Idle, Thrust, or Power
```

## Animation Priority

The system tries animations in this order:

1. `Move` - Preferred for moving enemies
2. `Idle` - Fallback for stationary
3. `Thrust` - Alternative move animation
4. `Power` - Alternative active animation
5. **Fallback** - Auto-generated from frames

## Performance

- ✅ Minimal overhead (just one sprite play call)
- ✅ Fallback animation created once, reused
- ✅ No impact on frame rate
- ✅ Memory efficient

## Next Steps

1. **Run the game** with Scout debug mode
2. **Watch console** for engine logs
3. **Verify animation** is playing visually
4. **Report findings**:
   - Which scenario occurred? (Named anim, Fallback, or Static)
   - Frame count from console
   - Is animation visible?

## File Modified

```
c:\Github_projects\galaxytester0982\src\client\game\entities\enemies\EnemyBase.ts
  - Enhanced initEngineOverlay() method
  - Added debug logging for Scout engines
  - Added fallback animation creation
  - Added multiple animation key pattern matching
```

## Status

✅ **Fix Applied**
🔍 **Ready for Testing**
📊 **Debug Logging Active**
