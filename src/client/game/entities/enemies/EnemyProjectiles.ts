import * as Phaser from 'phaser';

export type HomingOpts = { turnRate: number; accel: number };

export class EnemyProjectiles {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private homingSet: Set<Phaser.Physics.Arcade.Image> = new Set();
  private homingParams: WeakMap<Phaser.Physics.Arcade.Image, HomingOpts> = new WeakMap();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = this.scene.physics.add.group();
  }

  getGroup() { return this.group; }

  spawnStraight(x: number, y: number, key: string, speed: number, lifetimeMs: number, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    if (!b) return;
    b.setActive(true).setVisible(true);
    (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    b.setVelocity(0, speed);
    if (scale) b.setScale(scale);
    if (tint !== undefined) b.setTint(tint);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  spawnAimed(x: number, y: number, key: string, speed: number, lifetimeMs: number, target?: Phaser.GameObjects.Sprite, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    if (!b) return;
    b.setActive(true).setVisible(true);
    (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    const angle = target ? Phaser.Math.Angle.Between(x, y, target.x, target.y) : Phaser.Math.DegToRad(90);
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (scale) b.setScale(scale);
    if (tint !== undefined) b.setTint(tint);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  spawnSpread(x: number, y: number, key: string, speed: number, lifetimeMs: number, spreadDeg: number, tint?: number, scale?: number) {
    const center = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    if (!center) return;
    center.setActive(true).setVisible(true);
    (center.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    const base = Phaser.Math.DegToRad(90);
    center.setVelocity(Math.cos(base) * speed, Math.sin(base) * speed);
    if (scale) center.setScale(scale);
    if (tint !== undefined) center.setTint(tint);
    const left = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    const right = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    (left.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (right.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    const spread = Phaser.Math.DegToRad(spreadDeg);
    left.setVelocity(Math.cos(base - spread) * speed, Math.sin(base - spread) * speed);
    right.setVelocity(Math.cos(base + spread) * speed, Math.sin(base + spread) * speed);
    if (scale) { left.setScale(scale); right.setScale(scale); }
    if (tint !== undefined) { left.setTint(tint); right.setTint(tint); }
    this.scene.time.delayedCall(lifetimeMs, () => { center.destroy(); left.destroy(); right.destroy(); });
  }

  spawnHoming(x: number, y: number, key: string, speed: number, lifetimeMs: number, homing: HomingOpts, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    if (!b) return;
    b.setActive(true).setVisible(true);
    (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    b.setVelocity(0, speed * 0.5);
    if (scale) b.setScale(scale);
    if (tint !== undefined) b.setTint(tint);
    this.homingSet.add(b);
    this.homingParams.set(b, homing);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  spawnBomb(x: number, y: number, key: string, speed: number, lifetimeMs: number, gravity: number, tint?: number, scale?: number) {
    const b = this.group.create(x, y, key) as Phaser.Physics.Arcade.Image;
    if (!b) return;
    b.setActive(true).setVisible(true);
    const body = (b.body as Phaser.Physics.Arcade.Body);
    body.setAllowGravity(true);
    body.setGravityY(gravity);
    b.setVelocity(0, speed);
    if (scale) b.setScale(scale);
    if (tint !== undefined) b.setTint(tint);
    this.scene.time.delayedCall(lifetimeMs, () => b.destroy());
  }

  update(_time: number, _delta: number, player?: Phaser.Physics.Arcade.Sprite) {
    // Simple homing steering toward player
    if (!player) return;
    const toRemove: Phaser.Physics.Arcade.Image[] = [];
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
    });
    toRemove.forEach((p) => this.homingSet.delete(p));
  }
}
