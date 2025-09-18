import * as Phaser from 'phaser';
import type { WeaponDefinition, MuzzleOffset } from './definitions';

export class Weapon {
  private scene: Phaser.Scene;
  private ship: Phaser.Physics.Arcade.Sprite;
  private projectiles: Phaser.Physics.Arcade.Group;
  private def: WeaponDefinition;
  private lastFired = 0;
  private fireRateMultiplier = 1;
  private weaponSprite?: Phaser.GameObjects.Sprite;
  private overlayAnimIdleKey: string | undefined;
  private overlayAnimFireKey: string | undefined;
  private overlayLooping = false;
  private overlayAnimSpeed = 2; // >1 to speed up playback
  // Cache first-frame names to avoid re-querying
  private firstFrameCache: Map<string, string | number> = new Map();

  constructor(
    scene: Phaser.Scene,
    ship: Phaser.Physics.Arcade.Sprite,
    projectiles: Phaser.Physics.Arcade.Group,
    def: WeaponDefinition
  ) {
    this.scene = scene;
    this.ship = ship;
    this.projectiles = projectiles;
    this.def = def;

    // Optional mounted weapon sprite (aseprite)
    if (def.weaponSpriteKey && this.scene.textures.exists(def.weaponSpriteKey)) {
      this.weaponSprite = this.scene.add.sprite(ship.x, ship.y, def.weaponSpriteKey);
      // Try to set origin from frame for aseprite-exported sprites
      const anySprite = this.weaponSprite as unknown as { setOriginFromFrame?: () => void };
      if (typeof anySprite.setOriginFromFrame === 'function') anySprite.setOriginFromFrame();
      else this.weaponSprite.setOrigin(0.5, 0.5);
      // Match scale to ship width heuristically (assuming ~48px base ship width)
      const scale = this.ship.displayWidth / 48;
      this.weaponSprite.setScale(scale);
  // Sit behind the ship (but above engine module)
  this.weaponSprite.setDepth(this.ship.depth - 0.5);

      // Determine animation keys but do not auto-play; start only when shooting
      const maybeIdle = `${def.weaponSpriteKey}_idle`;
      if (this.scene.anims.exists(maybeIdle)) {
        this.overlayAnimIdleKey = maybeIdle;
      } else {
        this.overlayAnimIdleKey = undefined;
      }
      // Prefer a fire animation if author provided one
      const fireCandidates = [
        `${def.weaponSpriteKey}_fire`,
        `${def.weaponSpriteKey}_shoot`,
        `${def.weaponSpriteKey}_recoil`,
      ];
      for (const k of fireCandidates) {
        if (this.scene.anims.exists(k)) {
          this.overlayAnimFireKey = k;
          break;
        }
      }
      // Default appearance is static first frame
      this.setFirstFrame(this.weaponSprite, def.weaponSpriteKey);

      // Keep aligned post physics step
      this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncToShip, this);
      this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncToShip, this);
      });
    }
  }

  setFireRateMultiplier(mult: number) {
    this.fireRateMultiplier = Math.max(0.1, mult);
  }

  tryFire(time: number) {
    const effectiveFireRate = this.def.fireRateMs * (1 / this.fireRateMultiplier);
    if (time <= this.lastFired + effectiveFireRate) return;

    // Fire from each muzzle
    for (const m of this.def.muzzleOffsets) {
      this.spawnProjectile(m);
    }

  // Visuals now handled by startFiring/stopFiring on input hold

    // Play SFX if present
    if (this.def.sfxKey && this.scene.sound) {
      try {
        const s = this.scene.sound.get(this.def.sfxKey) || this.scene.sound.add(this.def.sfxKey);
        s?.play();
      } catch {
        // ignore missing audio
      }
    }

    this.lastFired = time;
  }

  update() {
    // No-op for now; hook for future heat/recoil, etc.
  }

  destroy() {
    if (this.weaponSprite) this.weaponSprite.destroy();
  }

  private syncToShip() {
    if (!this.weaponSprite || !this.ship.active) return;
    this.weaponSprite.x = this.ship.x;
    this.weaponSprite.y = this.ship.y;
    this.weaponSprite.rotation = this.ship.rotation;
  }

  private spawnProjectile(offset: MuzzleOffset) {
    const key = this.def.projectileKey;
    // Use weapon overlay as the transform host if available; otherwise use the ship
    const host = (this.weaponSprite as Phaser.GameObjects.Sprite) || this.ship;
    // Convert local muzzle offset (defined in source pixel space) to world position
    const cos = Math.cos(host.rotation);
    const sin = Math.sin(host.rotation);
    const sx = (host as any).scaleX ?? 1;
    const sy = (host as any).scaleY ?? 1;
    const lx = offset.x * sx;
    const ly = offset.y * sy;
    const px = host.x + lx * cos - ly * sin;
    const py = host.y + lx * sin + ly * cos;
    const projectile = this.projectiles.create(px, py, key) as Phaser.Physics.Arcade.Image;
    if (!projectile || !projectile.body) return;

    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
  // Direction: fire in weapon's local "up" direction (-90deg relative to host)
  const velRad = host.rotation + Phaser.Math.DegToRad(-90);
  // Visuals: keep projectile sprite aligned with host (no extra -90 visual twist)
  projectile.setRotation(host.rotation);
    // Ensure we aren't showing the entire sheet: set first frame by name if available
    this.setFirstFrame(projectile, key);
    // If the projectile supports animations and an anim exists, play it in a loop (faster)
    try {
      const animCandidates = [
        `${key}_idle`,
        `${key}_loop`,
        `${key}_anim`,
      ];
      let animKey: string | undefined;
      for (const k of animCandidates) {
        if (this.scene.anims.exists(k)) {
          animKey = k;
          break;
        }
      }
      if (!animKey) {
        const map = (this.scene.anims as any)?.anims as Map<string, any> | undefined;
        const keyLc = key.toLowerCase();
        map?.forEach((_val: any, name: string) => {
          if (!animKey && name.toLowerCase().includes(keyLc)) animKey = name;
        });
      }
      if (animKey) {
        const anyProj = projectile as unknown as { play?: Function; anims?: { timeScale: number } };
        anyProj.play?.({ key: animKey, repeat: -1 });
        if (anyProj.anims) anyProj.anims.timeScale = 1.4;
      }
    } catch {
      // ignore anim issues
    }
    if (this.def.projectileScale) projectile.setScale(this.def.projectileScale);
    if (this.def.projectileTint !== undefined) projectile.setTint(this.def.projectileTint);
  this.scene.physics.velocityFromRotation(velRad, this.def.projectileSpeed, body.velocity);

    this.scene.time.delayedCall(this.def.projectileLifetimeMs, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  // playShootAnimation() removed in favor of startFiring/stopFiring hold behavior

  // Begin continuous firing animation while input is held
  startFiring() {
    if (!this.weaponSprite || this.overlayLooping) return;
    const key = this.overlayAnimFireKey || this.overlayAnimIdleKey;
    if (key) {
      try {
        this.weaponSprite.play({ key, repeat: -1 });
        // Speed up the animation playback
        if (this.weaponSprite.anims) this.weaponSprite.anims.timeScale = this.overlayAnimSpeed;
        this.overlayLooping = true;
      } catch {
        // ignore
      }
    }
  }

  // Stop continuous firing animation when input is released
  stopFiring() {
    if (!this.weaponSprite) return;
    try {
      this.weaponSprite.anims?.stop();
    } catch {
      // ignore
    }
    this.setFirstFrame(this.weaponSprite, this.weaponSprite.texture.key);
    this.overlayLooping = false;
  }

  // Select the first real frame for a given texture key. Falls back to numeric 0.
  private setFirstFrame(obj: Phaser.GameObjects.GameObject, texKey: string) {
    try {
      const asAny = obj as unknown as { setFrame?: (f: string | number) => void };
      if (!asAny.setFrame) return;
      let first = this.firstFrameCache.get(texKey);
      if (first === undefined) {
        const tex = this.scene.textures.get(texKey);
        // getFrameNames excludes __BASE by default? Filter defensively
        const names = tex
          .getFrameNames()
          .filter((n) => n && n !== '__BASE')
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        first = names[0] ?? 0;
        this.firstFrameCache.set(texKey, first);
      }
      asAny.setFrame(first);
    } catch {
      // ignore
    }
  }
}
