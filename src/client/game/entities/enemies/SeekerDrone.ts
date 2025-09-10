import { Enemy, EnemyType } from '../Enemy';
import * as Phaser from 'phaser';

/**
 * SeekerDrone - Tracking enemy type
 * Follows the player's position
 */
export class SeekerDrone extends Enemy {
  private trackingStrength: number = 0.03; // How aggressively it tracks the player
  private trackingDelay: number = 1000; // Time before tracking starts
  private isTracking: boolean = false;

  /**
   * Create a new Seeker Drone enemy
   */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy_seeker') {
    // Fall back to regular enemy texture if seeker texture doesn't exist
    if (!scene.textures.exists(texture)) {
      console.log(`[SeekerDrone] Texture ${texture} not found, falling back to enemy`);
      texture = 'enemy';
    }

    super(scene, x, y, texture);

    // Set seeker properties
    this.hp = 1;
    this.baseSpeed = 90; // Slightly slower base speed, but will accelerate
    this.points = 20;
    this.enemyType = EnemyType.SEEKER;

    // Set tint to visually distinguish (red color to indicate danger)
    this.setTint(0xff0000);

    // Scale it slightly smaller than standard enemies
    this.setScale(0.9);

    console.log(`[SeekerDrone] Created at (${x}, ${y})`);

    // Start tracking after a delay
    scene.time.delayedCall(this.trackingDelay, () => {
      console.log(`[SeekerDrone] Starting to track player`);
      this.isTracking = true;
    });
  }

  /**
   * Setup initial downward movement before tracking begins
   * @param speedMultiplier - Factor to adjust speed based on game difficulty
   * @param difficultyLevel - Current difficulty level
   */
  setupMovement(speedMultiplier: number, difficultyLevel: number): void {
    // Calculate initial speed
    const baseSpeed = Phaser.Math.Between(70, 110);
    const finalSpeed = baseSpeed * speedMultiplier + 15 * (difficultyLevel - 1);

    // Set vertical velocity initially
    this.setVelocity(0, finalSpeed);

    console.log(`[SeekerDrone] Initial movement setup with speed: ${finalSpeed}`);
  }

  /**
   * Update seeker's movement to track toward player
   * @param player - The player sprite to track
   */
  trackPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    if (!this.isTracking || !this.active || !player.active) return;

    // Calculate direction to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);

    // Get current velocity
    const currentVelX = this.body?.velocity.x || 0;
    const currentVelY = this.body?.velocity.y || 0;

    // Calculate target velocity based on angle
    const speed = this.getSpeed();
    const targetVelX = Math.cos(angle) * speed;
    const targetVelY = Math.sin(angle) * speed;

    // Gradually adjust velocity for smooth tracking
    this.setVelocity(
      currentVelX + (targetVelX - currentVelX) * this.trackingStrength,
      currentVelY + (targetVelY - currentVelY) * this.trackingStrength
    );

    // Rotate to face the direction of movement
    this.rotation = angle + Math.PI / 2;
  }

  /**
   * Update method called every frame
   * NOTE: This requires the player position, which we'll handle in the scene update
   */
  override update(_time: number, _delta: number): void {
    // Tracking is handled in the scene's update by calling trackPlayer
  }
}
