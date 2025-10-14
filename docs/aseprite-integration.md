# Aseprite Animations in Galaxy Explorer

This guide explains how to export from Aseprite and load animations in Phaser 3.88.2. The repo already includes Aseprite sources and export tools so you can iterate quickly.

## TL;DR

- Yes — Phaser 3.88.2 in this repo fully supports Aseprite exports.
- Export from Aseprite to a PNG spritesheet + JSON.
- Load with `this.load.aseprite(...)`, then register animations with `this.anims.createFromAseprite('key')`.
- Play by tag name: `sprite.play('Idle')` (or your tag names).

## What’s already in the repo

- Engine: Phaser `3.88.2` (see `package.json`).
- Aseprite sources under `src/client/public/assets/**` (Void_MainShip and weapons)
- Vite serves everything under `src/client/public/**` at `/` during runtime
- Export helpers in `tools/`:
  - `export-aseprite-cli.mjs`, `export-aseprite-from-png.mjs` for generating spritesheets + JSON
  - `export-kla-cli.mjs` for Kla’ed packs

## Exporting from Aseprite

You don’t load `.aseprite` files at runtime. Export a spritesheet (PNG) and a JSON metadata file.

### Recommended output paths

- Main ship exports: `src/client/public/assets/Void_MainShip/export/main_ship.png|json`
- Weapons exports: `src/client/public/assets/Void_MainShip/export/weapons/<name>.png|json`

Create those folders if they don’t exist.

### GUI export (quick)

1. Open the `.aseprite` file.
2. Define Frame Tags for each animation (e.g., `Idle`, `Thrust`, `TurnLeft`, `ShieldOn`, `ShieldLoop`, `ShieldOff`, `Explode`). Set Direction (Forward or Ping-Pong) as needed.
3. File → Export Sprite Sheet…
   - Sheet Type: Packed
   - Data: JSON Data
   - JSON Type: Array (or Hash; Phaser supports both)
   - Check “Include frame tags”
   - Options: Enable Trim and Ignore Empty (optional, recommended)
   - Export to the paths shown above

### CLI export (repeatable)

Requires Aseprite CLI on PATH. On Windows (bash.exe):

```bash
# Main ship
aseprite -b "src/client/public/assets/Void_MainShip/Main Ship/Main Ship - Fighter Design.aseprite" \
  --sheet "src/client/public/assets/Void_MainShip/export/main_ship.png" \
  --data  "src/client/public/assets/Void_MainShip/export/main_ship.json" \
  --sheet-pack --format json-array --trim --ignore-empty

# Weapons (example: Auto cannon); repeat for others
aseprite -b "src/client/public/assets/Void_MainShip/Main ship weapons/Aseprite/Main ship weapon - Projectile - Auto cannon bullet.aseprite" \
  --sheet "src/client/public/assets/Void_MainShip/export/weapons/auto_cannon.png" \
  --data  "src/client/public/assets/Void_MainShip/export/weapons/auto_cannon.json" \
  --sheet-pack --format json-array --trim --ignore-empty
```

Tips:

- Use quotes for paths with spaces.
- `--format json-array` or `json-hash` both work. `json-array` is common.
- To export only specific layers, add `--layer "<Layer Name>"` (repeatable), or toggle layer visibility in the GUI first.

## Loading and playing animations in Phaser

Use these APIs (Phaser 3.88+):

- `this.load.aseprite(key, textureURL, atlasURL)`
- `this.anims.createFromAseprite(key)`

### Preload

```ts
// In a preload-capable scene (e.g., LoadingScene.preload)
this.load.aseprite(
  'mainShip',
  '/assets/Void_MainShip/export/main_ship.png',
  '/assets/Void_MainShip/export/main_ship.json'
);
this.load.aseprite(
  'autoCannon',
  '/assets/Void_MainShip/export/weapons/auto_cannon.png',
  '/assets/Void_MainShip/export/weapons/auto_cannon.json'
);
// ...repeat for other weapons
```

### Create animations (once)

```ts
// Run once, in an early scene (e.g., LoadingScene.create or MainMenu.create)
this.anims.createFromAseprite('mainShip');
this.anims.createFromAseprite('autoCannon');
// Creates global animation keys from your Aseprite frame tags
```

### Use in-game

```ts
const ship = this.add.sprite(400, 300, 'mainShip').setOrigin(0.5, 0.5);
ship.play({ key: 'Idle', repeat: -1 }); // Tag name from Aseprite; repeat Infinity

// Later, switch state
ship.play('Thrust');
```

## Behavioral details and edge cases

- Frame durations: Phaser honors per-frame durations from Aseprite. You only need `frameRate` if you want to override them.
- Ping-pong: Aseprite tag direction is respected automatically.
- Trimming & packing: Fully supported. If you use Arcade Physics and want consistent hitboxes, call `setSize` or `setSizeToFrame()` after creating/setting the body.
- Origins/pivots: Aseprite doesn’t enforce a single pivot across frames. Set a consistent origin in Phaser, e.g. `setOrigin(0.5)`. For per-frame pivots, consider using Slices + custom logic.
- Global animation keys: `createFromAseprite` registers animations in the global manager. Pick unambiguous tag names to avoid collisions.
- Texture keys vs animation keys: The loader key (e.g., `mainShip`) is for the texture; animation keys are your tag names.

## Suggested animation tags (ship)

- Idle (engine glow minimal)
- Thrust (forward boost)
- TurnLeft / TurnRight (if directional frames exist)
- ShieldOn / ShieldLoop / ShieldOff (three-stage sequence)
- Damage (hit feedback)
- Explode (death)

## Build pipeline

Use the included Node scripts:

- Export all known Aseprite assets: `npm run export:aseprite:all`
- Export Kla’ed asset packs: `npm run export:kla:all`

See `package.json` for additional targeted export tasks.

## Troubleshooting

- 404s for PNG/JSON: Exports must reside under `src/client/public/**`; URLs resolve from `/`.
- "Animation not found": Call `this.anims.createFromAseprite('<key>')` before `sprite.play('<TagName>')` and match tag names exactly.
- White box sprite: Check that the PNG/JSON paths are correct and present in the built `dist/client/assets/...`.
- Physics bounds: Trimming changes visual bounds; set physics body size explicitly after sprite creation.

## References

- Phaser APIs: LoaderPlugin.aseprite, AnimationManager.createFromAseprite
- Aseprite: Export Sprite Sheet (GUI) and Command Line Interface

## Next steps

1. Decide and apply consistent frame tags in your `.aseprite` sources (ship and weapons).
2. Export `main_ship.png/json` and weapon projectile sheets to the recommended `export/` directories.
3. Load and register animations in your first scene.
4. Replace static images in gameplay scenes with animated sprites and play the appropriate tags (e.g., `Idle`, `Thrust`).

Once you’ve exported the first sheet, we can wire the minimal preload + `createFromAseprite` calls exactly where you want them.
