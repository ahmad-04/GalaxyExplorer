import * as Phaser from 'phaser';
import { Enemy, EnemyType } from '../entities/Enemy';
import { EnemyFactory } from '../factories/EnemyFactory';
import { EnemyPlaceholders } from '../factories/EnemyPlaceholders';
import { SeekerDrone } from '../entities/enemies/SeekerDrone';
import { EliteGunship } from '../entities/enemies/EliteGunship';
import { ScoutInterceptor } from '../entities/enemies/ScoutInterceptor';

/**
 * EnemyManager - Handles enemy spawning, tracking, and updates
 * This class helps separate enemy logic from the main game scene
 */
export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyBullets?: Phaser.Physics.Arcade.Group;
  private difficulty: number;
  private spawnTimer?: Phaser.Time.TimerEvent | undefined;
  private speedMultiplier: number;

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group, difficulty: number = 1) {
    this.scene = scene;
    this.enemies = enemies;
    this.difficulty = difficulty;
    this.speedMultiplier = 1;

    // Create placeholder graphics for enemy types
    EnemyPlaceholders.createPlaceholders(scene);

    console.log(`[EnemyManager] Initialized with difficulty ${difficulty}`);
  }

  /**
   * Set the game speed multiplier (affects enemy speed)
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  /**
   * Set the current difficulty level
   */
  setDifficulty(difficulty: number): void {
    this.difficulty = difficulty;
    console.log(`[EnemyManager] Difficulty set to ${difficulty}`);
  }

  /**
   * Start spawning enemies
   * @param delay - Time between enemy spawns in milliseconds
   */
  startSpawning(delay: number = 1200): void {
    // Clear any existing timer
    if (this.spawnTimer) {
      this.spawnTimer.remove();
    }

    // Set up the spawn timer
    this.spawnTimer = this.scene.time.addEvent({
      delay,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    console.log(`[EnemyManager] Started spawning enemies every ${delay}ms`);
  }

  /**
   * Stop spawning enemies
   */
  stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    console.log(`[EnemyManager] Stopped spawning enemies`);
  }

  /**
   * Spawn a single enemy
   */
  spawnEnemy(): void {
    // Determine position
    const x = Phaser.Math.Between(60, this.scene.scale.width - 60);

    // Determine enemy type based on difficulty
    const enemyType = EnemyFactory.determineEnemyType(this.difficulty);

    // Create the enemy
    const enemy = EnemyFactory.createEnemy(this.scene, enemyType, x, -60);

    // Add enemy to the group (cast to Phaser.GameObjects.GameObject for type compatibility)
    this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);

    // Setup movement based on enemy type
    this.setupEnemyMovement(enemy);
  }

  /**
   * Spawn an enemy at a specific position (for custom level design)
   * @param enemyType The type of enemy to spawn
   * @param x X coordinate
   * @param y Y coordinate
   * @returns The created enemy
   */
  spawnEnemyAtPosition(enemyType: number, x: number, y: number): Enemy {
    console.log(`[EnemyManager] Spawning enemy of type ${enemyType} at position (${x}, ${y})`);

    // Map enemy type enum to string for better logging
    const enemyTypeMap: Record<number, string> = {
      0: 'FIGHTER',
      1: 'SCOUT',
      2: 'CRUISER',
      3: 'SEEKER',
      4: 'GUNSHIP',
    };
    const enemyTypeName = enemyTypeMap[enemyType] || `UNKNOWN(${enemyType})`;
    console.log(`[EnemyManager] Creating enemy of type: ${enemyTypeName}`);

    try {
      // Create the enemy
      const enemy = EnemyFactory.createEnemy(this.scene, enemyType, x, y);
      console.log(`[EnemyManager] Enemy created successfully:`, {
        type: enemyTypeName,
        position: { x, y },
        active: enemy.active,
        visible: enemy.visible,
      });

      // Add enemy to the group
      this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);
      console.log(`[EnemyManager] Enemy added to group, total enemies:`, this.enemies.getLength());

      // Setup movement based on enemy type
      this.setupEnemyMovement(enemy);
      console.log(`[EnemyManager] Enemy movement setup complete`);

      return enemy;
    } catch (error) {
      console.error(`[EnemyManager] Error spawning enemy:`, error);
      throw error;
    }
  }

  /**
   * Set up enemy movement patterns based on type
   */
  private setupEnemyMovement(enemy: Enemy): void {
    // Use a type with setupMovement method for compatibility
    interface EnemyWithSetupMovement extends Enemy {
      setupMovement(speedMultiplier: number, difficulty: number): void;
    }

    // Different setup based on enemy type
    switch (enemy.getType()) {
      case EnemyType.FIGHTER:
        // Fighter uses the setupMovement method (standard zigzag)
        if ('setupMovement' in enemy) {
          (enemy as EnemyWithSetupMovement).setupMovement(this.speedMultiplier, this.difficulty);
        }
        break;

      case EnemyType.SCOUT:
        // Scout uses setupMovement method (faster zigzag)
        if ('setupMovement' in enemy) {
          (enemy as EnemyWithSetupMovement).setupMovement(this.speedMultiplier, this.difficulty);
        }
        break;

      case EnemyType.CRUISER:
        // Cruiser uses setupMovement method (slow movement)
        if ('setupMovement' in enemy) {
          (enemy as EnemyWithSetupMovement).setupMovement(this.speedMultiplier, this.difficulty);
        }
        break;

      case EnemyType.SEEKER:
        // Seeker uses setupMovement method (initial movement before tracking)
        if ('setupMovement' in enemy) {
          (enemy as EnemyWithSetupMovement).setupMovement(this.speedMultiplier, this.difficulty);
        }
        break;

      case EnemyType.GUNSHIP:
        // Gunship uses setupMovement method (slow movement with pauses)
        if ('setupMovement' in enemy) {
          (enemy as EnemyWithSetupMovement).setupMovement(this.speedMultiplier, this.difficulty);
        }
        break;
    }
  }

  /**
   * Update all enemies (called each frame)
   * @param time - Current game time
   * @param delta - Time since last frame
   * @param playerShip - Reference to player ship for tracking enemies
   * @param bullets - Reference to player bullets for scout evasion
   */
  update(
    time: number,
    delta: number,
    playerShip?: Phaser.Physics.Arcade.Sprite,
    bullets?: Phaser.Physics.Arcade.Group
  ): void {
    // Update each enemy based on its type
    this.enemies.getChildren().forEach((enemySprite) => {
      const enemy = enemySprite as unknown as Enemy;

      // Call the enemy's update method
      enemy.update(time, delta);

      // Special handling for each enemy type
      if (enemy.getType() === EnemyType.SEEKER && playerShip?.active) {
        // Update seeker to track the player
        const seeker = enemy as SeekerDrone;
        seeker.trackPlayer(playerShip);
      }

      // Scout can evade bullets
      if (enemy.getType() === EnemyType.SCOUT && bullets) {
        // Try to evade incoming bullets
        const scout = enemy as ScoutInterceptor;
        scout.attemptEvade(bullets);
      }

      // Gunship can fire at the player
      if (enemy.getType() === EnemyType.GUNSHIP) {
        const gunship = enemy as EliteGunship;
        if (gunship.canShoot(time)) {
          this.fireEnemyBullet(gunship);
          gunship.resetShootCooldown(time);
        }
      }

      // Clean up enemies that are way off screen
      const y = (enemySprite as Phaser.Physics.Arcade.Sprite).y;
      if (y > this.scene.scale.height + 100) {
        // In Build Mode tests, count off-screen removals toward completion
        if (this.scene.registry.get('buildModeTest') === true) {
          const current = this.scene.registry.get('enemiesDefeated') || 0;
          this.scene.registry.set('enemiesDefeated', current + 1);
          console.log(
            `[EnemyManager] Build test: Enemy removed off-screen (total: ${current + 1})`
          );
          // Notify scene so it can check completion immediately
          this.scene.events.emit('enemy:removed');
        }
        enemySprite.destroy();
      }
    });
  }

  /**
   * Fire a bullet from an enemy gunship
   */
  private fireEnemyBullet(gunship: EliteGunship): void {
    // Initialize enemy bullets group if needed
    if (!this.enemyBullets) {
      this.enemyBullets = this.scene.physics.add.group({ defaultKey: 'enemy_bullet' });
    }

    // Create the bullet
    const bullet = this.enemyBullets.create(
      gunship.x,
      gunship.y + 20
    ) as Phaser.Physics.Arcade.Image;
    if (bullet?.body) {
      bullet.setTint(0xff0000);
      bullet.setScale(0.7);
      bullet.setVelocity(0, 300);

      // Auto-destroy after 2 seconds
      this.scene.time.delayedCall(2000, () => {
        if (bullet.active) bullet.destroy();
      });

      console.log(`[EnemyManager] Gunship fired bullet at (${gunship.x}, ${gunship.y})`);
    }
  }

  /**
   * Set up collision between enemy bullets and the player
   * @param player - The player sprite
   * @param callback - Function to call when player is hit
   */
  setupEnemyBulletCollision(
    player: Phaser.Physics.Arcade.Sprite,
    callback: (bullet: Phaser.Physics.Arcade.Image) => void
  ): void {
    // Initialize enemy bullets group if needed
    if (!this.enemyBullets) {
      this.enemyBullets = this.scene.physics.add.group({ defaultKey: 'enemy_bullet' });
    }

    // Set up collision between player and enemy bullets
    this.scene.physics.add.overlap(
      player,
      this.enemyBullets,
      (_playerSprite, bulletSprite) => {
        callback(bulletSprite as Phaser.Physics.Arcade.Image);
      },
      undefined,
      this
    );

    console.log(`[EnemyManager] Enemy bullet collision with player set up`);
  }

  /**
   * Get the enemy bullets group
   */
  getEnemyBullets(): Phaser.Physics.Arcade.Group | undefined {
    return this.enemyBullets;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Stop the spawn timer
    this.stopSpawning();

    // Clean up bullets
    if (this.enemyBullets) {
      this.enemyBullets.clear(true, true);
    }

    console.log(`[EnemyManager] Resources cleaned up`);
  }
}
