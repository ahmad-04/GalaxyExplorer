import { Enemy, EnemyType } from '../Enemy';
import * as Phaser from 'phaser';

/**
 * EliteGunship - Enemy that shoots at the player
 * Fires projectiles and has moderate health
 */
export class EliteGunship extends Enemy {
  private shootCooldown: number = 2000; // Time between shots
  private lastShootTime: number = 0;

  /**
   * Create a new Elite Gunship enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy_gunship') {
    // Fall back to regular enemy texture if gunship texture doesn't exist
    if (!scene.textures.exists(texture)) {
      console.log(`[EliteGunship] Texture ${texture} not found, falling back to enemy`);
      texture = 'enemy';
    }

    super(scene, x, y, texture);

    // Set gunship properties
    this.hp = 2;
    this.baseSpeed = 80; // Slower than basic enemy
    this.points = 30;
    this.enemyType = EnemyType.GUNSHIP;

    // Set tint to visually distinguish (purple color)
    this.setTint(0x8800ff);

    // Make it slightly larger than standard enemies
    this.setScale(1.2);

    console.log(`[EliteGunship] Created at (${x}, ${y}) with ${this.hp} HP`);
  }

  /**
   * Setup movement pattern - slower with pauses to shoot
   * @param speedMultiplier - Factor to adjust speed based on game difficulty
   * @param difficultyLevel - Current difficulty level
   */
  setupMovement(speedMultiplier: number, difficultyLevel: number): void {
    // Lower base speed range
    const baseSpeed = Phaser.Math.Between(60, 90);
    const finalSpeed = baseSpeed * speedMultiplier + 15 * (difficultyLevel - 1);

    // Set vertical velocity
    this.setVelocity(0, finalSpeed);

    // Create slow side-to-side movement
    this.movementTween = this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-100, 100),
      yoyo: true,
      duration: 2000, // Slower changes in direction
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    console.log(`[EliteGunship] Movement setup with speed: ${finalSpeed}`);
  }

  /**
   * Check if this gunship can shoot based on cooldown
   * @param time - Current game time
   * @returns true if the gunship can shoot
   */
  canShoot(time: number): boolean {
    return time > this.lastShootTime + this.shootCooldown;
  }

  /**
   * Reset the shooting cooldown
   * @param time - Current game time
   */
  resetShootCooldown(time: number): void {
    this.lastShootTime = time;
    console.log(`[EliteGunship] Shot fired, cooldown reset at time ${time}`);
  }

  /**
   * Process a hit on this enemy
   * Override to add visual damage states
   */
  override hit(): boolean {
    console.log(`[EliteGunship] Hit! HP: ${this.hp} -> ${this.hp - 1}`);
    this.hp--;

    // Update visual appearance based on damage
    if (this.hp === 1) {
      this.setTint(0x550088); // Damaged state
      console.log(`[EliteGunship] Showing damaged state`);

      // Flash effect
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.7 },
        duration: 150,
        yoyo: true,
        repeat: 2,
      });
    }

    return this.hp <= 0;
  }

  /**
   * Update method called every frame
   * NOTE: The actual shooting is handled in the scene update
   */
  override update(time: number, _delta: number): void {
    // Check if we can shoot, but actual shooting is done in the scene
    if (this.canShoot(time)) {
      // Scene will check this and handle the shooting
      // This approach avoids creating bullet objects here which would
      // need to be added to the scene's physics groups
    }
  }
}
