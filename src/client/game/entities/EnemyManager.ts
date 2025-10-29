import * as Phaser from 'phaser';
import { Enemy, EnemyType } from '../entities/Enemy';
import { EnemyFactory } from '../factories/EnemyFactory';
import { EnemyPlaceholders } from '../factories/EnemyPlaceholders';
import { SeekerDrone } from '../entities/enemies/SeekerDrone';
import { EliteGunship } from '../entities/enemies/EliteGunship';
import { ScoutInterceptor } from '../entities/enemies/ScoutInterceptor';
import { EnemyProjectiles } from './enemies/EnemyProjectiles';
import { EnemyBase } from './enemies/EnemyBase';
import { ENEMIES } from './enemies/definitions';

/**
 * EnemyManager - Handles enemy spawning, tracking, and updates
 * This class helps separate enemy logic from the main game scene
 */
export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyBullets?: Phaser.Physics.Arcade.Group; // legacy, retained for compatibility
  private projectilePool: EnemyProjectiles;
  private difficulty: number;
  private spawnTimer?: Phaser.Time.TimerEvent | undefined;
  // Audit: track a pseudo id for the current spawn timer to correlate logs
  private spawnTimerAuditId: number | undefined;
  private speedMultiplier: number;
  private useKlaRevamp = true; // prefer new Kla'ed enemies when assets are present
  // When true, random/background spawning is fully disabled (used in Build Mode tests)
  private disableRandomSpawns = false;
  // DEV: Focus mode to spawn only a specific Kla'ed enemy definition (e.g., 'fighter' or 'torpedo')
  private focusOnlyDefKey: keyof typeof ENEMIES | undefined = undefined;

  // ============================================
  // DEBUG MODE - SCOUT DEVELOPMENT
  // ============================================
  // Set DEBUG_SCOUT_ONLY = true in spawnEnemy() to:
  // - Only spawn Scout enemies
  // - Enable physics debug hitboxes (green for enemies, cyan for player)
  // - Useful for testing Scout behavior in isolation
  // ============================================
  // Weighted spawn frequencies for Kla'ed enemies (higher = more common)
  private klaWeights: Partial<Record<keyof typeof ENEMIES, number>> = {
    scout: 4,
    fighter: 4,
    bomber: 2,
    torpedo: 2,
    frigate: 1, // rarer
  };

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group, difficulty: number = 1) {
    this.scene = scene;
    this.enemies = enemies;
    this.difficulty = difficulty;
    this.speedMultiplier = 1;

    // Create placeholder graphics for enemy types
    EnemyPlaceholders.createPlaceholders(scene);

    // Set up centralized enemy projectile pool and expose on scene for convenience
    this.projectilePool = new EnemyProjectiles(scene);
    (this.scene as any).enemyProjectiles = this.projectilePool;

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
    // Hard guard: do not allow random spawning during Build Mode tests or when explicitly disabled
    const isBuildModeTest = this.scene.registry?.get?.('buildModeTest') === true;
    if (this.disableRandomSpawns || isBuildModeTest) {
      if (this.spawnTimer) {
        this.spawnTimer.remove();
        this.spawnTimer = undefined;
        console.warn('[EnemyManager] startSpawning: existing timer removed during suppression');
      }
      // Include a short stack for audit
      const stack = new Error().stack?.split('\n').slice(0, 6).join('\n');
      console.warn('[EnemyManager] startSpawning: SUPPRESSED', {
        reason: this.disableRandomSpawns ? 'disableRandomSpawns' : 'buildModeTest',
        buildModeTest: isBuildModeTest,
        disableRandomSpawns: this.disableRandomSpawns,
        stack,
      });
      return;
    }
    // Clear any existing timer
    if (this.spawnTimer) {
      this.spawnTimer.remove();
    }

    // Set up the spawn timer
    const effectiveDelay = this.focusOnlyDefKey === 'torpedo' ? Math.max(delay, 2200) : delay;
    this.spawnTimerAuditId = Math.floor(Math.random() * 1_000_000);
    this.spawnTimer = this.scene.time.addEvent({
      delay: effectiveDelay,
      loop: true,
      callback: () => {
        console.log('[EnemyManager] Timer firing -> spawnEnemy()', {
          auditId: this.spawnTimerAuditId,
          disableRandomSpawns: this.disableRandomSpawns,
          buildModeTest: this.scene.registry?.get?.('buildModeTest') === true,
        });
        this.spawnEnemy();
      },
    });
    console.log(`[EnemyManager] Started spawning enemies every ${effectiveDelay}ms`, {
      auditId: this.spawnTimerAuditId,
    });
  }

  /**
   * Stop spawning enemies
   */
  stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    if (this.spawnTimerAuditId !== undefined) {
      console.log(`[EnemyManager] Stopped spawning enemies`, { auditId: this.spawnTimerAuditId });
      this.spawnTimerAuditId = undefined;
    } else {
      console.log(`[EnemyManager] Stopped spawning enemies`);
    }
  }

  /**
   * Enable/disable background/random spawning entirely
   */
  setDisableRandomSpawns(disable: boolean): void {
    this.disableRandomSpawns = disable;
    console.log('[EnemyManager] setDisableRandomSpawns:', disable);
    if (disable) this.stopSpawning();
  }

  /**
   * Spawn a single enemy
   */
  spawnEnemy(): void {
    // Extra hard guard: never perform random spawn when disabled or in Build Mode test
    const isBuildModeTest = this.scene.registry?.get?.('buildModeTest') === true;
    if (this.disableRandomSpawns || isBuildModeTest) {
      const stack = new Error().stack?.split('\n').slice(0, 8).join('\n');
      console.error('[EnemyManager] RANDOM spawn BLOCKED', {
        reason: this.disableRandomSpawns ? 'disableRandomSpawns' : 'buildModeTest',
        disableRandomSpawns: this.disableRandomSpawns,
        buildModeTest: isBuildModeTest,
        auditId: this.spawnTimerAuditId,
        stack,
      });
      return;
    }
    console.log('[EnemyManager] RANDOM spawn requested', {
      auditId: this.spawnTimerAuditId,
    });
    // Determine position
    const x = Phaser.Math.Between(60, this.scene.scale.width - 60);

    // DEBUG: Force specific enemy type for testing
    const DEBUG_FIGHTER_ONLY = false;
    const DEBUG_TORPEDO_ONLY = false;
    const DEBUG_BOMBER_ONLY = false;
    const DEBUG_FRIGATE_ONLY = true;
    if (DEBUG_FRIGATE_ONLY) {
      const frigateDef = ENEMIES['frigate'];
      if (frigateDef && this.scene.textures.exists(frigateDef.key)) {
        console.log('🚢 [DEBUG] Spawning Frigate (debug mode active)');
        const kla = new EnemyBase(this.scene, x, -60, frigateDef).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return;
      } else {
        console.warn('[DEBUG] Frigate assets not available, skipping spawn');
        return;
      }
    }
    if (DEBUG_BOMBER_ONLY) {
      const bomberDef = ENEMIES['bomber'];
      if (bomberDef && this.scene.textures.exists(bomberDef.key)) {
        console.log('💣 [DEBUG] Spawning Bomber (debug mode active)');
        const kla = new EnemyBase(this.scene, x, -60, bomberDef).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return;
      } else {
        console.warn('[DEBUG] Bomber assets not available, skipping spawn');
        return;
      }
    }
    if (DEBUG_TORPEDO_ONLY) {
      const torpedoDef = ENEMIES['torpedo'];
      if (torpedoDef && this.scene.textures.exists(torpedoDef.key)) {
        console.log('🚀 [DEBUG] Spawning Torpedo (debug mode active)');
        const kla = new EnemyBase(this.scene, x, -60, torpedoDef).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return;
      } else {
        console.warn('[DEBUG] Torpedo assets not available, skipping spawn');
        return;
      }
    }
    if (DEBUG_FIGHTER_ONLY) {
      const fighterDef = ENEMIES['fighter'];
      if (fighterDef && this.scene.textures.exists(fighterDef.key)) {
        console.log('⚔️ [DEBUG] Spawning Fighter (debug mode active)');
        const kla = new EnemyBase(this.scene, x, -60, fighterDef).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return;
      } else {
        console.warn('[DEBUG] Fighter assets not available, skipping spawn');
        return;
      }
    }

    // DEV focus: only spawn a specific Kla'ed unit (fighter, torpedo, etc.) if configured
    if (this.focusOnlyDefKey) {
      const def: (typeof ENEMIES)[keyof typeof ENEMIES] | undefined = ENEMIES[this.focusOnlyDefKey];
      if (def && this.scene.textures.exists(def.key)) {
        const kla = new EnemyBase(this.scene, x, -60, def).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return;
      } else {
        console.warn(
          `[EnemyManager] Focus '${this.focusOnlyDefKey}' enabled but assets missing; skipping spawn.`
        );
        return;
      }
    }

    // Prefer Kla'ed random selection (weighted) when available, to mix all types from the start
    if (this.useKlaRevamp) {
      const defKey = this.pickRandomKlaDefKey();
      if (defKey) {
        const def: (typeof ENEMIES)[keyof typeof ENEMIES] | undefined = ENEMIES[defKey];
        if (!def) {
          console.warn('[EnemyManager] pickRandomKlaDefKey returned missing def:', defKey);
          // fall through to legacy
        } else {
          console.log('[EnemyManager] RANDOM -> Kla def', defKey);
          const kla = new EnemyBase(this.scene, x, -60, def).spawn();
          this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
          return;
        }
      }
    }

    // Determine enemy type based on difficulty
    const enemyType = EnemyFactory.determineEnemyType(this.difficulty);

    // Prefer Kla'ed models when available (mapping legacy types to Kla'ed defs)
    if (this.useKlaRevamp) {
      const spawnKla = (defKey: keyof typeof ENEMIES): boolean => {
        const def = ENEMIES?.[defKey];
        if (!def) return false;
        if (!this.scene.textures.exists(def.key)) return false;
        const kla = new EnemyBase(this.scene, x, -60, def).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return true;
      };

      if (enemyType === EnemyType.SCOUT && spawnKla('scout')) return;
      if (enemyType === EnemyType.FIGHTER && spawnKla('fighter')) return;
      // Use bomber to represent legacy cruiser (slow and tougher)
      if (enemyType === EnemyType.CRUISER && spawnKla('bomber')) return;
      // Map seeker (tracker) to torpedo ship (homing torpedoes)
      if (enemyType === EnemyType.SEEKER && spawnKla('torpedo')) return;
      // Map gunship to frigate (heavier shooting unit). If frigate missing, fallback continues to legacy below.
      if (enemyType === EnemyType.GUNSHIP && spawnKla('frigate')) return;
    }

    // Create legacy enemy
    console.log('[EnemyManager] RANDOM -> legacy enemy', enemyType);
    const enemy = EnemyFactory.createEnemy(this.scene, enemyType, x, -60);

    // Add enemy to the group (cast to Phaser.GameObjects.GameObject for type compatibility)
    this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);

    // Setup movement based on enemy type
    this.setupEnemyMovement(enemy);
  }

  // Pick a weighted-random Kla'ed enemy definition key among those whose textures are loaded
  private pickRandomKlaDefKey(): keyof typeof ENEMIES | undefined {
    const keys = Object.keys(ENEMIES) as Array<keyof typeof ENEMIES>;
    const available: Array<keyof typeof ENEMIES> = [];
    for (const k of keys) {
      const def = ENEMIES[k];
      if (def && this.scene.textures.exists(def.key)) available.push(k);
    }
    if (available.length === 0) return undefined;
    // Build weights array
    const weights: number[] = available.map((k) => Math.max(0, this.klaWeights[k] ?? 1));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return available[Phaser.Math.Between(0, available.length - 1)];
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      const w = weights[i] ?? 0;
      r -= w;
      if (r <= 0) return available[i];
    }
    return available[available.length - 1];
  }

  /**
   * Spawn an enemy at a specific position (for custom level design)
   * @param enemyType The type of enemy to spawn
   * @param x X coordinate
   * @param y Y coordinate
   * @returns The created enemy
   */
  spawnEnemyAtPosition(enemyType: number, x: number, y: number): Enemy {
    console.log(`[EnemyManager] EXPLICIT spawn: type=${enemyType} at (${x}, ${y})`);
    console.log('[EnemyManager] EXPLICIT spawn mode flags', {
      buildModeTest: this.scene.registry?.get?.('buildModeTest') === true,
      customLevelPlaythrough: this.scene.registry?.get?.('customLevelPlaythrough') === true,
      disableRandomSpawns: this.disableRandomSpawns,
    });

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

    // Prefer Kla'ed models when available (match mapping used in random spawns)
    if (this.useKlaRevamp) {
      const trySpawnKla = (defKey: keyof typeof ENEMIES): Phaser.GameObjects.GameObject | null => {
        const def = ENEMIES?.[defKey];
        if (!def) return null;
        if (!this.scene.textures.exists(def.key)) return null;
        const kla = new EnemyBase(this.scene, x, y, def).spawn();
        this.enemies.add(kla as unknown as Phaser.GameObjects.GameObject);
        return kla as unknown as Phaser.GameObjects.GameObject;
      };

      // Map legacy numeric enum to Kla'ed definition keys
      if (enemyType === EnemyType.SCOUT) {
        const g = trySpawnKla('scout');
        if (g) return g as unknown as Enemy;
      } else if (enemyType === EnemyType.FIGHTER) {
        const g = trySpawnKla('fighter');
        if (g) return g as unknown as Enemy;
      } else if (enemyType === EnemyType.CRUISER) {
        const g = trySpawnKla('bomber');
        if (g) return g as unknown as Enemy;
      } else if (enemyType === EnemyType.SEEKER) {
        const g = trySpawnKla('torpedo');
        if (g) return g as unknown as Enemy;
      } else if (enemyType === EnemyType.GUNSHIP) {
        const g = trySpawnKla('frigate');
        if (g) return g as unknown as Enemy;
      }
    }

    try {
      // Fallback to legacy enemy factory if Kla'ed path unavailable
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
    // Update pooled enemy projectiles (homing, etc.)
    this.projectilePool.update(time, delta, playerShip);

    // Update each enemy based on its type
    this.enemies.getChildren().forEach((enemySprite) => {
      const anyEnemy = enemySprite as any;
      const hasGetType = typeof anyEnemy.getType === 'function';
      const enemy = enemySprite as unknown as Enemy;

      // Call the enemy's update method (works for both legacy and EnemyBase)
      if (typeof anyEnemy.update === 'function') {
        anyEnemy.update(time, delta);
      }

      if (hasGetType) {
        // Special handling for legacy enemies that expose getType()
        const type = enemy.getType();
        if (type === EnemyType.SEEKER && playerShip?.active) {
          const seeker = enemy as SeekerDrone;
          seeker.trackPlayer(playerShip);
        }
        if (type === EnemyType.SCOUT && bullets) {
          const scout = enemy as ScoutInterceptor;
          scout.attemptEvade(bullets);
        }
        if (type === EnemyType.GUNSHIP) {
          const gunship = enemy as EliteGunship;
          if (gunship.canShoot(time)) {
            this.fireEnemyBullet(gunship);
            gunship.resetShootCooldown(time);
          }
        }
      }

      // Clean up enemies that are way off screen
      const y = (enemySprite as Phaser.Physics.Arcade.Sprite).y;
      if (y > this.scene.scale.height + 100) {
        // In Build Mode tests or custom-level playthroughs, count off-screen removals toward completion
        if (
          this.scene.registry.get('buildModeTest') === true ||
          this.scene.registry.get('customLevelPlaythrough') === true
        ) {
          const current = this.scene.registry.get('enemiesDefeated') || 0;
          this.scene.registry.set('enemiesDefeated', current + 1);
          console.log(
            `[EnemyManager] Completion mode: Enemy removed off-screen (total: ${current + 1})`
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
    const key = this.resolveProjectileTextureKey();
    this.projectilePool.spawnStraight(gunship.x, gunship.y + 20, key, 300, 2000, 0xff0000, 0.7);
    console.log(`[EnemyManager] Gunship fired bullet at (${gunship.x}, ${gunship.y})`);
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
    // Set up collision between player and enemy bullets
    this.scene.physics.add.overlap(
      player,
      this.projectilePool.getGroup(),
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
    if (this.enemyBullets) this.enemyBullets.clear(true, true);
    // Clear pooled projectiles
    if (this.projectilePool?.getGroup()) {
      this.projectilePool.getGroup().clear(true, true);
    }

    console.log(`[EnemyManager] Resources cleaned up`);
  }

  // --- Dev helper to change focus dynamically
  setFocusEnemy(defKey?: keyof typeof ENEMIES) {
    this.focusOnlyDefKey = defKey;
    console.log('[EnemyManager] Focus enemy set to', defKey ?? '(none)');
  }

  // --- Audit helpers
  hasActiveSpawnTimer(): boolean {
    return !!this.spawnTimer;
  }

  getSpawnAuditInfo(): {
    hasTimer: boolean;
    auditId: number | undefined;
    disableRandomSpawns: boolean;
    buildModeTest: boolean;
    difficulty: number;
  } {
    return {
      hasTimer: !!this.spawnTimer,
      auditId: this.spawnTimerAuditId,
      disableRandomSpawns: this.disableRandomSpawns,
      buildModeTest: this.scene.registry?.get?.('buildModeTest') === true,
      difficulty: this.difficulty,
    };
  }

  private resolveProjectileTextureKey(): string {
    if (this.scene.textures.exists('kla_bullet')) return 'kla_bullet';
    if (this.scene.textures.exists('enemy_bullet')) return 'enemy_bullet';
    if (this.scene.textures.exists('autoCannonProjectile')) return 'autoCannonProjectile';
    if (this.scene.textures.exists('bullet')) return 'bullet';
    return this.scene.textures.getTextureKeys()[0] || 'bullet';
  }
}
