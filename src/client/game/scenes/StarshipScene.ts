import * as Phaser from 'phaser';
import { EnemyManager } from '../entities/EnemyManager';
import { Enemy, EnemyType } from '../entities/Enemy';

// Add an enum for power-up types
enum PowerUpType {
  SCORE_MULTIPLIER,
  SHIELD,
  RAPID_FIRE,
}

export class StarshipScene extends Phaser.Scene {
  private shipPrimary!: Phaser.Physics.Arcade.Sprite;
  private ship!: Phaser.Physics.Arcade.Sprite; // Main ship reference for physics
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemyManager!: EnemyManager;
  private score = 0;
  private scoreMultiplier = 1;
  private scoreMultiplierTimer?: Phaser.Time.TimerEvent;
  private scoreText!: Phaser.GameObjects.Text;
  private lastFired = 0;
  private fireRate = 120; // ms - even faster fire rate for maximum fun
  private starfield!: Phaser.GameObjects.TileSprite;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };
  private shootSfx?: Phaser.Sound.BaseSound;
  private boomSfx?: Phaser.Sound.BaseSound;
  private difficultyTimer!: Phaser.Time.TimerEvent;
  private difficulty = 1;
  private starScrollDir = -1; // -1 = up, 1 = down (reversed)
  private shipAcceleration = 220;
  private shipConfig!: {
    ship: string;
    primaryTint: number;
    secondaryTint: number;
    combinedTextureKey?: string;
  };
  // Flag to track if collision detection is active
  private collisionsActive = false;

  // Power-up state
  private activePowerUps: Map<PowerUpType, Phaser.Time.TimerEvent> = new Map();
  private powerUpDuration = 10000; // 10 seconds
  private isShieldActive = false;
  private shieldObject: Phaser.GameObjects.Sprite | undefined;

  // Power-up timer UI (multi-powerup support)
  private powerUpUI: Map<
    PowerUpType,
    {
      icon: Phaser.GameObjects.Sprite;
      circle: Phaser.GameObjects.Graphics;
      label: Phaser.GameObjects.Text;
    }
  > = new Map();
  private powerUpBasePos = { x: 70, y: 70 };
  private powerUpSpacing = 60; // horizontal spacing between power-up icons

  // resolved texture keys (fallback-safe)
  private tex = { ship: 'ship', bullet: 'bullet', enemy: 'enemy', stars: 'stars' };
  // Build Mode test completion state
  private testCompleted = false;
  private testCompletionMonitor: Phaser.Time.TimerEvent | undefined;
  private expectedEnemiesToDefeat = 0;

  constructor() {
    super({ key: 'StarshipScene' });
  }

  init(data?: {
    ship?: string;
    primaryTint?: number;
    secondaryTint?: number;
    combinedTextureKey?: string;
    testMode?: boolean;
    levelData?: {
      settings: { name: string };
      entities: Array<{
        type: string;
        position?: { x: number; y: number };
        enemyType?: string;
      }>;
    };
    buildModeTest?: boolean;
    levelIdToTest?: string;
  }): void {
    console.log('[StarshipScene] init called with data:', {
      testMode: data?.testMode,
      buildModeTest: data?.buildModeTest,
      levelIdToTest: data?.levelIdToTest,
      hasLevelData: !!data?.levelData,
      entityCount: data?.levelData?.entities?.length || 0,
    });

    // Reset all game state when scene starts/restarts
    this.score = 0;
    this.difficulty = 1;
    this.lastFired = 0;
    this.scoreMultiplier = 1;
    this.activePowerUps.clear();
    this.isShieldActive = false;
    this.collisionsActive = false; // Start with collisions disabled until setup is complete
    // Ensure test state resets on every init
    this.testCompleted = false;
    this.expectedEnemiesToDefeat = 0;

    // Log registry state at initialization
    console.log('[StarshipScene] Registry state at init:', {
      isBuildModeTest: this.registry.get('isBuildModeTest'),
      hasTestLevelData: !!this.registry.get('testLevelData'),
    });

    // Store test mode flags if provided
    if (data?.testMode) {
      this.registry.set('testMode', true);
      console.log('[StarshipScene] Running in test mode');
    }

    // Store build mode test flag if provided
    if (data?.buildModeTest) {
      this.registry.set('buildModeTest', true);
      console.log('[StarshipScene] Running as Build Mode test');
    }

    // Store level data if provided for testing
    if (data?.levelData) {
      this.registry.set('testLevelData', data.levelData);
      console.log('[StarshipScene] Test level data loaded:', data.levelData.settings.name);
    }

    // Create power-up textures for fallback
    this.ensurePowerUpTexture('powerup_score');
    this.ensurePowerUpTexture('powerup_shield');
    this.ensurePowerUpTexture('powerup_rapidfire');

    // Explicitly destroy any existing timers
    if (this.difficultyTimer) {
      console.log('[StarshipScene] Removing existing difficulty timer');
      this.difficultyTimer.remove();
      this.difficultyTimer = null as unknown as Phaser.Time.TimerEvent;
    }
    if (this.scoreMultiplierTimer) {
      console.log('[StarshipScene] Removing existing score multiplier timer');
      this.scoreMultiplierTimer.remove();
      this.scoreMultiplierTimer = null as unknown as Phaser.Time.TimerEvent;
    }

    // If we have data passed directly, use it
    if (data && Object.keys(data).length > 0) {
      this.shipConfig = {
        ship: data.ship || 'ship',
        primaryTint: data.primaryTint || 0xffffff,
        secondaryTint: data.secondaryTint || 0xffffff,
      };

      // Only add combinedTextureKey if it exists
      if (data.combinedTextureKey) {
        this.shipConfig.combinedTextureKey = data.combinedTextureKey;
      }

      console.log('Using ship config from scene data:', this.shipConfig);
    }
    // Otherwise check if there's config in the registry
    else {
      const registryConfig = this.registry.get('shipConfig');
      if (registryConfig) {
        this.shipConfig = registryConfig;
        console.log('Using ship config from registry:', this.shipConfig);
      }
      // Fall back to defaults if nothing is available
      else {
        this.shipConfig = {
          ship: 'ship',
          primaryTint: 0xffffff,
          secondaryTint: 0xffffff,
        };
        console.log('Using default ship config');
      }
    }
  }

  preload(): void {
    // Load from Vite publicDir (src/client/public) => served at /assets/*
    this.load.image('ship', '/assets/ship.png');
    this.load.image('ShipClassic', '/assets/ShipClassic.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');

    // Load particle texture with debug logging
    console.log('[StarshipScene] DEBUG - Loading particle texture from assets');
    this.load
      .image('particle', '/assets/particle.png')
      .on('filecomplete', (key: string) => {
        if (key === 'particle') {
          console.log('[StarshipScene] DEBUG - Particle texture loaded successfully');
        }
      })
      .on('fileerror', () => {
        console.error('[StarshipScene] DEBUG - Failed to load particle texture');
      });

    this.load.image('stars', '/assets/stars.png'); // optional

    // Load the power-up icon with error handler
    this.load.image('powerup', '/assets/powerup.png').on('fileerror', () => {
      console.log('Power-up image not found, will create fallback');
    });

    // Always load galactic ship parts to ensure they're available if needed
    this.load.image('glacticShipPrimary', '/assets/glacticShipPrimary.png');
    this.load.image('glacticShipSecondary', '/assets/glacticShipSecondary.png');

    this.load.audio('shoot', '/assets/SpaceShipClassicShootingSFX.wav'); // optional
    this.load.audio('boom', '/assets/Boom.wav'); // optional

    // Create a particle texture if it doesn't exist yet
    this.load.on('complete', () => {
      if (!this.textures.exists('particle')) {
        console.log('[StarshipScene] Creating particle texture on load complete');
        this.createParticleTexture();
      }
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) =>
      console.error('Asset failed:', file.key)
    );
  }

  create(): void {
    console.log('[StarshipScene] create method starting');
    console.log(
      '[StarshipScene] Physics state:',
      this.physics.world.isPaused ? 'PAUSED' : 'ACTIVE'
    );

    // Check if we're running in test mode
    const isTestMode = this.registry.get('testMode') === true;
    const isBuildModeTest = this.registry.get('buildModeTest') === true;

    if (isTestMode) {
      console.log('[StarshipScene] Running in test mode');

      // Listen for test stop event
      if (isBuildModeTest) {
        this.events.on('test:stop', this.handleTestStop, this);

        // React to generic enemy removal notifications (e.g., off-screen culls)
        this.events.on('enemy:removed', this.checkForTestCompletion, this);

        // Initialize test stats in registry
        this.registry.set('enemiesDefeated', 0);
        this.registry.set('playerDeaths', 0);
        this.registry.set('powerupsCollected', 0);
      }
    }

    // Ensure physics is running
    if (this.physics.world.isPaused) {
      console.log('[StarshipScene] Resuming paused physics');
      this.physics.resume();
    }

    console.log('[StarshipScene] Physics should now be active');

    // Clear existing starfield if present to prevent duplicate backgrounds on restart
    if (this.starfield) {
      console.log('[StarshipScene] Removing existing starfield');
      this.starfield.destroy();
      this.starfield = null as unknown as Phaser.GameObjects.TileSprite;
    }

    // Ensure keyboard works inside Devvit iframe
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Capture keys
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);

    // Always use black background, ignore any customization
    console.log('[StarshipScene] Setting fixed black background');
    this.cameras.main.setBackgroundColor(0x000000);

    // Create a generic starfield texture if we don't have one already
    if (!this.textures.exists('stars_fallback')) {
      console.log('[StarshipScene] Creating fallback stars texture');
      this.createGenericTexture('stars_fallback', 0x00001a, 256, 256);
    }

    // Set the texture to use for stars
    this.tex.stars = 'stars_fallback';

    // Create the starfield with the appropriate texture
    this.starfield = this.add
      .tileSprite(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        this.tex.stars
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(-10);

    // Resolve all textures or create fallbacks to avoid green boxes
    this.ensureTextures(true); // Skip stars since we've already handled them

    // Keyboard (WASD + Space)
    this.keys = {
      W: this.input.keyboard!.addKey(KC.W),
      A: this.input.keyboard!.addKey(KC.A),
      S: this.input.keyboard!.addKey(KC.S),
      D: this.input.keyboard!.addKey(KC.D),
      SPACE: this.input.keyboard!.addKey(KC.SPACE),
    };

    // Sounds (optional)
    if (this.sound) {
      if (this.sound.get('shoot') || this.cache.audio.exists('shoot'))
        this.shootSfx = this.sound.add('shoot', { volume: 0.5 });
      if (this.sound.get('boom') || this.cache.audio.exists('boom'))
        this.boomSfx = this.sound.add('boom', { volume: 0.6 });
    }

    const { width: w, height: h } = this.scale;
    this.physics.world.setBounds(0, 0, w, h);

    // Use enhanced ship properties for maximum fun gameplay
    const speedMultiplier = 1.4; // Even higher speed multiplier
    this.shipAcceleration = 320; // Much higher acceleration for super responsiveness

    // --- Create Ship ---
    const shipX = w / 2;
    const shipY = h - 80;

    if (this.shipConfig.ship === 'galactic' && this.shipConfig.combinedTextureKey) {
      // Use the combined texture for the galactic ship
      this.shipPrimary = this.physics.add.sprite(shipX, shipY, this.shipConfig.combinedTextureKey);
      // No need for tinting as the texture already has the colors applied
      this.setupShip(this.shipPrimary, true);
    } else if (this.shipConfig.ship === 'galactic') {
      // Fallback if no combined texture is available
      this.shipPrimary = this.physics.add.sprite(shipX, shipY, 'glacticShipPrimary');
      this.shipPrimary.setTint(this.shipConfig.primaryTint || 0xffffff);
      this.setupShip(this.shipPrimary, true);
    } else {
      // Single-layer ship
      this.shipPrimary = this.physics.add.sprite(
        shipX,
        shipY,
        this.shipConfig.ship || this.tex.ship
      );
      this.shipPrimary.setTint(this.shipConfig.primaryTint || 0xffffff);
      this.setupShip(this.shipPrimary, true);
    }

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Groups (use resolved keys)
    this.bullets = this.physics.add.group({ defaultKey: this.tex.bullet, maxSize: 60 });
    this.enemies = this.physics.add.group();
    this.powerUps = this.physics.add.group({
      runChildUpdate: true,
    });

    // Initialize enemy manager
    this.enemyManager = new EnemyManager(this, this.enemies, this.difficulty);

    // UI
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', color: '#ffffff' });
    this.add
      .text(w / 2, h - 16, 'Click game, then use Arrows + Space', {
        fontSize: '12px',
        color: '#bbbbbb',
      })
      .setOrigin(0.5);

    // Setup power-up UI
    this.setupPowerUpUI();

    // Set up collisions after all groups and sprites are created
    this.setupCollisions();

    // Initialize enemy manager with the current difficulty level and start spawning
    console.log('[StarshipScene] Setting up enemy spawn using EnemyManager');

    // Apply speed multiplier from background config (reuse existing variables)
    this.enemyManager.setSpeedMultiplier(speedMultiplier);

    // Check if we have custom level data from build mode testing
    console.log('[StarshipScene] Checking for custom level data...');

    const testLevelData = this.registry.get('testLevelData');
    console.log(
      '[StarshipScene] testLevelData from registry:',
      testLevelData
        ? {
            id: testLevelData.id,
            name: testLevelData.settings?.name,
            hasEntities: !!testLevelData.entities,
            entityCount: testLevelData.entities?.length || 0,
          }
        : 'NOT FOUND'
    );

    console.log('[StarshipScene] isBuildModeTest flag:', isBuildModeTest);

    const usingCustomLevel = !!(testLevelData && isBuildModeTest);

    if (usingCustomLevel) {
      console.log(
        '[StarshipScene] Using custom level data for enemy spawning:',
        testLevelData.settings.name
      );
      this.setupCustomLevel(testLevelData);
      // Start monitoring for completion when all custom enemies are cleared
      this.startTestCompletionMonitor();
    } else {
      // Log detailed reason why not using custom level
      if (!testLevelData) {
        console.warn('[StarshipScene] No test level data found in registry');
      } else if (!isBuildModeTest) {
        console.warn('[StarshipScene] isBuildModeTest flag is not set');
      }

      // Start enemy spawning - faster initial spawn rate for immediate action
      console.log('[StarshipScene] Using default enemy spawning');
      this.enemyManager.startSpawning(900);
    }

    // In Build Mode test with custom level, skip the difficulty timer that re-enables random spawns
    if (!usingCustomLevel) {
      console.log('[StarshipScene] Setting up difficulty increase timer');
      if (this.difficultyTimer) {
        console.log('[StarshipScene] Removing existing difficulty timer');
        this.difficultyTimer.remove();
      }

      this.difficultyTimer = this.time.addEvent({
        delay: 10000,
        loop: true,
        callback: () => {
          console.log('[StarshipScene] Difficulty timer triggered, increasing difficulty');
          this.difficulty = Math.min(10, this.difficulty + 1);

          // Update enemy manager with new difficulty
          this.enemyManager.setDifficulty(this.difficulty);

          // Calculate new spawn delay - faster spawning for more action
          const newDelay = Math.max(300, 1000 - this.difficulty * 80);

          // Update spawn rate in enemy manager
          this.enemyManager.stopSpawning();
          this.enemyManager.startSpawning(newDelay);
        },
      });
    } else {
      console.log('[StarshipScene] Skipping difficulty timer in Build Mode test with custom level');
    }
  }

  setupShip(ship: Phaser.Physics.Arcade.Sprite, isPrimary = true): void {
    // Use default speed values
    const speedMultiplier = 1;

    ship.setOrigin(0.5).setAngle(-90);
    ship.setDisplaySize(128, 128);

    if (isPrimary) {
      // Set this as the main ship reference
      this.ship = ship;
      // Also set it as the player for collision detection
      this.player = ship;

      this.physics.world.enable(ship);
      ship.setCollideWorldBounds(true);

      // Apply enhanced physics settings for super responsive ship
      const shipMaxVelocity = 320 + 60 * (speedMultiplier - 1); // Higher max velocity
      const shipDrag = 180 + 90 * (speedMultiplier - 1); // Less drag for better responsiveness
      ship.setDrag(shipDrag).setAngularDrag(150).setMaxVelocity(shipMaxVelocity);

      const body = ship.body as Phaser.Physics.Arcade.Body;
      const frameW = ship.frame.width;
      const frameH = ship.frame.height;
      const scale = Math.max(ship.scaleX, ship.scaleY);
      const desiredDisplayRadius = Math.min(ship.displayWidth, ship.displayHeight) * 0.4;
      const radius = desiredDisplayRadius / scale;
      const diameter = radius * 2;
      const offsetX = (frameW - diameter) / 2;
      const offsetY = (frameH - diameter) / 2;
      body.setCircle(radius, offsetX, offsetY);
      body.allowRotation = false;
      ship.setAngularVelocity(0);
      ship.setRotation(Phaser.Math.DegToRad(-90));
    }
  }

  // New method to set up collisions separately
  private setupCollisions(): void {
    console.log('[StarshipScene] Setting up collision handlers');

    // Bullet-enemy collisions
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bullet, enemy) => {
        // Only process collision if flag is active
        if (!this.collisionsActive) return;

        this.onBulletHitEnemy(
          bullet as Phaser.Physics.Arcade.Image,
          enemy as Phaser.Physics.Arcade.Sprite
        );
      },
      undefined,
      this
    );

    // Player-enemy collision
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_player, enemy) => {
        if (!this.collisionsActive) return;
        this.onPlayerHit(enemy as Phaser.Physics.Arcade.Sprite);
      },
      undefined,
      this
    );

    // Set up enemy bullet collisions with player
    this.enemyManager.setupEnemyBulletCollision(this.player, (bullet) => {
      if (!this.collisionsActive) return;

      // Destroy the bullet
      bullet.destroy();

      // Handle player damage (reuse player hit logic)
      this.onPlayerHit(null as unknown as Phaser.Physics.Arcade.Sprite);
    });

    // Power-up collection
    this.physics.add.overlap(
      this.player,
      this.powerUps,
      (_player, powerUp) => {
        const powerUpObj = powerUp as Phaser.GameObjects.GameObject;
        const powerUpType = powerUpObj.getData('powerUpType') as PowerUpType;
        if (powerUpType !== undefined) {
          this.activatePowerUp(powerUpType);

          // Track powerup collection for test mode
          if (this.registry.get('buildModeTest') === true) {
            const currentPowerups = this.registry.get('powerupsCollected') || 0;
            this.registry.set('powerupsCollected', currentPowerups + 1);
            console.log(
              `[StarshipScene] Test mode: Powerup collected (total: ${currentPowerups + 1})`
            );
          }
        }
        powerUpObj.destroy();
      },
      undefined,
      this
    );

    // After everything is set up, enable collisions
    this.collisionsActive = true;
  }

  override update(time: number, delta: number): void {
    // Check if ship exists and has a body before updating
    if (!this.ship?.body) return;

    // Update enemy manager
    this.enemyManager.update(time, delta, this.ship, this.bullets);

    // Parallax (frame-rate independent) - using fixed speed value
    const speed = 1; // Fixed speed, no customization
    const d = delta / 16.6667;
    if (this.starfield) {
      this.starfield.tilePositionY += this.starScrollDir * (speed + 0.2 * this.difficulty) * d;
    }

    // WASD + arrows
    const left = this.cursors.left?.isDown || this.keys.A?.isDown;
    const right = this.cursors.right?.isDown || this.keys.D?.isDown;
    const up = this.cursors.up?.isDown || this.keys.W?.isDown;
    const down = this.cursors.down?.isDown || this.keys.S?.isDown;
    const fire = this.cursors.space?.isDown || this.keys.SPACE?.isDown;

    // NEW: no rotation — zero angular velocity every frame
    this.ship.setAngularVelocity(0);

    // NEW: strafe-style movement (fixed facing)
    const shipSpeed = this.shipAcceleration;
    let vx = 0;
    let vy = 0;
    if (left) vx -= shipSpeed;
    if (right) vx += shipSpeed;
    if (up) vy -= shipSpeed; // up is toward top of screen
    if (down) vy += shipSpeed; // down is toward bottom of screen

    // Normalize diagonals so combined speed isn't faster
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.SQRT2;
      vx *= inv;
      vy *= inv;
    }

    if (vx !== 0 || vy !== 0) {
      this.ship.setVelocity(vx, vy);
    } else {
      // quick damping when no input for more responsive controls
      const body = this.ship.body as Phaser.Physics.Arcade.Body;
      this.ship.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95);
    }

    // Shooting (unchanged — bullets go up since ship is fixed at -90°)
    if (fire && time > this.lastFired) {
      const bullet = this.bullets.create(
        this.ship.x,
        this.ship.y,
        this.tex.bullet
      ) as Phaser.Physics.Arcade.Image;
      if (bullet?.body) {
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        bullet.setRotation(this.ship.rotation); // stays -90
        this.physics.velocityFromRotation(this.ship.rotation, 750, body.velocity); // Super fast bullets
        this.time.delayedCall(1400, () => bullet.destroy()); // Even longer bullet lifetime
        this.lastFired = time + this.fireRate;
        this.shootSfx?.play();
      }
    }

    // Wrap player ship only - enemies are handled by EnemyManager
    this.wrap(this.ship);

    // Update power-up timer if one is active
    if (this.activePowerUps.size > 0) {
      this.updatePowerUpTimerUI();

      // Update shield position if it's active
      if (this.isShieldActive && this.shieldObject && this.player) {
        this.shieldObject.x = this.player.x;
        this.shieldObject.y = this.player.y;
      }
    }
  }

  private wrap(obj: Phaser.GameObjects.GameObject): void {
    const s = obj as Phaser.Physics.Arcade.Sprite;
    const w = this.scale.width;
    const h = this.scale.height;
    if (s.x < 0) s.x = w;
    else if (s.x > w) s.x = 0;
    if (s.y < 0) s.y = h;
    else if (s.y > h) s.y = 0;
  }

  // Enemy spawning is now handled by EnemyManager

  private onBulletHitEnemy(
    bullet: Phaser.Physics.Arcade.Image,
    enemySprite: Phaser.Physics.Arcade.Sprite
  ): void {
    // Safety check - make sure both objects still exist and are active
    if (!bullet.active || !enemySprite.active) return;

    bullet.destroy();

    // Check if enemy is one of our custom enemy types
    const enemy = enemySprite as unknown as Enemy;
    let points = 10; // Default points
    let destroyed = true;

    if ('hit' in enemy && typeof enemy.hit === 'function') {
      // Our custom enemy class - call hit method to handle damage
      console.log('[StarshipScene] Custom enemy hit');
      destroyed = enemy.hit();

      // Get points if destroyed
      if (destroyed) {
        if ('getPoints' in enemy && typeof enemy.getPoints === 'function') {
          points = enemy.getPoints();
        }

        // Actually destroy the enemy if hit returns true
        console.log('[StarshipScene] Enemy destroyed after hit');
        enemySprite.destroy();
      }
    } else {
      // Legacy enemy - destroy immediately
      enemySprite.destroy();
    }

    // Increment enemy defeat counter for test stats if the enemy was destroyed
    if (destroyed && this.registry.get('buildModeTest') === true) {
      const currentDefeats = this.registry.get('enemiesDefeated') || 0;
      this.registry.set('enemiesDefeated', currentDefeats + 1);
      console.log(`[StarshipScene] Test mode: Enemy defeated (total: ${currentDefeats + 1})`);
    } // Only add points and show effects if the enemy was destroyed
    if (destroyed) {
      this.score += points * this.scoreMultiplier;
      this.scoreText.setText(`Score: ${this.score}`);

      // Create explosion effect based on enemy type
      let enemyTypeValue: number | undefined;

      // Try to get enemy type through different methods
      if ('getType' in enemy && typeof enemy.getType === 'function') {
        enemyTypeValue = enemy.getType();
        console.log(`[StarshipScene] Found enemy type: ${enemyTypeValue}`);
      } else if ('type' in enemy) {
        // Check if enemy has a type property (using type assertion)
        enemyTypeValue = (enemy as unknown as { type: number }).type;
        console.log(`[StarshipScene] Found enemy type from property: ${enemyTypeValue}`);
      }

      // Create explosion at the enemy's position
      console.log(
        `[StarshipScene] DEBUG - Creating explosion at (${enemySprite.x}, ${enemySprite.y}) with type ${enemyTypeValue}`
      );
      console.log('[StarshipScene] DEBUG - Current texture keys:', this.textures.getTextureKeys());
      this.createExplosionEffect(enemySprite.x, enemySprite.y, enemyTypeValue);
      this.boomSfx?.play();
    }

    // Chance to drop a power-up
    if (Phaser.Math.Between(0, 10) > 5) {
      // Randomly choose a power-up type
      const rand = Phaser.Math.Between(0, 2);
      let powerUpType: PowerUpType;
      if (rand === 0) {
        powerUpType = PowerUpType.SCORE_MULTIPLIER;
      } else if (rand === 1) {
        powerUpType = PowerUpType.SHIELD;
      } else {
        powerUpType = PowerUpType.RAPID_FIRE;
      }

      let textureKey = 'powerup_score';
      if (powerUpType === PowerUpType.SHIELD) {
        textureKey = 'powerup_shield';
      } else if (powerUpType === PowerUpType.RAPID_FIRE) {
        textureKey = 'powerup_rapidfire';
      }

      console.log(
        `[StarshipScene] Dropping power-up of type: ${PowerUpType[powerUpType]} with texture key: ${textureKey}`
      );

      // Create the power-up drop with the correct texture
      const powerUp = this.powerUps.create(
        enemySprite.x,
        enemySprite.y,
        textureKey
      ) as Phaser.Physics.Arcade.Sprite;

      // Store the type on the power-up object itself
      powerUp.setData('powerUpType', powerUpType);

      // Use a fallback texture if needed
      if (!powerUp.texture.key || powerUp.frame.name === '__MISSING') {
        console.log(`[StarshipScene] Creating fallback for ${textureKey}`);
        this.createPowerUpFallback(textureKey);
        powerUp.setTexture(textureKey);
      }

      powerUp.setVelocityY(100);

      // Make power-ups more visible and distinct based on type
      let tint = 0xffdd00; // Yellow for score multiplier
      if (powerUpType === PowerUpType.SHIELD) {
        tint = 0x00ccff; // Blue for shield
      } else if (powerUpType === PowerUpType.RAPID_FIRE) {
        tint = 0x00ff00; // Green for rapid fire
      }

      powerUp.setTint(tint);

      // Add a pulsing effect to make it more visible
      this.tweens.add({
        targets: powerUp,
        scale: { from: 0.7, to: 1 },
        alpha: { from: 0.7, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // In Build Mode tests, check for completion when enemies are cleared
    this.checkForTestCompletion();
  }

  private onPlayerHit(enemy: Phaser.Physics.Arcade.Sprite): void {
    console.log('[StarshipScene] Player hit!');

    // Safety check - make sure the enemy still exists and is active
    if (enemy && !enemy.active) {
      console.log('[StarshipScene] Ignoring hit from inactive enemy');
      return;
    }

    // Check for shield protection
    if (this.isShieldActive) {
      console.log('[StarshipScene] Shield absorbed the hit!');

      // Destroy the enemy that hit the shield
      if (enemy && enemy.active) {
        // Count shield-based enemy destruction in Build Mode tests
        if (this.registry.get('buildModeTest') === true) {
          const currentDefeats = this.registry.get('enemiesDefeated') || 0;
          this.registry.set('enemiesDefeated', currentDefeats + 1);
          console.log(
            `[StarshipScene] Test mode: Enemy destroyed by shield (total: ${currentDefeats + 1})`
          );
        }
        enemy.destroy();

        // After destroying by shield, check for test completion
        this.checkForTestCompletion();
      }

      // Strong visual feedback for shield hit
      this.cameras.main.flash(300, 0, 180, 255, true);
      this.cameras.main.shake(200, 0.01);

      // Special shield hit effect
      if (this.shieldObject) {
        this.tweens.add({
          targets: this.shieldObject,
          alpha: { from: 1, to: 0 },
          scale: { from: 0.7, to: 0.1 },
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            if (this.shieldObject) {
              this.shieldObject.destroy();
              this.shieldObject = undefined;
            }
          },
        });
      }

      // Deactivate shield immediately
      this.isShieldActive = false;
      this.deactivatePowerUp(PowerUpType.SHIELD);

      return; // Player is protected by shield
    }

    console.log('[StarshipScene] No shield, starting game over sequence');

    // If the enemy is still present and active at collision, count as destroyed-by-crash
    if (enemy && enemy.active) {
      if (this.registry.get('buildModeTest') === true) {
        const currentDefeats = this.registry.get('enemiesDefeated') || 0;
        this.registry.set('enemiesDefeated', currentDefeats + 1);
        console.log(
          `[StarshipScene] Test mode: Enemy destroyed by crash (total: ${currentDefeats + 1})`
        );
      }
      enemy.destroy();
      // Check completion after crash-based destruction
      this.checkForTestCompletion();
    }

    // Track player deaths for test mode
    if (this.registry.get('buildModeTest') === true) {
      const currentDeaths = this.registry.get('playerDeaths') || 0;
      this.registry.set('playerDeaths', currentDeaths + 1);
      console.log(`[StarshipScene] Test mode: Player death recorded (total: ${currentDeaths + 1})`);
    }

    // Disable collision detection to prevent multiple hits
    this.collisionsActive = false;

    // Visual feedback
    this.shipPrimary.setTint(0xff0000);
    this.cameras.main.shake(120, 0.01);

    // Only deactivate power-ups once (they'll also be cleaned up in shutdown)
    this.deactivateAllPowerUps();

    console.log('[StarshipScene] Stopping enemies and bullets');
    // Stop enemies and bullets - just make them inactive but don't destroy yet
    // This gives better visual feedback during the transition
    this.enemies.setActive(false);
    this.bullets.setActive(false);

    // Stop only essential timers for immediate effect
    // (The full cleanup will happen in shutdown)
    if (this.difficultyTimer) {
      this.difficultyTimer.paused = true;
    }

    console.log('[StarshipScene] Setting up delayed call to GameOver scene');

    // Wait and then restart - short delay for visual feedback
    this.time.delayedCall(800, () => {
      console.log('[StarshipScene] Transitioning to GameOver scene');

      // Store the score before stopping the scene
      const finalScore = this.score;

      // The scene.stop() will trigger our enhanced shutdown method
      // which will clean up all resources
      this.scene.stop('StarshipScene');

      // Start the GameOver scene with the stored score
      console.log('[StarshipScene] Starting GameOver scene with score:', finalScore);
      this.scene.start('GameOver', { score: finalScore });
    });
  }

  /**
   * Creates an explosion effect at the specified position
   * @param x - X position for explosion
   * @param y - Y position for explosion
   * @param enemyType - Optional enemy type for specialized effects
   */
  private createExplosionEffect(x: number, y: number, enemyType?: number): void {
    console.log(`[StarshipScene] Creating explosion at (${x}, ${y}) for enemy type ${enemyType}`);

    // Determine particle color based on enemy type
    let tint = 0xffffff; // Default white
    let particleCount = 50; // Increased particle count for better visibility
    let speedMin = 50;
    let speedMax = 150;
    let scaleStart = 1.2; // Increased scale for better visibility
    let lifespan = 1000; // Longer lifespan    // Customize based on enemy type
    if (enemyType !== undefined) {
      switch (enemyType) {
        case EnemyType.CRUISER:
          tint = 0xff6600; // Orange
          particleCount = 40; // More particles for bigger enemies
          speedMin = 80;
          speedMax = 200;
          scaleStart = 1.2;
          lifespan = 800; // Shorter but more intense
          break;
        case EnemyType.GUNSHIP:
          tint = 0x8800ff; // Purple
          particleCount = 35;
          speedMin = 70;
          speedMax = 180;
          lifespan = 750;
          break;
        case EnemyType.SCOUT:
          tint = 0x00ffff; // Cyan
          particleCount = 30;
          speedMin = 100;
          speedMax = 220;
          scaleStart = 0.8;
          lifespan = 600;
          break;
        case EnemyType.SEEKER:
          tint = 0xff0000; // Red
          particleCount = 35;
          speedMin = 70;
          speedMax = 170;
          scaleStart = 1.0;
          lifespan = 650;
          break;
      }
    }

    try {
      // Debug texture existence
      console.log(
        `[StarshipScene] DEBUG - Particle texture exists: ${this.textures.exists('particle')}`
      );

      // List all available textures
      console.log('[StarshipScene] DEBUG - Available textures:', this.textures.getTextureKeys());

      // DUAL APPROACH: Try both particles and a simple explosion sprite

      // 1. Create main explosion particles
      console.log(`[StarshipScene] DEBUG - Adding main particles at (${x},${y})`);
      const particleEffect = this.add.particles(x, y, 'particle', {
        lifespan: lifespan,
        speed: { min: speedMin, max: speedMax },
        angle: { min: 0, max: 360 },
        scale: { start: scaleStart, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        tint: tint,
        quantity: particleCount,
        frequency: -1, // Emit all at once
        emitting: true,
      });

      // 2. Add secondary debris particles with different properties
      console.log(`[StarshipScene] DEBUG - Adding secondary particles at (${x},${y})`);
      const debrisEffect = this.add.particles(x, y, 'particle', {
        lifespan: lifespan * 0.8,
        speed: { min: speedMin * 0.5, max: speedMax * 0.6 },
        angle: { min: 0, max: 360 },
        scale: { start: scaleStart * 0.6, end: 0 },
        alpha: { start: 0.8, end: 0 },
        blendMode: Phaser.BlendModes.SCREEN,
        tint: 0xffffff, // White for contrast
        quantity: Math.floor(particleCount * 0.6),
        frequency: -1,
        emitting: true,
        gravityY: 20, // Small gravity effect for falling debris
      });

      // 3. Add bright center flash particles
      const flashEffect = this.add.particles(x, y, 'particle', {
        lifespan: lifespan * 0.3, // Short duration
        speed: { min: 10, max: 50 },
        scale: { start: scaleStart * 1.5, end: 0.2 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xffffff,
        quantity: 10,
        frequency: -1,
        emitting: true,
      });

      // Clean up all particle effects after they're done
      this.time.delayedCall(lifespan + 100, () => {
        particleEffect.destroy();
        debrisEffect.destroy();
        flashEffect.destroy();
      });

      // 4. Create an enhanced explosion effect with multiple waves

      // Initial flash effect at the center - slightly larger but still quick
      const flash = this.add.circle(x, y, 15, 0xffffff, 1); // Medium radius
      this.tweens.add({
        targets: flash,
        scale: { from: 1, to: 2.5 }, // Increased max scale
        alpha: { from: 1, to: 0 },
        duration: 180, // Moderate duration
        ease: 'Cubic.easeOut',
        onComplete: () => {
          flash.destroy();
        },
      });

      // Create multiple explosion waves with different sizes, speeds and opacities
      const waveCount = enemyType ? Math.min(2 + enemyType, 5) : 3; // More waves for better effect

      // Enhanced color patterns based on enemy type
      let waveColors: number[] = [];
      if (enemyType) {
        switch (enemyType) {
          case EnemyType.CRUISER:
            waveColors = [0xffffff, 0xff9933, tint]; // White, orange, base color
            break;
          case EnemyType.GUNSHIP:
            waveColors = [0xffffff, 0xcc99ff, tint]; // White, light purple, base color
            break;
          case EnemyType.SCOUT:
            waveColors = [0xffffff, 0x99ffff, tint]; // White, light cyan, base color
            break;
          case EnemyType.SEEKER:
            waveColors = [0xffffff, 0xff9999, tint]; // White, light red, base color
            break;
          default:
            waveColors = [0xffffff, tint]; // White, base color
        }
      } else {
        waveColors = [0xffffff, tint]; // White, base color
      }

      for (let i = 0; i < waveCount; i++) {
        // Vary the wave sizes and colors - medium size
        const waveSize = 16 + i * 10; // Increased size
        const waveColor = i < waveColors.length ? waveColors[i] : tint;
        const waveAlpha = 0.8 - i * 0.15; // Each wave is more transparent
        const waveDuration = 220 + i * 70; // Moderate animation speed
        const waveDelay = i * 60; // Moderate delay between waves

        // Create the wave
        const wave = this.add.circle(x, y, waveSize, waveColor, waveAlpha);
        wave.setScale(0.1);

        // Animate the wave - smaller max scale
        this.tweens.add({
          targets: wave,
          scale: { from: 0.1, to: 1.0 + i * 0.3 }, // Reduced max scale
          alpha: { from: waveAlpha, to: 0 },
          duration: waveDuration,
          delay: waveDelay,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            wave.destroy();
          },
        });
      }

      // Add subtle pulsing inner circle for boss-type enemies - smaller and faster
      if (enemyType && enemyType >= EnemyType.CRUISER) {
        const innerCircle = this.add.circle(x, y, 8, tint, 0.7); // Smaller radius
        this.tweens.add({
          targets: innerCircle,
          scale: { from: 0.8, to: 2 }, // Reduced max scale
          alpha: { from: 0.7, to: 0 },
          duration: 500, // Shorter duration
          ease: 'Cubic.easeOut', // Changed from Bounce for faster effect
          onComplete: () => {
            innerCircle.destroy();
          },
        });
      }

      console.log(`[StarshipScene] Enhanced explosion effect created at (${x},${y})`);

      console.log(
        `[StarshipScene] Explosion created with ${particleCount} particles and tint 0x${tint.toString(16)}`
      );

      // Auto-destroy the particle effect after animation completes
      this.time.delayedCall(lifespan + 100, () => {
        if (particleEffect) {
          particleEffect.destroy();
        }
      });
    } catch (error) {
      console.error('[StarshipScene] Error creating explosion effects:', error);

      // Create a fallback explosion with simple shapes
      try {
        // Create a cross of rectangles that expand outward - smaller and faster
        const colors = [0xffffff, tint];

        for (let i = 0; i < 2; i++) {
          // Horizontal rectangle - smaller
          const hRect = this.add.rectangle(x, y, 40, 6, colors[i], 0.8);

          // Vertical rectangle - smaller
          const vRect = this.add.rectangle(x, y, 6, 40, colors[i], 0.8);

          // Animate them - faster and smaller scale
          this.tweens.add({
            targets: [hRect, vRect],
            scaleX: { from: 0.2, to: 1.5 },
            scaleY: { from: 0.2, to: 1.5 },
            alpha: { from: 0.8, to: 0 },
            duration: 250 + i * 100, // Shorter duration
            delay: i * 50, // Less delay
            onComplete: () => {
              hRect.destroy();
              vRect.destroy();
            },
          });
        }

        // Add a pulsing center - smaller and faster
        const center = this.add.circle(x, y, 10, tint, 1); // Smaller radius
        this.tweens.add({
          targets: center,
          scale: { from: 0.5, to: 1.5 }, // Reduced max scale
          alpha: { from: 1, to: 0 },
          duration: 200, // Shorter duration
          ease: 'Cubic.easeOut',
          onComplete: () => center.destroy(),
        });
      } catch (fallbackError) {
        // Absolute last resort - simple flash - smaller and faster
        console.error('[StarshipScene] Even fallback explosion failed:', fallbackError);
        const flash = this.add.rectangle(x, y, 50, 50, 0xffffff, 0.8); // Smaller size
        this.tweens.add({
          targets: flash,
          alpha: { from: 0.8, to: 0 },
          duration: 200, // Shorter duration
          onComplete: () => flash.destroy(),
        });
      }
    }

    // Add a camera shake effect for feedback (this works even if particles fail)
    this.cameras.main.shake(50, 0.008); // Reduced duration and intensity
  } /**
   * Create a particle texture for explosion effects
   * This is simpler now since we're loading the particle.png in preload
   */
  private createParticleTexture(): void {
    console.log('[StarshipScene] Creating fallback particle texture');

    // Skip if texture already exists
    if (this.textures.exists('particle')) {
      console.log('[StarshipScene] Particle texture already exists, skipping creation');
      return;
    }

    // Create a fallback particle texture
    const g = this.add.graphics();
    const size = 16; // Larger size for better visibility
    const center = size / 2;

    // Create a bright, visible particle with concentric circles
    g.fillStyle(0xffffff, 1);
    g.fillCircle(center, center, center); // Full size white circle

    // Add a brighter center
    g.fillStyle(0xffffaa, 1);
    g.fillCircle(center, center, center * 0.6);

    // Generate the texture
    g.generateTexture('particle', size, size);
    g.destroy();

    console.log('[StarshipScene] Fallback particle texture created');
  }

  // ---------- helpers: create fallbacks to avoid green boxes ----------
  private ensureTextures(skipStars = false) {
    // Ship
    if (!this.textures.exists('ship')) {
      this.createShipFallback('ship_fallback');
      this.tex.ship = 'ship_fallback';
    } else {
      this.tex.ship = 'ship';
    }

    // Bullet
    if (!this.textures.exists('bullet')) {
      this.createCircleFallback('bullet_fallback', 8, 0xffffff);
      this.tex.bullet = 'bullet_fallback';
    } else {
      this.tex.bullet = 'bullet';
    }

    // Enemy
    if (!this.textures.exists('enemy')) {
      this.createRectFallback('enemy_fallback', 32, 32, 0xff3333);
      this.tex.enemy = 'enemy_fallback';
    } else {
      this.tex.enemy = 'enemy';
    }

    if (skipStars) {
      return;
    }

    // Stars background
    // If the texture doesn't exist, create a fallback
    if (!this.textures.exists('stars')) {
      console.warn(`[StarshipScene] Default 'stars' texture not found. Creating fallback.`);
      this.createGenericTexture('stars_fallback', 0x00001a, 256, 256);
      this.tex.stars = 'stars_fallback';
    } else {
      this.tex.stars = 'stars';
    }

    // Create the starfield if it doesn't exist or recreate it
    if (!this.starfield) {
      this.starfield = this.add
        .tileSprite(
          this.scale.width / 2,
          this.scale.height / 2,
          this.scale.width,
          this.scale.height,
          this.tex.stars
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(-10);
    }
  }

  private createShipFallback(key: string) {
    const g = this.add.graphics();
    g.clear();
    g.fillStyle(0xffffff, 1);
    // triangle pointing up in a 48x48 box
    g.beginPath();
    g.moveTo(24, 4);
    g.lineTo(44, 44);
    g.lineTo(4, 44);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private createCircleFallback(key: string, size: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createRectFallback(key: string, w: number, h: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /**
   * Creates a shield visual fallback when shield texture doesn't exist
   */
  private createShieldFallback(key: string): void {
    console.log(`[StarshipScene] Creating shield fallback texture for ${key}`);

    const g = this.add.graphics();
    g.clear();

    // Create a circular blue shield with glow effect
    // First draw a semi-transparent outer glow
    g.fillStyle(0x00ccff, 0.3);
    g.fillCircle(32, 32, 30);

    // Draw main shield with gradient
    g.lineStyle(2, 0x0088cc);
    g.fillStyle(0x00aaff, 0.6);
    g.fillCircle(32, 32, 25);
    g.strokeCircle(32, 32, 25);

    // Add inner highlight
    g.fillStyle(0x99eeff, 0.7);
    g.fillCircle(32 - 5, 32 - 5, 8);

    // Generate the texture and clean up
    g.generateTexture(key, 64, 64);
    g.destroy();

    console.log(`[StarshipScene] Created shield fallback texture with key: ${key}`);
  }

  /**
   * Activates the score multiplier power-up with visual feedback
   */
  private activatePowerUp(type: PowerUpType): void {
    // If power-up is already active, just reset its timer
    if (this.activePowerUps.has(type)) {
      this.activePowerUps.get(type)?.remove();
    }

    let iconTexture = 'powerup_score';
    let labelText = 'x2';

    // Apply effect based on type
    switch (type) {
      case PowerUpType.SCORE_MULTIPLIER:
        this.scoreMultiplier = 2;
        iconTexture = 'powerup_score';
        labelText = 'x2';
        break;
      case PowerUpType.RAPID_FIRE:
        this.fireRate = 100; // Faster fire rate
        iconTexture = 'powerup_rapidfire';
        labelText = 'RAPID';
        break;
      case PowerUpType.SHIELD:
        this.isShieldActive = true;
        iconTexture = 'powerup_shield';
        labelText = 'SHIELD';

        // Create shield texture if it doesn't exist
        if (!this.textures.exists('shield')) {
          console.log('[StarshipScene] Shield texture not found, creating fallback');
          this.createShieldFallback('shield');
        }

        // Clean up any existing shield object
        if (this.shieldObject) {
          this.shieldObject.destroy();
          this.shieldObject = undefined;
        }

        // Create and show shield visual around player
        if (this.player) {
          this.shieldObject = this.add.sprite(this.player.x, this.player.y, 'shield');
          this.shieldObject.setScale(0.4);
          this.shieldObject.setAlpha(0.8);
          this.shieldObject.setVisible(true);

          // Add a pulse effect to the shield
          this.tweens.add({
            targets: this.shieldObject,
            alpha: { from: 0.8, to: 0.6 },
            scale: { from: 0.38, to: 0.42 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
          });
        }
        break;
    }

    // Create or update UI entry for this power-up
    this.ensurePowerUpTexture(iconTexture);
    let ui = this.powerUpUI.get(type);
    if (!ui) {
  const index = this.powerUpUI.size; // zero-based index for layout
  // Vertical list positioning
  const x = this.powerUpBasePos.x;
  const y = this.powerUpBasePos.y + index * this.powerUpSpacing;
  // Background plate for better contrast against starfield
  const circle = this.add.graphics().setDepth(99);
  circle.fillStyle(0x000000, 0.55);
  circle.lineStyle(2, 0x555555, 0.8);
  circle.fillCircle(x, y, 26);
  circle.strokeCircle(x, y, 26);
  // Larger, clearer icon; ensure texture exists (fallback created earlier if missing)
  const icon = this.add.sprite(x, y, iconTexture).setScale(0.75).setAlpha(0).setDepth(101);
  // Add a subtle outline via tint flash approach (first frame only)
  icon.setTint(0xffffff);
      const label = this.add
        .text(x + 25, y, labelText, {
          fontSize: '16px',
          color: '#ffcc00',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      ui = { icon, circle, label };
      this.powerUpUI.set(type, ui);
    } else {
      // Re-activating existing power-up before fade-out destroy finished can cause race conditions.
      // Stop any active tweens affecting icon/label (especially fade-out) to keep them visible.
      try {
        const iconTweens = this.tweens.getTweensOf(ui.icon);
        iconTweens.forEach((t) => t.stop());
        const labelTweens = this.tweens.getTweensOf(ui.label);
        labelTweens.forEach((t) => t.stop());
      } catch (e) {
        // Safe guard – ignore if tween manager API differs.
      }
      ui.icon.setTexture(iconTexture);
      ui.label.setText(labelText);
      ui.icon.setAlpha(1);
      ui.label.setAlpha(1);
    }

    // Re-layout all existing power-up UI entries (compact them)
    Array.from(this.powerUpUI.entries()).forEach(([_ignoredType, entry], idx) => {
      const targetX = this.powerUpBasePos.x;
      const targetY = this.powerUpBasePos.y + idx * this.powerUpSpacing;
      this.tweens.add({ targets: entry.icon, x: targetX, y: targetY, duration: 200, ease: 'Sine.Out' });
      this.tweens.add({ targets: entry.label, x: targetX + 25, y: targetY, duration: 200, ease: 'Sine.Out' });
      entry.circle.x = 0; // circle will be redrawn relative to icon position
    });

    // Reveal / bounce icon & ensure label visible
  ui.icon.setScale(0.85); // start slightly larger before bounce
    ui.icon.setAlpha(1);
    ui.label.setAlpha(1);
  this.tweens.add({ targets: ui.icon, scale: 0.75, duration: 300, ease: 'Bounce.Out' });
    if (ui.label.alpha < 1) {
      this.tweens.add({ targets: ui.label, alpha: 1, duration: 200 });
    }

    // Draw initial timer arc for this power-up
    this.updatePowerUpTimerUI();

    // Set up the timer to deactivate power-up
    const timer = this.time.addEvent({
      delay: this.powerUpDuration,
      callback: () => this.deactivatePowerUp(type),
    });
    this.activePowerUps.set(type, timer);
  }

  /**
   * Deactivates the currently active power-up.
   */
  private deactivatePowerUp(type: PowerUpType): void {
    if (!this.activePowerUps.has(type)) return;

    // Revert effect based on type
    if (type === PowerUpType.SCORE_MULTIPLIER) {
      this.scoreMultiplier = 1;
    } else if (type === PowerUpType.RAPID_FIRE) {
      this.fireRate = 200; // Reset fire rate
    } else if (type === PowerUpType.SHIELD) {
      this.isShieldActive = false;
      if (this.shieldObject) {
        // Optional: add a fade-out tween
        this.shieldObject.setVisible(false);
      }
    }

    // remove timer and from map
    this.activePowerUps.get(type)?.remove();
    this.activePowerUps.delete(type);

    // Immediate removal of UI to avoid race conditions with rapid re-activation
    const ui = this.powerUpUI.get(type);
    if (ui) {
      ui.icon.destroy();
      ui.label.destroy();
      ui.circle.destroy();
      this.powerUpUI.delete(type);
      // Re-layout remaining entries
      Array.from(this.powerUpUI.values()).forEach((entry, idx) => {
        const targetX = this.powerUpBasePos.x;
        const targetY = this.powerUpBasePos.y + idx * this.powerUpSpacing;
        this.tweens.add({ targets: entry.icon, x: targetX, y: targetY, duration: 200, ease: 'Sine.Out' });
        this.tweens.add({ targets: entry.label, x: targetX + 25, y: targetY, duration: 200, ease: 'Sine.Out' });
      });
    }
    this.updatePowerUpTimerUI();
  }

  private deactivateAllPowerUps(): void {
    const typesToDeactivate = Array.from(this.activePowerUps.keys());
    typesToDeactivate.forEach((type) => this.deactivatePowerUp(type));
  }

  private createGenericTexture(key: string, color: number, w = 32, h = 32): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /**
   * Ensures a texture exists, creating a fallback if needed.
   */
  private ensurePowerUpTexture(key: string): void {
    if (this.textures.exists(key)) {
      return;
    }
    // Simple fallback for now, we can make this more specific later
    this.createPowerUpFallback(key);
  }

  /**
   * Creates a star-shaped power-up icon as fallback
   */
  private createPowerUpFallback(key: string): void {
    console.log(`[StarshipScene] Creating fallback texture for ${key}`);

    const g = this.add.graphics();
    g.clear();

    // Choose color based on power-up type
    if (key === 'powerup_shield') {
      g.fillStyle(0x00aaff);
    } else if (key === 'powerup_score') {
      g.fillStyle(0xffaa00);
    } else if (key === 'powerup_rapidfire') {
      g.fillStyle(0xff5500);
    } else {
      g.fillStyle(0xffffff);
    }

    // Draw a simple shape
    g.fillCircle(16, 16, 14);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(16, 16, 14);

    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  /**
   * Sets up the power-up UI elements
   */

  /**
   * Sets up the power-up UI with icon and timer circle
   */
  private setupPowerUpUI(): void {
    // Legacy single UI replaced by dynamic multi-powerup system.
    // Nothing needed at scene start; entries are created on activation.
  }

  private updatePowerUpTimerUI(): void {
    // For each active power-up, draw / update its timer arc
    this.powerUpUI.forEach((ui, type) => {
      const timer = this.activePowerUps.get(type);
      ui.circle.clear();
      if (!timer) {
        ui.icon.setAlpha(0);
        ui.label.setAlpha(0);
        return;
      }
      // Defensive: ensure texture still valid (some browsers may purge or a race might have destroyed and re-added incorrectly)
      if (!ui.icon.texture || ui.icon.frame.name === '__MISSING') {
        const fallbackKey = this.resolvePowerUpTexture(type);
        this.ensurePowerUpTexture(fallbackKey);
        ui.icon.setTexture(fallbackKey);
        ui.icon.setAlpha(1);
      }
      // Defensive: if alpha got set to 0 unexpectedly but timer still active, restore
      if (ui.icon.alpha === 0) ui.icon.setAlpha(1);
      if (ui.label.alpha === 0) ui.label.setAlpha(1);
      const progress = timer.getRemaining() / this.powerUpDuration; // 1 -> 0
      const x = ui.icon.x;
      const y = ui.icon.y;
      // Background circle (solid + stroke for consistency)
      ui.circle.fillStyle(0x000000, 0.4);
      ui.circle.fillCircle(x, y, 22);
      ui.circle.lineStyle(2, 0x222222, 0.9);
      ui.circle.strokeCircle(x, y, 22);
      if (progress > 0) {
        // Per-type accent colors
        let color = 0xffff00; // default (score/x2)
        if (type === PowerUpType.SHIELD) color = 0x00b7ff;
        else if (type === PowerUpType.RAPID_FIRE) color = 0xff6600;
        else if (type === PowerUpType.SCORE_MULTIPLIER) color = 0xf7c94d;
        ui.circle.lineStyle(3, color, 1);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * progress;
        ui.circle.beginPath();
        ui.circle.arc(x, y, 22, startAngle, endAngle, false);
        ui.circle.strokePath();
      }
    });
  }

  // Resolve canonical texture key for a power-up type
  private resolvePowerUpTexture(type: PowerUpType): string {
    switch (type) {
      case PowerUpType.SHIELD:
        return 'powerup_shield';
      case PowerUpType.RAPID_FIRE:
        return 'powerup_rapidfire';
      case PowerUpType.SCORE_MULTIPLIER:
      default:
        return 'powerup_score';
    }
  }

  shutdown(): void {
    console.log('[StarshipScene] shutdown method called');

    // Disable collision detection first
    this.collisionsActive = false;

    // Clean up enemy manager
    if (this.enemyManager) {
      console.log('[StarshipScene] Cleaning up enemy manager');
      this.enemyManager.destroy();
    }

    // 1. Clean up all timers
    if (this.testCompletionMonitor) {
      this.testCompletionMonitor.remove();
      this.testCompletionMonitor = undefined;
    }
    this.testCompleted = false;
    this.expectedEnemiesToDefeat = 0;

    // Remove test-related listeners
    this.events.off('test:stop', this.handleTestStop, this);
    this.events.off('enemy:removed', this.checkForTestCompletion, this);
    // Deactivate any active power-up and their timers
    this.deactivateAllPowerUps();

    // Clean up game timers
    console.log('[StarshipScene] Cleaning up timers');
    if (this.difficultyTimer) {
      console.log('[StarshipScene] Removing difficulty timer in shutdown');
      this.difficultyTimer.remove();
      this.difficultyTimer = null as unknown as Phaser.Time.TimerEvent;
    }
    if (this.scoreMultiplierTimer) {
      console.log('[StarshipScene] Removing score multiplier timer in shutdown');
      this.scoreMultiplierTimer.remove();
      this.scoreMultiplierTimer = null as unknown as Phaser.Time.TimerEvent;
    }

    // Make sure all active power-up timers are removed
    this.activePowerUps.forEach((timer) => timer.remove());
    this.activePowerUps.clear();

    // 2. Clean up sound objects
    if (this.shootSfx) {
      this.shootSfx.stop();
      // Nullify but preserve the type
      this.shootSfx = null as unknown as Phaser.Sound.BaseSound;
    }
    if (this.boomSfx) {
      this.boomSfx.stop();
      this.boomSfx = null as unknown as Phaser.Sound.BaseSound;
    }

    // 3. Clean up input
    if (this.input && this.input.keyboard) {
      // Remove key captures
      this.input.keyboard.clearCaptures();

      // Remove key objects
      if (this.keys) {
        this.input.keyboard.removeKey(this.keys.W);
        this.input.keyboard.removeKey(this.keys.A);
        this.input.keyboard.removeKey(this.keys.S);
        this.input.keyboard.removeKey(this.keys.D);
        this.input.keyboard.removeKey(this.keys.SPACE);
        this.keys = null as unknown as {
          W: Phaser.Input.Keyboard.Key;
          A: Phaser.Input.Keyboard.Key;
          S: Phaser.Input.Keyboard.Key;
          D: Phaser.Input.Keyboard.Key;
          SPACE: Phaser.Input.Keyboard.Key;
        };
      }

      if (this.cursors) {
        this.input.keyboard.removeKey(this.cursors.up);
        this.input.keyboard.removeKey(this.cursors.down);
        this.input.keyboard.removeKey(this.cursors.left);
        this.input.keyboard.removeKey(this.cursors.right);
        this.input.keyboard.removeKey(this.cursors.space);
        this.cursors = null as unknown as Phaser.Types.Input.Keyboard.CursorKeys;
      }
    }

    // 4. Clean up physics groups - ensure all game objects are properly destroyed
    if (this.bullets) {
      this.bullets.clear(true, true); // destroy=true, removeFromScene=true
    }
    if (this.enemies) {
      this.enemies.clear(true, true);
    }
    if (this.powerUps) {
      this.powerUps.clear(true, true);
    }

    // 5. Clean up any remaining game objects
    if (this.shieldObject) {
      this.shieldObject.destroy();
      this.shieldObject = undefined;
    }
    // Cleanup multi power-up UI entries
    this.powerUpUI.forEach((ui) => {
      ui.icon.destroy();
      ui.label.destroy();
      ui.circle.destroy();
    });
    this.powerUpUI.clear();

    // Reset game state variables
    this.score = 0;
    this.scoreMultiplier = 1;
    this.fireRate = 200;
    this.lastFired = 0;
    this.difficulty = 1;

    // Clear test-related registry flags and counters to avoid stale state on next run
    try {
      this.registry.set('testMode', false);
      this.registry.set('buildModeTest', false);
      this.registry.set('isBuildModeTest', false);
      this.registry.set('enemiesDefeated', 0);
      this.registry.set('playerDeaths', 0);
      this.registry.set('powerupsCollected', 0);
      // Clear test level data reference
      this.registry.set('testLevelData', undefined);
      // Clear any camera translation used during test
      this.registry.set('testTranslate', undefined);
    } catch (e) {
      console.warn('[StarshipScene] Failed to clear registry test flags:', e);
    }

    console.log('[StarshipScene] Shutdown completed, all resources cleaned up');
  }

  /**
   * Handle test stop event from TestStep
   */
  private handleTestStop(): void {
    console.log('[StarshipScene] Received test stop event');

    // Send final statistics to the BuildMode scene
    this.sendTestStats();

    // Signal that the test is complete
    this.events.emit('test:completed');
  }

  /**
   * Send current test statistics back to the BuildMode scene
   */
  private sendTestStats(): void {
    if (this.registry.get('buildModeTest') !== true) {
      return;
    }

    // Compile statistics
    const stats = {
      score: this.score,
      enemiesDefeated: this.registry.get('enemiesDefeated') || 0,
      playerDeaths: this.registry.get('playerDeaths') || 0,
      powerupsCollected: this.registry.get('powerupsCollected') || 0,
    };

    console.log('[StarshipScene] Sending test stats:', stats);

    // Send stats to the parent scene
    this.scene.get('BuildModeScene').events.emit('test:stats', stats);
  }

  /**
   * Set up the scene with custom level data from the Build Mode
   * @param levelData The level data to use
   */
  private setupCustomLevel(levelData: {
    entities: Array<{
      type: string;
      position?: { x: number; y: number };
      enemyType?: string;
    }>;
    settings: { name: string };
  }): void {
    console.log('[StarshipScene] Setting up custom level:', levelData.settings.name);

    // If DesignStep provided a translation, apply it to entity positions
    const translate = this.registry.get('testTranslate') as { dx: number; dy: number } | undefined;
    const dx = translate?.dx ?? 0;
    const dy = translate?.dy ?? 0;
    const usingTranslate = dx !== 0 || dy !== 0;
    if (usingTranslate) {
      console.log('[StarshipScene] Applying design-camera translation to test entities:', {
        dx,
        dy,
      });
    }
    const effectiveLevelData = usingTranslate
      ? {
          ...levelData,
          entities: levelData.entities.map((e) =>
            e.position
              ? {
                  ...e,
                  position: { x: Math.floor(e.position.x + dx), y: Math.floor(e.position.y + dy) },
                }
              : e
          ),
        }
      : levelData;

    // Detailed log of what we're working with
    console.log('[StarshipScene] Custom level details:', {
      name: effectiveLevelData.settings.name,
      entitiesCount: effectiveLevelData.entities?.length || 0,
      validEntities: effectiveLevelData.entities?.filter((e) => e.type && e.position).length || 0,
      enemySpawners:
        effectiveLevelData.entities?.filter((e) => e.type === 'ENEMY_SPAWNER').length || 0,
    });

    // Stop the default enemy spawning
    console.log('[StarshipScene] Stopping default enemy spawning');
    this.enemyManager.stopSpawning();

    if (!effectiveLevelData.entities || !Array.isArray(effectiveLevelData.entities)) {
      console.error('[StarshipScene] No entities found in level data, using default spawning');
      this.enemyManager.startSpawning(1000);
      return;
    }

    // Log entity types to help debug
    const entityTypeCounts: Record<string, number> = {};
    const enemyTypes: Record<string, number> = {};
    effectiveLevelData.entities.forEach((e) => {
      if (e.type) {
        entityTypeCounts[e.type] = (entityTypeCounts[e.type] || 0) + 1;

        // Count enemy types for better debugging
        if (e.type === 'ENEMY_SPAWNER' || String(e.type).includes('ENEMY_SPAWNER')) {
          const enemyEntity = e as unknown as { enemyType?: string };
          const enemyType = enemyEntity.enemyType || 'unknown';
          enemyTypes[enemyType] = (enemyTypes[enemyType] || 0) + 1;
        }
      }
    });
    console.log('[StarshipScene] Entity types in level data:', entityTypeCounts);
    console.log('[StarshipScene] Enemy types in level data:', enemyTypes);

    // Set up custom entities from the level data
    const { EntityType } = this.getEntityTypes();
    const { EnemySpawnerType } = this.getEntityTypes();

    // Log entity type mappings for debugging
    console.log('[StarshipScene] Available EntityTypes:');
    Object.entries(EntityType).forEach(([key, value]) => {
      console.log(`[StarshipScene]   - ${key}: '${value}'`);
    });

    console.log('[StarshipScene] Available EnemySpawnerTypes:');
    Object.entries(EnemySpawnerType).forEach(([key, value]) => {
      console.log(`[StarshipScene]   - ${key}: '${value}'`);
    });

    let enemiesPlaced = 0;

    // Process each entity in the level data
    levelData.entities.forEach((entity, index) => {
      console.log(`[StarshipScene] Processing entity ${index}:`, entity);

      // Use a more flexible approach to entity type checking
      const entityType = entity.type || '';
      const isEnemySpawner =
        entityType === EntityType.ENEMY_SPAWNER ||
        entityType === 'ENEMY_SPAWNER' ||
        entityType.includes('ENEMY_SPAWNER');

      console.log(
        `[StarshipScene] Entity type: '${entityType}', is enemy spawner: ${isEnemySpawner}`
      );

      // Check all properties to see what we're working with
      const entityKeys = Object.keys(entity);
      console.log('[StarshipScene] Entity keys:', entityKeys);

      // Extract enemyType property using multiple approaches
      let enemyType;

      // Type assertion with a specific interface to avoid 'any'
      interface EntityWithEnemyType {
        enemyType?: string;
        properties?: {
          enemyType?: string;
        };
      }

      const typedEntity = entity as EntityWithEnemyType & Record<string, unknown>;

      // Try multiple approaches to find the enemy type
      if (typedEntity.enemyType) {
        enemyType = typedEntity.enemyType;
      } else if (
        entityKeys.includes('properties') &&
        typedEntity.properties &&
        typedEntity.properties.enemyType
      ) {
        enemyType = typedEntity.properties.enemyType;
      } else if (typeof typedEntity === 'object') {
        // Deep search for enemyType property at any level
        const findEnemyType = (obj: Record<string, unknown>): string | undefined => {
          for (const key in obj) {
            if (key === 'enemyType' && typeof obj[key] === 'string') {
              return obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              const found = findEnemyType(obj[key] as Record<string, unknown>);
              if (found) return found;
            }
          }
          return undefined;
        };

        enemyType = findEnemyType(typedEntity);
      }

      console.log('[StarshipScene] Extracted enemyType:', enemyType);

      // Process enemy spawner entities
      if (isEnemySpawner && entity.position) {
        console.log('[StarshipScene] Valid enemy spawner found:', {
          type: entity.type,
          position: entity.position,
          enemyType: enemyType,
        });

        // Spawn enemy at the entity position
        try {
          if (enemyType) {
            this.spawnEnemyFromEntity({
              position: entity.position,
              enemyType: enemyType,
            });
            enemiesPlaced++;
            console.log(
              `[StarshipScene] Enemy ${index} placed successfully at position:`,
              entity.position
            );
          } else {
            // If enemyType is still not found, try to use a default based on entity properties
            console.log(`[StarshipScene] Attempting to use default enemy type for entity:`, entity);

            // Use FIGHTER as a default type if nothing else is specified
            const defaultEnemyType = 'FIGHTER';
            this.spawnEnemyFromEntity({
              position: entity.position,
              enemyType: defaultEnemyType,
            });
            enemiesPlaced++;
            console.log(
              `[StarshipScene] Enemy ${index} placed with default type (${defaultEnemyType}) at position:`,
              entity.position
            );
          }
        } catch (error) {
          console.error(`[StarshipScene] Failed to spawn enemy ${index}:`, error);
        }
      } else {
        console.log(`[StarshipScene] Skipping entity ${index}, not a valid enemy spawner:`, {
          type: entity.type,
          expectedType: EntityType.ENEMY_SPAWNER,
          hasPosition: !!entity.position,
          hasEnemyType: !!entity.enemyType,
        });
      }
      // We could also handle other entity types here (obstacles, powerups, etc.)
    });

    console.log(
      `[StarshipScene] Placed ${enemiesPlaced} enemies from custom level. Expected: ${effectiveLevelData.entities.filter((e) => e.type === EntityType.ENEMY_SPAWNER).length}`
    );

    // Track expected kills for Build Mode auto-completion: only count placed enemies
    if (this.registry.get('buildModeTest') === true) {
      this.expectedEnemiesToDefeat = enemiesPlaced;
      // Reset defeated count at start of a test just in case
      this.registry.set('enemiesDefeated', 0);
      console.log(
        `[StarshipScene] Build test: expecting ${this.expectedEnemiesToDefeat} enemies to be defeated by fire`
      );
    }

    // For Build Mode tests, do NOT auto-respawn or revert to default spawns.
    // Designers expect only their placed enemies to appear.
    if (this.registry.get('buildModeTest') === true) {
      if (enemiesPlaced === 0) {
        console.log(
          '[StarshipScene] No enemy spawners found in custom level; staying idle in build test'
        );
      } else {
        console.log('[StarshipScene] Build test: skipping auto-respawn timer');
      }
    } else {
      // In normal play, keep screen from being empty
      if (enemiesPlaced > 0) {
        this.time.addEvent({
          delay: 3000,
          callback: () => this.respawnEnemiesIfNeeded(effectiveLevelData),
          loop: true,
        });
      } else {
        console.log('[StarshipScene] No enemy spawners found; using default spawning');
        this.enemyManager.startSpawning(1200);
      }
    }
  }

  /**
   * Spawn an enemy from a level entity definition
   * @param entity The enemy spawner entity
   */
  private spawnEnemyFromEntity(entity: {
    position: { x: number; y: number };
    enemyType: string;
  }): void {
    console.log('[StarshipScene] spawnEnemyFromEntity called with:', entity);

    const { EnemySpawnerType } = this.getEntityTypes();
    const { EnemyType } = this.getEnemyEnumValues();

    console.log('[StarshipScene] Available EnemySpawnerTypes:', EnemySpawnerType);
    console.log('[StarshipScene] Available EnemyTypes:', EnemyType);

    // Get position from the entity
    const { x, y } = entity.position;
    console.log(`[StarshipScene] Entity position: x=${x}, y=${y}`);

    // Determine enemy type
    let enemyType: number = EnemyType.FIGHTER; // Default
    console.log('[StarshipScene] Entity.enemyType:', entity.enemyType);

    // Convert from BuildMode entity spawner type to game enemy type
    console.log(`[StarshipScene] Converting entity type '${entity.enemyType}' to enemy type...`);

    // Normalize the enemy type string for more robust matching
    const normalizedType = entity.enemyType.toUpperCase();

    // Map enemy types with fallback for variations in naming
    if (normalizedType === EnemySpawnerType.FIGHTER || normalizedType.includes('FIGHTER')) {
      enemyType = EnemyType.FIGHTER;
      console.log('[StarshipScene] Mapped to FIGHTER');
    } else if (normalizedType === EnemySpawnerType.SCOUT || normalizedType.includes('SCOUT')) {
      enemyType = EnemyType.SCOUT;
      console.log('[StarshipScene] Mapped to SCOUT');
    } else if (normalizedType === EnemySpawnerType.CRUISER || normalizedType.includes('CRUISER')) {
      enemyType = EnemyType.CRUISER;
      console.log('[StarshipScene] Mapped to CRUISER');
    } else if (normalizedType === EnemySpawnerType.SEEKER || normalizedType.includes('SEEKER')) {
      enemyType = EnemyType.SEEKER;
      console.log('[StarshipScene] Mapped to SEEKER');
    } else if (normalizedType === EnemySpawnerType.GUNSHIP || normalizedType.includes('GUNSHIP')) {
      enemyType = EnemyType.GUNSHIP;
      console.log('[StarshipScene] Mapped to GUNSHIP');
    } else if (normalizedType === EnemySpawnerType.RANDOM || normalizedType.includes('RANDOM')) {
      // Pick a random enemy type based on difficulty
      enemyType = this.getRandomEnemyType();
      console.log('[StarshipScene] RANDOM type - selected:', enemyType);
    } else {
      // Default to fighter if we can't determine the type
      enemyType = EnemyType.FIGHTER;
      console.log(
        `[StarshipScene] Unknown enemy type '${entity.enemyType}', defaulting to FIGHTER`
      );
    }

    // Create the enemy
    console.log(
      `[StarshipScene] Calling enemyManager.spawnEnemyAtPosition with: type=${enemyType}, x=${x}, y=${y}`
    );
    this.enemyManager.spawnEnemyAtPosition(enemyType, x, y);

    console.log(`[StarshipScene] Spawned enemy of type ${enemyType} at position (${x}, ${y})`);
  }

  /**
   * Get a reference to the entity type enums used in BuildMode
   */
  private getEntityTypes(): {
    EntityType: {
      PLAYER_START: string;
      ENEMY_SPAWNER: string;
      OBSTACLE: string;
      POWERUP_SPAWNER: string;
      DECORATION: string;
      TRIGGER: string;
    };
    EnemySpawnerType: {
      RANDOM: string;
      FIGHTER: string;
      SCOUT: string;
      CRUISER: string;
      SEEKER: string;
      GUNSHIP: string;
    };
  } {
    return {
      EntityType: {
        PLAYER_START: 'PLAYER_START',
        ENEMY_SPAWNER: 'ENEMY_SPAWNER',
        OBSTACLE: 'OBSTACLE',
        POWERUP_SPAWNER: 'POWERUP_SPAWNER',
        DECORATION: 'DECORATION',
        TRIGGER: 'TRIGGER',
      },
      EnemySpawnerType: {
        RANDOM: 'RANDOM',
        FIGHTER: 'FIGHTER',
        SCOUT: 'SCOUT',
        CRUISER: 'CRUISER',
        SEEKER: 'SEEKER',
        GUNSHIP: 'GUNSHIP',
      },
    };
  }

  /**
   * Get the actual enemy type enum values
   */
  private getEnemyEnumValues(): {
    EnemyType: {
      FIGHTER: number;
      SCOUT: number;
      CRUISER: number;
      SEEKER: number;
      GUNSHIP: number;
    };
  } {
    return {
      EnemyType: {
        FIGHTER: 0,
        SCOUT: 1,
        CRUISER: 2,
        SEEKER: 3,
        GUNSHIP: 4,
      },
    };
  }

  /**
   * Get a random enemy type based on the current difficulty
   */
  private getRandomEnemyType(): number {
    const { EnemyType } = this.getEnemyEnumValues();

    // Probability distribution based on difficulty
    const difficultyLevel = Math.min(this.difficulty, 10);

    // Higher difficulty = chance for more advanced enemies
    if (difficultyLevel >= 8) {
      // Any enemy type possible
      return Phaser.Math.Between(0, 4);
    } else if (difficultyLevel >= 5) {
      // No elite gunships at this level
      return Phaser.Math.Between(0, 3);
    } else if (difficultyLevel >= 3) {
      // Basic enemies plus occasional scouts
      return Phaser.Math.Between(0, 1);
    } else {
      // Just fighters at low difficulty
      return EnemyType.FIGHTER;
    }
  }

  /**
   * Check if we need to respawn enemies and do so if the screen is empty
   */
  private respawnEnemiesIfNeeded(levelData: {
    entities: Array<{
      type: string;
      position?: { x: number; y: number };
      enemyType?: string;
    }>;
  }): void {
    // Skip in Build Mode custom-level tests
    if (this.registry.get('buildModeTest') === true) {
      return;
    }

    // Only respawn if there are few enemies on screen
    if (this.enemies.countActive() < 2) {
      console.log('[StarshipScene] Respawning enemies from level data');

      // Find an enemy spawner entity to use
      const { EntityType } = this.getEntityTypes();
      const spawners = levelData.entities.filter(
        (e) => e.type === EntityType.ENEMY_SPAWNER && e.position && e.enemyType
      ) as Array<{
        type: string;
        position: { x: number; y: number };
        enemyType: string;
      }>;

      if (spawners.length > 0) {
        // Pick a random spawner
        const index = Phaser.Math.Between(0, spawners.length - 1);
        const spawner = spawners[index];

        if (spawner) {
          // Spawn 1-3 enemies
          const count = Phaser.Math.Between(1, 3);
          for (let i = 0; i < count; i++) {
            this.spawnEnemyFromEntity(spawner);
          }
        }
      }
    }
  }

  // ===== Build Mode Test Completion Helpers =====
  private startTestCompletionMonitor(): void {
    if (this.registry.get('buildModeTest') !== true) return;
    if (this.testCompletionMonitor) this.testCompletionMonitor.remove();
    this.testCompletionMonitor = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => this.checkForTestCompletion(),
    });
  }

  private checkForTestCompletion(): void {
    if (this.registry.get('buildModeTest') === true && !this.testCompleted) {
      const expected = this.expectedEnemiesToDefeat || 0;
      if (expected <= 0) return; // Do not auto-complete when nothing was placed
      const defeated = this.registry.get('enemiesDefeated') || 0;
      if (defeated >= expected) {
        console.log('[StarshipScene] All placed enemies defeated; completing build test');
        this.completeBuildTest();
        return;
      }

      // Fallback/secondary: coordinate-based approach — no active enemies in bounds
      const inBoundsActive = this.getActiveEnemiesInBounds();
      // Require at least some combat (defeated > 0) before considering fallback to avoid instant exit
      if (inBoundsActive === 0 && defeated > 0) {
        console.log('[StarshipScene] No active enemies within bounds; completing build test');
        this.completeBuildTest();
      }
    }
  }

  // Counts active enemies within an expanded playfield bounding box
  private getActiveEnemiesInBounds(marginX = 50, marginY = 100): number {
    if (!this.enemies) return 0;
    const width = this.scale.width;
    const height = this.scale.height;
    let count = 0;
    this.enemies.getChildren().forEach((child) => {
      const s = child as Phaser.Physics.Arcade.Sprite;
      if (!s || !s.active) return;
      const x = s.x;
      const y = s.y;
      const inX = x >= -marginX && x <= width + marginX;
      const inY = y >= -marginY && y <= height + marginY;
      if (inX && inY) count++;
    });
    return count;
  }

  private completeBuildTest(): void {
    if (this.testCompleted) return;
    this.testCompleted = true;
    // Send stats back first
    this.sendTestStats();
    // Notify BuildModeScene so TestStep can stop the test
    const buildModeScene = this.scene.get('BuildModeScene');
    if (buildModeScene) {
      buildModeScene.events.emit('test:completed');
    } else {
      this.events.emit('test:completed');
    }
  }
}
