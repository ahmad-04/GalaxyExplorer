import { Enemy, EnemyType } from '../Enemy';
import * as Phaser from 'phaser';

/**
 * ScoutInterceptor - Fast, evasive enemy type
 * Quick and agile with erratic movement patterns
 */
export class ScoutInterceptor extends Enemy {
  private nextEvadeTime: number = 0;

  /**
   * Create a new Scout Interceptor enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy_scout') {
    // Fall back to regular enemy texture if scout texture doesn't exist
    if (!scene.textures.exists(texture)) {
      console.log(`[ScoutInterceptor] Texture ${texture} not found, falling back to enemy`);
      texture = 'enemy';
    }

    super(scene, x, y, texture);

    // Set scout properties - faster but same health as basic enemy
    this.hp = 1;
    this.baseSpeed = 150; // 50% faster than basic enemy
    this.points = 15;
    this.enemyType = EnemyType.SCOUT;

    // Set tint to visually distinguish (cyan/blue color)
    this.setTint(0x00ffff);

    console.log(`[ScoutInterceptor] Created at (${x}, ${y})`);
  }

  /**
   * Setup fast, erratic zigzag movement pattern
   * @param speedMultiplier - Factor to adjust speed based on game difficulty
   * @param difficultyLevel - Current difficulty level
   */
  setupMovement(speedMultiplier: number, difficultyLevel: number): void {
    // Higher base speed range than standard fighters
    const baseSpeed = Phaser.Math.Between(100, 160);
    const finalSpeed = baseSpeed * speedMultiplier + 20 * (difficultyLevel - 1);

    // Set vertical velocity
    this.setVelocity(0, finalSpeed);

    // Create more erratic zigzag pattern with faster direction changes
    this.movementTween = this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-180, 180),
      yoyo: true,
      duration: 600, // Faster changes in direction (vs 1000 for Fighter)
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    console.log(`[ScoutInterceptor] Movement setup with speed: ${finalSpeed}`);
  }

  /**
   * Attempt to evade player bullets
   * @param bullets - The player's bullet group to check for nearby bullets
   */
  attemptEvade(bullets: Phaser.Physics.Arcade.Group): void {
    // Only try to evade if evasion cooldown is over
    if (this.scene.time.now < this.nextEvadeTime) {
      return;
    }

    // Check for nearby bullets
    const nearbyBullets = bullets.getChildren().filter((bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      return Math.abs(b.y - this.y) < 150 && Math.abs(b.x - this.x) < 100;
    });

    if (nearbyBullets.length > 0) {
      // Determine evasion direction (away from bullet)
      const bullet = nearbyBullets[0] as Phaser.Physics.Arcade.Image;
      const evadeDir = bullet.x > this.x ? -1 : 1;

      console.log(`[ScoutInterceptor] Evading bullet at (${bullet.x}, ${bullet.y})`);

      // Quick burst of sideways movement
      this.setVelocityX(evadeDir * this.baseSpeed * 2);

      // Set cooldown for next evasion
      this.nextEvadeTime = this.scene.time.now + 1000;
    }
  }

  /**
   * Update method called every frame
   */
  override update(_time: number, _delta: number): void {
    // In a full implementation, we could check for nearby bullets here
    // However, we'll do this in the scene update instead to avoid
    // having to pass the bullets group to each enemy
  }
}
