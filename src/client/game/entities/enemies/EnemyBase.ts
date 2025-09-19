import * as Phaser from 'phaser';
import type { EnemyDefinition } from './definitions';
import type { EnemyProjectiles } from './EnemyProjectiles';

export class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  private def: EnemyDefinition;
  private sceneRef: Phaser.Scene;
  private hp: number;
  private nextFireAt = 0;
  private sineT = 0;
  private remainingIntervalShots?: number; // for interval pattern totalShots tracking
  private retreating: boolean = false;
  private retreatDelayUntil: number = 0;
  // Optional weapons overlay (separate Aseprite sheet like 'kla_torpedo_weapons')
  private weaponsOverlay: Phaser.GameObjects.Sprite | null = null;
  private weaponsKey?: string; // texture key for overlay
  private weaponsFrameNames?: string[]; // sorted frame names for overlay
  private weaponsHoldMs: number = 220; // pause after shot sequence before next sequence (e.g., death)
  private scriptState?: {
    kind: 'burstAtTop';
    topY: number;
    shots: number;
    intervalMs: number;
    afterSpeed: number;
    state: 'approach' | 'burst' | 'exit' | 'selfdestruct' | 'done';
    nextAt: number;
    shotsDone: number;
  };

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDefinition) {
    super(scene, x, y, def.key);
    this.sceneRef = scene;
    this.def = def;
    this.hp = def.hp;
  }

  spawn(): this {
    this.sceneRef.add.existing(this);
    this.sceneRef.physics.add.existing(this);
    this.setActive(true).setVisible(true);

    // Optional scale and initial angle
    if (this.def.scale) this.setScale(this.def.scale);
    if (typeof this.def.angleDeg === 'number') this.setAngle(this.def.angleDeg);

    // Body sizing (after scale/angle)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const radius = this.def.bodyRadius ?? Math.min(this.displayWidth, this.displayHeight) * 0.35;
    body.setCircle(radius, (this.width - radius * 2) / 2, (this.height - radius * 2) / 2);

    // If hover with a topY ceiling, place them exactly at that Y on spawn
    if ((this.def.movement as any)?.type === 'hover' && typeof (this.def.movement as any)?.topY === 'number') {
      const topY = (this.def.movement as any).topY as number;
      this.y = topY;
    }

    // Anim
    const moveKey = this.def.anim.move || this.def.anim.idle;
    if (moveKey && this.sceneRef.anims.exists(moveKey)) this.play({ key: moveKey, repeat: -1 });

  // Optional weapons overlay (derive key if texture exists)
  this.initWeaponsOverlay();

    // Initialize optional simple script behavior
    if (this.def.script && this.def.script.type === 'burstAtTop') {
      this.scriptState = {
        kind: 'burstAtTop',
        topY: this.def.script.topY,
        shots: this.def.script.shots,
        intervalMs: this.def.script.intervalMs,
        afterSpeed: this.def.script.afterSpeed,
        state: 'approach',
        nextAt: 0,
        shotsDone: 0,
      };
    }

    // Initialize remaining shots and start delay for interval pattern if configured
    if (this.def.fire && this.def.fire.type === 'interval') {
      if (typeof this.def.fire.totalShots === 'number') {
        this.remainingIntervalShots = Math.max(0, this.def.fire.totalShots);
      }
      if (typeof this.def.fire.startDelayMs === 'number') {
        this.nextFireAt = this.sceneRef.time.now + Math.max(0, this.def.fire.startDelayMs);
      }
    }

    return this;
  }

  takeDamage(d: number): boolean {
    this.hp -= d;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    const hitKey = this.def.anim.hit;
    if (hitKey && this.anims) {
      try { this.play(hitKey); } catch {}
    }
    return false;
  }

  // Score for destroying this enemy (for UI/awards)
  getScore(): number {
    return this.def.score ?? 0;
  }

  private pickDeathAnimKey(explicit?: string): { animKey?: string; baseTexKey?: string } {
    const s = this.sceneRef;
    const exists = (k?: string) => !!k && s.anims.exists(k);
    const deathKey = explicit || this.def.anim.death;
    // Derive base texture key from explicit animation key if looks like `${texKey}_Tag`
    const baseTexKey = deathKey ? deathKey.split('_').slice(0, -1).join('_') : undefined;

    // Priority candidates
    const candidates: string[] = [];
    if (deathKey) candidates.push(deathKey);
    if (baseTexKey) {
      candidates.push(`${baseTexKey}_Death`, `${baseTexKey}_death`, `${baseTexKey}_Explode`, `${baseTexKey}_explode`);
    }

    for (const k of candidates) {
      if (exists(k)) return { animKey: k, baseTexKey: baseTexKey || this.texture.key };
    }

    // Broad search: any animation that starts with baseTexKey_ and includes 'death' (case-insensitive)
    const keys: string[] = [];
    try {
      const mgr: any = s.anims as any;
      const animsMap: any = mgr?.anims;
      if (animsMap && typeof animsMap.keys === 'function') {
        for (const k of animsMap.keys()) keys.push(k);
      } else if (Array.isArray(mgr?.anims)) {
        // Rare case: if it's an array-like
        for (const a of mgr.anims) if (a && typeof a.key === 'string') keys.push(a.key);
      }
    } catch {
      // ignore
    }
    if (baseTexKey && keys.length > 0) {
      for (const key of keys) {
        if (key.startsWith(baseTexKey + '_') && /death/i.test(key)) {
          return { animKey: key, baseTexKey };
        }
      }
      // Or just pick the first animation for that sheet
      for (const key of keys) {
        if (key.startsWith(baseTexKey + '_')) {
          return { animKey: key, baseTexKey };
        }
      }
    }

  return { baseTexKey: baseTexKey || this.texture.key };
  }

  private playDeathFx(explicitAnimKey?: string) {
    const { animKey, baseTexKey } = this.pickDeathAnimKey(explicitAnimKey);
    if (!animKey) return;
    const fx = this.sceneRef.add.sprite(this.x, this.y, baseTexKey || this.texture.key);
    // Match the scale of the enemy (e.g., torpedo ship at 1.5)
    fx.setScale(this.scaleX, this.scaleY);
    // Match rotation so destruction isn't upside down for rotated enemies (e.g., fighter at 180°)
    fx.setAngle(this.angle);
    try {
      fx.play({ key: animKey, repeat: 0 });
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    } catch {
      this.sceneRef.time.delayedCall(800, () => fx.destroy());
    }
  }

  private die() {
    this.playDeathFx(this.def.anim.death);
    // Cleanup overlay
  if (this.weaponsOverlay) { this.weaponsOverlay.destroy(); this.weaponsOverlay = null; }
    this.destroy();
  }

  override update(time: number, delta: number, player?: Phaser.Physics.Arcade.Sprite) {
    // Keep overlay in sync
    this.syncWeaponsOverlay();
    if (this.handleRetreat(time)) return;
    if (this.updateScript(time, delta)) return;
    
    // Always apply the movement pattern first
    this.updateMovement(delta);
    
    // Check if this enemy has a target Y position (used by Build Mode/Custom levels)
    const targetY = this.getData('targetY');
    if (targetY !== undefined && this.y < targetY) {
      // First approach: log the initial movement
      if (this.getData('approaching') === undefined) {
        console.log(`[Enemy] Approaching target position y=${targetY} from y=${this.y}`);
        this.setData('approaching', true);
      }
      
      // Apply a Y-velocity adjustment to approach the target Y position
      // Override vertical velocity component to avoid movement patterns interfering with approach
      const body = this.body as Phaser.Physics.Arcade.Body;
      const approachSpeed = 180; // pixels per second
      
      // Preserve horizontal velocity component from movement pattern
      const vx = body.velocity.x;
      body.setVelocity(vx, approachSpeed);
      
      if (this.y >= targetY) {
        this.y = targetY; // Snap to exact position when reached
        this.setData('reachedTargetY', true);
        // Resume original movement pattern after reaching target
        this.updateMovement(delta);
      }
      
      // Return true to skip default movement pattern during approach
      return;
    }
    
    // Only start firing when on-screen
    if (this.y > 0) {
      this.updateFire(time, player);
    }
  }

  private handleRetreat(time: number): boolean {
    if (!this.retreating) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.retreatDelayUntil > time) {
      body.setVelocity(0, 0);
      return true;
    }
    body.setVelocity(0, -((this.def.retreatAfterShots?.speed) ?? 120));
    if (this.y < -50) {
      if (this.weaponsOverlay) { this.weaponsOverlay.destroy(); this.weaponsOverlay = null; }
      this.destroy();
    }
    return true;
  }

  private updateScript(time: number, _delta: number): boolean {
    if (!this.scriptState) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const s = this.scriptState;
    const shootAnim = () => {
      const k = this.def.anim.shoot;
      if (k && this.sceneRef.anims.exists(k)) {
        try { this.play(k); } catch {}
      }
    };

    if (s.state === 'approach') {
      // Move down until reaching topY, then stop and start burst
      const approachSpeed = (this.def.movement as any)?.speed ?? 80;
      body.setVelocity(0, approachSpeed);
      if (this.y >= s.topY) {
        body.setVelocity(0, 0);
        s.state = 'burst';
        s.nextAt = time; // fire first shot immediately
        s.shotsDone = 0;
      }
      return true;
    }

    if (s.state === 'burst') {
      body.setVelocity(0, 0);
      if (time >= s.nextAt && s.shotsDone < s.shots) {
        // Fire aimed snapshot at player's current position
        this.fireProjectile({ aimed: true });
        shootAnim();
        this.playWeaponsShootStep(s.shotsDone); // 0-based index
        s.shotsDone += 1;
        s.nextAt = time + s.intervalMs;
      }
      if (s.shotsDone >= s.shots) {
        // Begin self-destruct with a short hold to keep final frame visible
        s.state = 'selfdestruct';
        s.nextAt = time + this.weaponsHoldMs;
      }
      return true;
    }

    if (s.state === 'exit') {
      // Legacy path retained (not used now): move down to exit
      body.setVelocity(0, s.afterSpeed);
      return true;
    }

    if (s.state === 'selfdestruct') {
      body.setVelocity(0, 0);
      if (time >= s.nextAt) {
        this.playDeathFx(this.def.anim.death);
        if (this.weaponsOverlay) { this.weaponsOverlay.destroy(); this.weaponsOverlay = null; }
        this.destroy();
        s.state = 'done';
      }
      return true;
    }

    return false;
  }

  private updateMovement(delta: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const m = this.def.movement;
    switch (m.type) {
      case 'straight': {
        body.setVelocity(0, m.speed);
        break;
      }
      case 'sine': {
        this.sineT += (delta / 1000) * m.frequency * Math.PI * 2;
        const vx = Math.sin(this.sineT) * m.amplitude * 10;
        body.setVelocity(vx, m.speed);
        break;
      }
      case 'hover': {
        // If a topY ceiling is provided, hard-lock to that Y with no vertical velocity
        const topY = (m as any).topY as number | undefined;
        if (typeof topY === 'number') {
          if (Math.abs(this.y - topY) > 0.1) this.y = topY;
          body.setVelocity(0, 0);
        } else {
          // Otherwise, drift down at configured speed
          body.setVelocity(0, m.speed);
        }
        break;
      }
      case 'dive': {
        const angle = Phaser.Math.DegToRad(m.angleDeg ?? 90);
        body.setVelocity(Math.cos(angle) * m.speed, Math.sin(angle) * m.speed);
        break;
      }
    }
  }

  private updateFire(time: number, _player?: Phaser.Physics.Arcade.Sprite) {
    const f = this.def.fire;
    if (!f || f.type === 'none') return;
    if (time < this.nextFireAt) return;

    const doShootAnim = () => {
      const k = this.def.anim.shoot;
      if (k && this.sceneRef.anims.exists(k)) {
        try { this.play(k); } catch {}
      }
    };

    if (f.type === 'interval') {
      // Respect totalShots if configured
      if (typeof this.remainingIntervalShots === 'number' && this.remainingIntervalShots <= 0) return;
      const burst = Math.max(1, f.burst ?? 1);
      for (let i = 0; i < burst; i++) {
        this.sceneRef.time.delayedCall(i * 80, () => {
          if (typeof this.remainingIntervalShots === 'number' && this.remainingIntervalShots <= 0) return;
          const args: { aimed?: boolean; spreadDeg?: number } = { aimed: !!f.aimed };
          if (typeof f.spreadDeg === 'number') args.spreadDeg = f.spreadDeg;
          this.fireProjectile(args);
          doShootAnim();
          this.playWeaponsShoot();
          if (typeof this.remainingIntervalShots === 'number') this.remainingIntervalShots -= 1;
          // If we just fired the last shot, schedule retreat if configured
          if (typeof this.remainingIntervalShots === 'number' && this.remainingIntervalShots <= 0 && this.def.retreatAfterShots) {
            this.retreating = true;
            this.retreatDelayUntil = this.sceneRef.time.now + (this.def.retreatAfterShots.delayMs ?? 0);
          }
        });
      }
      this.nextFireAt = time + f.intervalMs;
    } else if (f.type === 'torpedo') {
      this.fireProjectile({ homing: f.homing });
      doShootAnim();
      this.playWeaponsShoot();
      this.nextFireAt = time + f.intervalMs;
    } else if (f.type === 'bomb') {
      this.fireProjectile({ bomb: { gravity: f.gravity } });
      doShootAnim();
      this.playWeaponsShoot();
      this.nextFireAt = time + f.intervalMs;
    }
  }

  private fireProjectile(opts: { aimed?: boolean; spreadDeg?: number; homing?: { turnRate: number; accel: number }; bomb?: { gravity: number } }) {
    const proj = this.def.projectile;
    if (!proj) return;

    const pool = (this.sceneRef as any).enemyProjectiles as EnemyProjectiles | undefined;
    const spawnPoints = this.def.muzzleOffsets && this.def.muzzleOffsets.length > 0
      ? this.def.muzzleOffsets.map((m) => ({ x: this.x + m.x, y: this.y + m.y }))
      : [{ x: this.x, y: this.y + this.height * 0.4 }];

    const spawnOne = (sx: number, sy: number) => {
      if (pool) {
        if (opts.bomb) {
          pool.spawnBomb(sx, sy, proj.key, proj.speed, proj.lifetimeMs, opts.bomb.gravity, proj.tint, proj.scale);
        } else if (opts.homing && proj.behavior === 'homing') {
          pool.spawnHoming(sx, sy, proj.key, proj.speed, proj.lifetimeMs, opts.homing, proj.tint, proj.scale);
        } else if (opts.aimed || proj.behavior === 'aimed') {
          const target = (this.sceneRef as any).player as Phaser.Physics.Arcade.Sprite | undefined;
          pool.spawnAimed(sx, sy, proj.key, proj.speed, proj.lifetimeMs, target, proj.tint, proj.scale);
        } else if (opts.spreadDeg || proj.behavior === 'spread') {
          const spreadDeg = opts.spreadDeg ?? 18;
          pool.spawnSpread(sx, sy, proj.key, proj.speed, proj.lifetimeMs, spreadDeg, proj.tint, proj.scale);
        } else {
          pool.spawnStraight(sx, sy, proj.key, proj.speed, proj.lifetimeMs, proj.tint, proj.scale);
        }
        return;
      }

      // Fallback if pool isn't available yet (dev safety)
      const b = this.sceneRef.physics.add.image(sx, sy, proj.key);
      b.setActive(true).setVisible(true);
      (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      if (opts.bomb) {
        b.setVelocity(0, proj.speed);
        (b.body as Phaser.Physics.Arcade.Body).setGravityY(opts.bomb.gravity);
      } else if (opts.aimed) {
        const target = (this.sceneRef as any).player as Phaser.Physics.Arcade.Sprite | undefined;
        const angle = target
          ? Phaser.Math.Angle.Between(sx, sy, target.x, target.y)
          : Phaser.Math.DegToRad(90);
        b.setVelocity(Math.cos(angle) * proj.speed, Math.sin(angle) * proj.speed);
        b.setAngle(Phaser.Math.RadToDeg(angle));
      } else if (opts.spreadDeg) {
        const spread = Phaser.Math.DegToRad(opts.spreadDeg);
        const base = Phaser.Math.DegToRad(90);
        b.setVelocity(Math.cos(base) * proj.speed, Math.sin(base) * proj.speed);
        b.setAngle(Phaser.Math.RadToDeg(base));
        // extra two
        const left = this.sceneRef.physics.add.image(sx, sy + 8, proj.key);
        const right = this.sceneRef.physics.add.image(sx, sy + 8, proj.key);
        (left.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (right.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        left.setVelocity(Math.cos(base - spread) * proj.speed, Math.sin(base - spread) * proj.speed);
        right.setVelocity(Math.cos(base + spread) * proj.speed, Math.sin(base + spread) * proj.speed);
        left.setAngle(Phaser.Math.RadToDeg(base - spread));
        right.setAngle(Phaser.Math.RadToDeg(base + spread));
        this.sceneRef.time.delayedCall(proj.lifetimeMs, () => { left.destroy(); right.destroy(); });
      } else {
        b.setVelocity(0, proj.speed);
        b.setAngle(90);
      }
      if (proj.scale) b.setScale(proj.scale);
      if (proj.tint !== undefined) b.setTint(proj.tint);
      this.sceneRef.time.delayedCall(proj.lifetimeMs, () => b.destroy());
    };

    spawnPoints.forEach((p) => spawnOne(p.x, p.y));
  }

  // --- Weapons overlay helpers ---
  private deriveWeaponsKeyFromBase(baseKey: string): string | undefined {
    // Try common patterns:
    // 1) kla_torpedo_ship -> kla_torpedo_weapons
    if (baseKey.endsWith('_ship')) return baseKey.replace(/_ship$/, '_weapons');
    // 2) kla_fighter -> kla_fighter_weapons
    // 3) As a fallback also try '<base>_ship_weapons'
    // The actual existence check happens in init and will ignore non-existent keys.
    return `${baseKey}_weapons`;
  }

  private initWeaponsOverlay() {
    const baseKey = this.texture?.key as string;
    const candidates: string[] = [];
    const derived = this.deriveWeaponsKeyFromBase(baseKey);
    if (derived) candidates.push(derived);
    // Also try '<base>_ship_weapons' if base ends with _ship and previous didn't exist
    if (baseKey.endsWith('_ship')) {
      candidates.push(`${baseKey}_weapons`);
    }
    // Generic fallback
    candidates.push(`${baseKey}_weapons`);
    const wk = candidates.find((k) => this.sceneRef.textures.exists(k));
    if (!wk) return;
    this.weaponsKey = wk;
    const spr = this.sceneRef.add.sprite(this.x, this.y, wk);
    // Match transform
    spr.setScale(this.scaleX, this.scaleY);
    spr.setAngle(this.angle);
    spr.setOrigin(this.originX, this.originY);
    spr.setDepth(this.depth + 1);
    this.weaponsOverlay = spr;
    // Cache sorted frame names for per-shot frame stepping
    try {
      const tex = this.sceneRef.textures.get(wk);
      const names = tex
        .getFrameNames()
        .filter((n) => n !== '__BASE')
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (names.length > 0) this.weaponsFrameNames = names;
    } catch {}
    // Do not auto-play; will only update on shooting
  }

  private syncWeaponsOverlay() {
    if (!this.weaponsOverlay) return;
    this.weaponsOverlay.x = this.x;
    this.weaponsOverlay.y = this.y;
    // Keep transform in sync in case of changes
    if (this.weaponsOverlay.scaleX !== this.scaleX || this.weaponsOverlay.scaleY !== this.scaleY) {
      this.weaponsOverlay.setScale(this.scaleX, this.scaleY);
    }
    if (this.weaponsOverlay.angle !== this.angle) {
      this.weaponsOverlay.setAngle(this.angle);
    }
    if (this.weaponsOverlay.depth !== this.depth + 1) {
      this.weaponsOverlay.setDepth(this.depth + 1);
    }
  }

  // Play a generic shoot animation on overlay (single burst)
  private playWeaponsShoot() {
    if (!this.weaponsOverlay || !this.weaponsKey) return;
    // If we have frames, prefer just flashing the next generic frame (non-looping)
    if (this.weaponsFrameNames && this.weaponsFrameNames.length > 0) {
      // Choose a middle frame for a generic flash
      const idx = Math.min(this.weaponsFrameNames.length - 1, Math.floor(this.weaponsFrameNames.length / 2));
      const frameName = this.weaponsFrameNames[idx];
      if (frameName !== undefined) {
        try { this.weaponsOverlay.setFrame(frameName as string); } catch {}
      }
      return;
    }
    const key = this.findWeaponsShootKey();
    if (key) {
      try {
        this.weaponsOverlay.play({ key, repeat: 0 });
        const st: any = (this.weaponsOverlay as any).anims;
        if (st && typeof st.setTimeScale === 'function') st.setTimeScale(0.5); // slow down
      } catch {}
    }
  }

  // For torpedo: try to play one of Shoot1..Shoot6 steps based on index
  private playWeaponsShootStep(stepIndex: number) {
    if (!this.weaponsOverlay || !this.weaponsKey) { this.playWeaponsShoot(); return; }
    // Show only the target frame (no in-between animation)
    if (this.weaponsFrameNames && this.weaponsFrameNames.length > 0) {
      const sequence = [6, 8, 10, 12, 14, 16];
      const frameNum = sequence[Math.min(stepIndex, sequence.length - 1)] ?? 1;
      const idx = Math.max(0, Math.min(this.weaponsFrameNames.length - 1, frameNum - 1));
      const frameName = this.weaponsFrameNames[idx];
      if (frameName !== undefined) {
  try { this.weaponsOverlay.setFrame(frameName as string); } catch {}
      }
      return;
    }
    // Fallback: generic single-frame flash
    this.playWeaponsShoot();
  }

  // (Removed in-between animation path) We now directly set the shot frame per spec.

  // Find the best weapons shoot animation key for the overlay. If stepIndex is provided,
  // attempt to find a numbered variant; otherwise use a generic shoot/fire tag.
  private findWeaponsShootKey(stepIndex?: number): string | undefined {
    if (!this.weaponsKey) return undefined;
    const animsMgr: any = this.sceneRef.anims as any;
    const keys: string[] = [];
    try {
      const animsMap: any = animsMgr?.anims;
      if (animsMap && typeof animsMap.keys === 'function') {
        for (const k of animsMap.keys()) keys.push(k);
      } else if (Array.isArray(animsMgr?.anims)) {
        for (const a of animsMgr.anims) if (a && typeof a.key === 'string') keys.push(a.key);
      }
    } catch {}

    const prefix = `${this.weaponsKey}_`;
    const candidates = keys.filter((k) => k.startsWith(prefix));
    if (candidates.length === 0) return undefined;

    // Split into shoot-like and fire-like
    const shootLike = candidates.filter((k) => /shoot/i.test(k));
    const fireLike = candidates.filter((k) => /fire/i.test(k));

    // If stepIndex provided, look for numbered variants in shoot-like first, then fire-like
    const pickNumbered = (arr: string[]) => {
      if (stepIndex === undefined) return undefined;
      const n = stepIndex + 1;
      // Try ...Shoot1 and ...Shoot_1 style
      const exact = arr.find((k) => new RegExp(`_(?:.*)?(?:Shoot|shoot).*[^0-9]${n}$`).test(k) || k.endsWith(`_${n}`));
      if (exact) return exact;
      // Fallback: sort natural and pick index if in range
      const sorted = [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return sorted[stepIndex];
    };

    const numbered = pickNumbered(shootLike) || pickNumbered(fireLike);
    if (numbered && this.sceneRef.anims.exists(numbered)) return numbered;

    // Generic fallbacks
    const genericShoot = shootLike.find((k) => this.sceneRef.anims.exists(k));
    if (genericShoot) return genericShoot;
    const genericFire = fireLike.find((k) => this.sceneRef.anims.exists(k));
    if (genericFire) return genericFire;
    // Dynamic fallback: build an auto one-shot from all frames
    const auto = this.ensureAutoShootAnim();
    return auto;
  }

  // Build a one-shot animation from all frames if none of the expected Shoot/Fire tags exist
  private ensureAutoShootAnim(): string | undefined {
    if (!this.weaponsKey) return undefined;
    const autoKey = `${this.weaponsKey}__autoShoot`;
    if (this.sceneRef.anims.exists(autoKey)) return autoKey;
    try {
      const tex = this.sceneRef.textures.get(this.weaponsKey);
      if (!tex) return undefined;
      const names = tex
        .getFrameNames()
        .filter((n) => n !== '__BASE')
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (names.length === 0) return undefined;
      this.sceneRef.anims.create({
        key: autoKey,
        frames: names.map((n) => ({ key: this.weaponsKey!, frame: n })),
        frameRate: 8,
        repeat: 0,
      });
      return autoKey;
    } catch {
      return undefined;
    }
  }
}
