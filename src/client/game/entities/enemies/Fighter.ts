import { Enemy, EnemyType } from '../Enemy';
import * as Phaser from 'phaser';

/**
 * Fighter - Basic enemy type
 * This is the standard enemy with simple zigzag movement
 */
export class Fighter extends Enemy {
  /**
   * Create a new Fighter enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy') {
    super(scene, x, y, texture);

    // Set basic fighter properties
    this.hp = 1;
    this.baseSpeed = 100;
    this.points = 10;
    this.enemyType = EnemyType.FIGHTER;

    console.log(`[Fighter] Created at (${x}, ${y})`);
  }

  /**
   * Setup zigzag movement pattern
   * @param speedMultiplier - Factor to adjust speed based on game difficulty
   * @param difficultyLevel - Current difficulty level
   */
  setupMovement(speedMultiplier: number, difficultyLevel: number): void {
    // Calculate final speed based on game settings
    const baseSpeed = Phaser.Math.Between(80, 140);
    const finalSpeed = baseSpeed * speedMultiplier + 20 * (difficultyLevel - 1);

    // Set vertical velocity
    this.setVelocity(0, finalSpeed);

    // Create zigzag tween
    this.movementTween = this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-120, 120),
      yoyo: true,
      duration: 1000,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    console.log(`[Fighter] Movement setup with speed: ${finalSpeed}`);
  }

  /**
   * Update method called every frame
   * For Fighter, the basic movement is handled by the physics system and tween
   */
  override update(_time: number, _delta: number): void {
    // Fighter uses the built-in physics and tween for movement
    // No additional logic needed per frame
  }
}
