import { Enemy, EnemyType } from '../Enemy';
import * as Phaser from 'phaser';

/**
 * ArmoredCruiser - Tanky enemy type
 * Slow but requires multiple hits to destroy
 */
export class ArmoredCruiser extends Enemy {
  /**
   * Create a new Armored Cruiser enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy_cruiser') {
    // Fall back to regular enemy texture if cruiser texture doesn't exist
    if (!scene.textures.exists(texture)) {
      console.log(`[ArmoredCruiser] Texture ${texture} not found, falling back to enemy`);
      texture = 'enemy';
    }

    super(scene, x, y, texture);

    // Set cruiser properties - more health but slower
    this.hp = 3;
    this.baseSpeed = 70; // 30% slower than basic enemy
    this.points = 25; // Higher point value
    this.enemyType = EnemyType.CRUISER;

    // Make it larger than standard enemies
    this.setScale(1.4);

    // Set tint to visually distinguish (red-orange color)
    this.setTint(0xff6600);

    console.log(`[ArmoredCruiser] Created at (${x}, ${y}) with ${this.hp} HP`);
  }

  /**
   * Setup slow, steady downward movement pattern
   * @param speedMultiplier - Factor to adjust speed based on game difficulty
   * @param difficultyLevel - Current difficulty level
   */
  setupMovement(speedMultiplier: number, difficultyLevel: number): void {
    // Lower base speed range than standard fighters
    const baseSpeed = Phaser.Math.Between(60, 100);
    const finalSpeed = baseSpeed * speedMultiplier + 15 * (difficultyLevel - 1);

    // Set vertical velocity
    this.setVelocity(0, finalSpeed);

    // Create minimal side-to-side movement
    this.movementTween = this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-60, 60),
      yoyo: true,
      duration: 1500, // Slower changes in direction
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    console.log(`[ArmoredCruiser] Movement setup with speed: ${finalSpeed}`);
  }

  /**
   * Process a hit on this enemy
   * Override to add visual damage states
   */
  override hit(): boolean {
    console.log(`[ArmoredCruiser] Hit! HP: ${this.hp} -> ${this.hp - 1}`);
    this.hp--;

    // Update visual appearance based on damage
    if (this.hp === 2) {
      this.setTint(0xaa5500); // First damage state
      console.log(`[ArmoredCruiser] Showing first damage state`);
    } else if (this.hp === 1) {
      this.setTint(0x883300); // Second damage state
      console.log(`[ArmoredCruiser] Showing second damage state`);

      // Flash effect for critical damage
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.7 },
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
    }

    return this.hp <= 0;
  }

  /**
   * Update method called every frame
   */
  override update(_time: number, _delta: number): void {
    // Cruiser uses the built-in physics and tween for movement
    // No additional logic needed per frame
  }
}
