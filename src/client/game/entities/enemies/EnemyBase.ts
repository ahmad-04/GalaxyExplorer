import * as Phaser from 'phaser';
import type { EnemyDefinition } from './definitions';
import type { EnemyProjectiles } from './EnemyProjectiles';

export class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  private def: EnemyDefinition;
  private sceneRef: Phaser.Scene;
  private hp: number;
  private nextFireAt = 0;
  private sineT = 0;

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

    // Body sizing
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const radius = this.def.bodyRadius ?? Math.min(this.displayWidth, this.displayHeight) * 0.35;
    body.setCircle(radius, (this.width - radius * 2) / 2, (this.height - radius * 2) / 2);

    // Anim
    const moveKey = this.def.anim.move || this.def.anim.idle;
    if (moveKey && this.sceneRef.anims.exists(moveKey)) this.play({ key: moveKey, repeat: -1 });

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

  private die() {
    const deathKey = this.def.anim.death;
    if (deathKey && this.sceneRef.anims.exists(deathKey)) {
      const fx = this.sceneRef.add.sprite(this.x, this.y, this.texture.key);
      try { fx.play(deathKey); } catch {}
      this.sceneRef.time.delayedCall(1000, () => fx.destroy());
    }
    this.destroy();
  }

  override update(time: number, delta: number, player?: Phaser.Physics.Arcade.Sprite) {
    this.updateMovement(delta);
    this.updateFire(time, player);
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
        // Slow drift downward
        body.setVelocity(0, m.speed);
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
      const burst = Math.max(1, f.burst ?? 1);
      for (let i = 0; i < burst; i++) {
        this.sceneRef.time.delayedCall(i * 80, () => {
          const args: { aimed?: boolean; spreadDeg?: number } = { aimed: !!f.aimed };
          if (typeof f.spreadDeg === 'number') args.spreadDeg = f.spreadDeg;
          this.fireProjectile(args);
          doShootAnim();
        });
      }
      this.nextFireAt = time + f.intervalMs;
    } else if (f.type === 'torpedo') {
      this.fireProjectile({ homing: f.homing });
      doShootAnim();
      this.nextFireAt = time + f.intervalMs;
    } else if (f.type === 'bomb') {
      this.fireProjectile({ bomb: { gravity: f.gravity } });
      doShootAnim();
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
      } else if (opts.spreadDeg) {
        const spread = Phaser.Math.DegToRad(opts.spreadDeg);
        const base = Phaser.Math.DegToRad(90);
        b.setVelocity(Math.cos(base) * proj.speed, Math.sin(base) * proj.speed);
        // extra two
        const left = this.sceneRef.physics.add.image(sx, sy + 8, proj.key);
        const right = this.sceneRef.physics.add.image(sx, sy + 8, proj.key);
        (left.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (right.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        left.setVelocity(Math.cos(base - spread) * proj.speed, Math.sin(base - spread) * proj.speed);
        right.setVelocity(Math.cos(base + spread) * proj.speed, Math.sin(base + spread) * proj.speed);
        this.sceneRef.time.delayedCall(proj.lifetimeMs, () => { left.destroy(); right.destroy(); });
      } else {
        b.setVelocity(0, proj.speed);
      }
      if (proj.scale) b.setScale(proj.scale);
      if (proj.tint !== undefined) b.setTint(proj.tint);
      this.sceneRef.time.delayedCall(proj.lifetimeMs, () => b.destroy());
    };

    spawnPoints.forEach((p) => spawnOne(p.x, p.y));
  }
}
