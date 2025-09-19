import * as Phaser from 'phaser';

export type HomingOpts = { turnRate: number; accel: number };

export class EnemyProjectiles {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private homingSet: Set<Phaser.Physics.Arcade.Sprite> = new Set();
  private homingParams: WeakMap<Phaser.Physics.Arcade.Sprite, HomingOpts> = new WeakMap();
  // Some projectile textures are authored with a different forward direction.
  // Offsets rotate the visual so it matches the velocity heading.
  private angleOffsetsDeg: Record<string, number> = {
    // Torpedo projectile appears 90° off; rotate +90 to align nose to travel
    'kla_torpedo': 90,
    // Fighter bullet also authored 90° off
    'kla_bullet': 90,
    // Big bullet shares the same orientation offset
    'kla_big_bullet': 90,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = this.scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite });
  }

  getGroup() { return this.group; }

  private getAngleOffsetDeg(key: string): number {
    return this.angleOffsetsDeg[key] ?? 0;
  }

  private tryPlayLoop(key: string, sprite: Phaser.Physics.Arcade.Sprite) {
    const move = `${key}_Move`;
    const idle = `${key}_Idle`;
    const idleLower = `${key}_idle`;
    if (this.scene.anims.exists(move)) {
      try { sprite.play({ key: move, repeat: -1 }); } catch {}
      return;
    }
    if (this.scene.anims.exists(idle)) {
      try { sprite.play({ key: idle, repeat: -1 }); } catch {}
      return;
    }
    if (this.scene.anims.exists(idleLower)) {
      try { sprite.play({ key: idleLower, repeat: -1 }); } catch {}
    }
  }

  // Initialize projectile common properties (hp, scale, tint) and return the sprite
  private initProjectile(
    b: Phaser.Physics.Arcade.Sprite,
    opts: { key: string; scale?: number; tint?: number; hp?: number }
  ) {
    b.setActive(true).setVisible(true);
    (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    if (opts.scale) b.setScale(opts.scale);
    if (opts.tint !== undefined) b.setTint(opts.tint);
    // Assign HP via DataManager (default 1)
    const hp = opts.hp ?? 1;
    b.setData('hp', hp);
    b.setData('destructible', true);
    // Try to play animation
    this.tryPlayLoop(opts.key, b);
    return b;
  }

  // Apply 1 damage to a projectile; return true if destroyed
  damageProjectile(b: Phaser.GameObjects.GameObject, dmg: number = 1): boolean {
    const sprite = b as Phaser.Physics.Arcade.Sprite;
    if (!sprite || !sprite.active) return false;
    if (!sprite.getData('destructible')) return false;
    const hp = (sprite.getData('hp') as number) ?? 1;
    const next = hp - dmg;
    if (next <= 0) {
      sprite.destroy();
      return true;
    }
    sprite.setData('hp', next);
    return false;
  }

  spawnStraight(x: number, y: number, key: string, speed: number, lifetimeMs: number, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!b) return;
  this.initProjectile(b, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
    b.setVelocity(0, speed);
    b.setAngle(90 + this.getAngleOffsetDeg(key));
    const H = this.scene.scale.height;
    const timeToBottom = ((H + 40) - y) / Math.max(1, speed) * 1000;
    const life = Math.max(lifetimeMs, timeToBottom);
    this.scene.time.delayedCall(life, () => b.destroy());
  }

  spawnAimed(x: number, y: number, key: string, speed: number, lifetimeMs: number, target?: Phaser.GameObjects.Sprite, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!b) return;
  this.initProjectile(b, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
    const angle = target ? Phaser.Math.Angle.Between(x, y, target.x, target.y) : Phaser.Math.DegToRad(90);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    b.setVelocity(vx, vy);
  b.setAngle(Phaser.Math.RadToDeg(angle) + this.getAngleOffsetDeg(key));
    const H = this.scene.scale.height;
    const timeToBottom = vy > 0 ? ((H + 40) - y) / Math.max(1, vy) * 1000 : lifetimeMs;
    const life = Math.max(lifetimeMs, timeToBottom);
    this.scene.time.delayedCall(life, () => b.destroy());
  }

  spawnSpread(x: number, y: number, key: string, speed: number, lifetimeMs: number, spreadDeg: number, tint?: number, scale?: number) {
    const center = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!center) return;
  this.initProjectile(center, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
    const base = Phaser.Math.DegToRad(90);
    center.setVelocity(Math.cos(base) * speed, Math.sin(base) * speed);
    center.setAngle(90 + this.getAngleOffsetDeg(key));
    const left = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    const right = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    (left.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (right.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  this.initProjectile(left, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
  this.initProjectile(right, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
    const spread = Phaser.Math.DegToRad(spreadDeg);
    const lvx = Math.cos(base - spread) * speed;
    const lvy = Math.sin(base - spread) * speed;
    const rvx = Math.cos(base + spread) * speed;
    const rvy = Math.sin(base + spread) * speed;
    left.setVelocity(lvx, lvy);
    right.setVelocity(rvx, rvy);
  left.setAngle(Phaser.Math.RadToDeg(base - spread) + this.getAngleOffsetDeg(key));
  right.setAngle(Phaser.Math.RadToDeg(base + spread) + this.getAngleOffsetDeg(key));
    const H = this.scene.scale.height;
    const tCenter = ((H + 40) - y) / Math.max(1, speed) * 1000;
    const tLeft = lvy > 0 ? ((H + 40) - y) / Math.max(1, lvy) * 1000 : lifetimeMs;
    const tRight = rvy > 0 ? ((H + 40) - y) / Math.max(1, rvy) * 1000 : lifetimeMs;
    this.scene.time.delayedCall(Math.max(lifetimeMs, tCenter), () => center.destroy());
    this.scene.time.delayedCall(Math.max(lifetimeMs, tLeft), () => left.destroy());
    this.scene.time.delayedCall(Math.max(lifetimeMs, tRight), () => right.destroy());
  }

  spawnHoming(x: number, y: number, key: string, speed: number, lifetimeMs: number, homing: HomingOpts, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!b) return;
  this.initProjectile(b, { key, ...(scale !== undefined ? { scale } : {}), ...(tint !== undefined ? { tint } : {}), hp: 1 });
    b.setVelocity(0, speed * 0.5);
    b.setAngle(90);
    this.homingSet.add(b);
    this.homingParams.set(b, homing);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  spawnBomb(x: number, y: number, key: string, speed: number, lifetimeMs: number, gravity: number, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!b) return;
    b.setActive(true).setVisible(true);
    const body = (b.body as Phaser.Physics.Arcade.Body);
    body.setAllowGravity(true);
    body.setGravityY(gravity);
    b.setVelocity(0, speed);
    if (scale) b.setScale(scale);
    if (tint !== undefined) b.setTint(tint);
    this.tryPlayLoop(key, b);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  update(_time: number, _delta: number, player?: Phaser.Physics.Arcade.Sprite) {
    // Simple homing steering toward player
    const H = this.scene.scale.height;
    const W = this.scene.scale.width;

    // Out-of-bounds cleanup for all projectiles
    this.group.getChildren().forEach((child) => {
      const proj = child as Phaser.Physics.Arcade.Sprite;
      if (!proj.active) return;
      if (proj.y > H + 60 || proj.y < -60 || proj.x < -60 || proj.x > W + 60) {
        proj.destroy();
      }
    });

    if (!player) return;
    const toRemove: Phaser.Physics.Arcade.Sprite[] = [];
    this.homingSet.forEach((proj) => {
      if (!proj.active) { toRemove.push(proj); return; }
      const params = this.homingParams.get(proj);
      if (!params) return;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      const desiredAngle = Phaser.Math.Angle.Between(proj.x, proj.y, player.x, player.y);
      const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
      const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, params.turnRate);
      const speed = Math.hypot(body.velocity.x, body.velocity.y) + params.accel;
      body.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
      const key = (proj.texture?.key as string) || '';
      proj.setAngle(Phaser.Math.RadToDeg(newAngle) + this.getAngleOffsetDeg(key));
    });
    toRemove.forEach((p) => this.homingSet.delete(p));
  }
}
