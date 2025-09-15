import * as Phaser from 'phaser';

/**
 * Enum representing different enemy types in the game
 */
export enum EnemyType {
  FIGHTER, // Basic enemy (existing)
  SCOUT, // Fast, evasive enemy
  CRUISER, // Tanky enemy with multiple hitpoints
  SEEKER, // Enemy that tracks the player
  GUNSHIP, // Enemy that shoots at the player
}

/**
 * Base Enemy class that all enemy types extend
 * Handles core functionality like health, movement, and collision
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  // Core properties
  protected hp: number = 1; // Health points
  protected baseSpeed: number = 100; // Base movement speed
  protected points: number = 10; // Score points when destroyed
  protected enemyType: EnemyType = EnemyType.FIGHTER; // Default type
  public override scene: Phaser.Scene;

  // Movement properties
  protected movementTween: Phaser.Tweens.Tween | undefined;

  /**
   * Create a new Enemy
   * @param scene - The scene this enemy belongs to
   * @param x - Initial x position
   * @param y - Initial y position
   * @param texture - Texture key to use for this enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    this.scene = scene;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    console.log(`[Enemy] Created enemy of type ${EnemyType[this.enemyType]} at (${x}, ${y})`);
  }

  /**
   * Process a hit on this enemy
   * @returns boolean - true if the enemy is destroyed by this hit
   */
  hit(): boolean {
    console.log(`[Enemy:${EnemyType[this.enemyType]}] Hit! HP: ${this.hp} -> ${this.hp - 1}`);
    this.hp--;

    // Flash the enemy when hit
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.5, to: 1 },
      duration: 100,
      ease: 'Power1',
      yoyo: true,
    });

    return this.hp <= 0;
  }

  /**
   * Get the points value of this enemy
   */
  getPoints(): number {
    return this.points;
  }

  /**
   * Get the type of this enemy
   */
  getType(): EnemyType {
    return this.enemyType;
  }

  /**
   * Get the current speed of this enemy
   */
  getSpeed(): number {
    return this.baseSpeed;
  }

  /**
   * Override this to implement custom update logic
   * Called every frame for active enemies
   */
  override update(_time: number, _delta: number): void {
    // Intentionally empty; subclasses implement behavior. Prefixed params with '_' to satisfy TS unused check.
  }

  /**
   * Clean up resources when enemy is destroyed
   */
  override destroy(): void {
    console.log(`[Enemy:${EnemyType[this.enemyType]}] Destroyed at (${this.x}, ${this.y})`);

    // Clean up any tweens
    if (this.movementTween) {
      this.movementTween.remove();
      this.movementTween = undefined;
    }

    // Call parent destroy
    super.destroy();
  }
}
