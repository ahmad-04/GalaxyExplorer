import * as Phaser from 'phaser';
import { EnemyManager } from '../entities/EnemyManager';
import { Enemy } from '../entities/Enemy';

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
  private fireRate = 200; // ms
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

  // Power-up timer UI
  private powerUpIcon?: Phaser.GameObjects.Sprite;
  private powerUpLabel?: Phaser.GameObjects.Text;
  private powerUpTimerCircle?: Phaser.GameObjects.Graphics;

  // resolved texture keys (fallback-safe)
  private tex = { ship: 'ship', bullet: 'bullet', enemy: 'enemy', stars: 'stars' };

  constructor() {
    super({ key: 'StarshipScene' });
  }

  init(data?: {
    ship?: string;
    primaryTint?: number;
    secondaryTint?: number;
    combinedTextureKey?: string;
  }): void {
    console.log('[StarshipScene] init called', data);

    // Reset all game state when scene starts/restarts
    this.score = 0;
    this.difficulty = 1;
    this.lastFired = 0;
    this.scoreMultiplier = 1;
    this.activePowerUps.clear();
    this.isShieldActive = false;
    this.collisionsActive = false; // Start with collisions disabled until setup is complete

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

    // Apply background color from config if available
    const bgConfig = this.registry.get('backgroundConfig');
    if (bgConfig && bgConfig.color) {
      console.log('[StarshipScene] Setting background color from config:', bgConfig.color);
      this.cameras.main.setBackgroundColor(bgConfig.color);
    } else {
      // Default background color
      this.cameras.main.setBackgroundColor(0x000020);
    }

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

    // Adjust ship properties based on custom settings
    const speedMultiplier = bgConfig ? bgConfig.speed / 0.5 : 1;
    this.shipAcceleration = 220 + 80 * (speedMultiplier - 1);

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

    // Start enemy spawning
    this.enemyManager.startSpawning(1200);

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

        // Calculate new spawn delay
        const newDelay = Math.max(400, 1200 - this.difficulty * 80);

        // Update spawn rate in enemy manager
        this.enemyManager.stopSpawning();
        this.enemyManager.startSpawning(newDelay);
      },
    });
  }

  setupShip(ship: Phaser.Physics.Arcade.Sprite, isPrimary = true): void {
    const bgConfig = this.registry.get('backgroundConfig');
    const speedMultiplier = bgConfig ? bgConfig.speed / 0.5 : 1;

    ship.setOrigin(0.5).setAngle(-90);
    ship.setDisplaySize(128, 128);

    if (isPrimary) {
      // Set this as the main ship reference
      this.ship = ship;
      // Also set it as the player for collision detection
      this.player = ship;

      this.physics.world.enable(ship);
      ship.setCollideWorldBounds(true);

      // Apply physics settings based on speed multiplier
      const shipMaxVelocity = 260 + 50 * (speedMultiplier - 1);
      const shipDrag = 200 + 100 * (speedMultiplier - 1);
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

    // Parallax (frame-rate independent)
    const bgConfig = this.registry.get('backgroundConfig');
    const speed = bgConfig ? bgConfig.speed : 1;
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
      // gentle damping when no input
      const body = this.ship.body as Phaser.Physics.Arcade.Body;
      this.ship.setVelocity(body.velocity.x * 0.98, body.velocity.y * 0.98);
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
        this.physics.velocityFromRotation(this.ship.rotation, 500, body.velocity);
        this.time.delayedCall(1000, () => bullet.destroy());
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
      if (destroyed && 'getPoints' in enemy && typeof enemy.getPoints === 'function') {
        points = enemy.getPoints();
      }
    } else {
      // Legacy enemy - destroy immediately
      enemySprite.destroy();
    }

    // Only add points and show effects if the enemy was destroyed
    if (destroyed) {
      this.score += points * this.scoreMultiplier;
      this.scoreText.setText(`Score: ${this.score}`);
      this.cameras.main.shake(80, 0.005);
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
  }

  private onPlayerHit(enemy: Phaser.Physics.Arcade.Sprite): void {
    console.log('[StarshipScene] Player hit!');

    // Check for shield protection
    if (this.isShieldActive) {
      console.log('[StarshipScene] Shield absorbed the hit!');

      // Destroy the enemy that hit the shield
      if (enemy) {
        enemy.destroy();
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

    // Show the power-up icon with animation
    if (this.powerUpIcon) {
      this.ensurePowerUpTexture(iconTexture);
      this.powerUpIcon.setTexture(iconTexture);
      this.powerUpIcon.setAlpha(1); // Make visible

      // Update the power-up label text
      if (this.powerUpLabel) {
        this.powerUpLabel.setText(labelText);
        this.powerUpLabel.setAlpha(1); // Make visible
      }

      // Add a "pop" scale animation
      this.tweens.add({
        targets: this.powerUpIcon,
        scale: { from: 0.7, to: 0.5 },
        duration: 300,
        ease: 'Bounce.Out',
      });
    }

    // Draw the initial timer circle
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

    // Hide the power-up icon with fade out
    if (this.powerUpIcon) {
      this.tweens.add({
        targets: this.powerUpIcon,
        alpha: 0,
        duration: 300,
        ease: 'Power1',
      });
    }

    // Hide the power-up label
    if (this.powerUpLabel) {
      this.powerUpLabel.setAlpha(0);
    }

    // Clear the timer circle
    if (this.powerUpTimerCircle) {
      this.powerUpTimerCircle.clear();
    }
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

    if (key === 'powerup_shield') {
      // Blue circle for shield
      g.fillStyle(0x00ccff, 0.3);
      g.fillCircle(16, 16, 16);
      g.lineStyle(2, 0x0088cc);
      g.fillStyle(0x00aaff, 0.8);
      g.fillCircle(16, 16, 14);
      g.strokeCircle(16, 16, 14);
    } else if (key === 'powerup_rapidfire') {
      // Green triangles for rapid fire
      g.fillStyle(0x00ff00, 0.8);
      g.beginPath();
      // Triangle 1
      g.moveTo(16, 4);
      g.lineTo(22, 14);
      g.lineTo(10, 14);
      g.closePath();
      // Triangle 2
      g.moveTo(16, 12);
      g.lineTo(22, 22);
      g.lineTo(10, 22);
      g.closePath();
      // Triangle 3
      g.moveTo(16, 20);
      g.lineTo(22, 30);
      g.lineTo(10, 30);
      g.closePath();
      g.fillPath();
    } else {
      // default for score and others
      // Create a glowing background
      g.fillStyle(0xffcc00, 0.3);
      g.fillCircle(16, 16, 16);

      // Draw the outer circle
      g.lineStyle(2, 0x000000);
      g.fillStyle(0xffdd00, 1);
      g.fillCircle(16, 16, 14);
      g.strokeCircle(16, 16, 14);

      // Create a star shape
      const starPoints = 5;
      const outerRadius = 12;
      const innerRadius = 5;
      const cx = 16;
      const cy = 16;

      // Draw the star
      g.fillStyle(0xff6600, 1);
      g.lineStyle(1, 0x000000);
      g.beginPath();

      for (let i = 0; i < starPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * 2 * i) / (starPoints * 2) - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        if (i === 0) {
          g.moveTo(x, y);
        } else {
          g.lineTo(x, y);
        }
      }

      g.closePath();
      g.fillPath();
      g.strokePath();

      // Add highlight dots for sparkle effect
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 5, cy - 5, 2);
      g.fillCircle(cx + 4, cy - 2, 1);
    }

    // Generate the texture and clean up
    g.generateTexture(key, 32, 32);
    g.destroy();

    console.log(`[StarshipScene] Created fallback texture with key: ${key}`);
  }

  /**
   * Sets up the power-up UI with icon and timer circle
   */
  private setupPowerUpUI(): void {
    // Ensure the power-up texture exists before creating the icon
    this.ensurePowerUpTexture('powerup_score');

    // Create the power-up icon sprite (initially hidden)
    this.powerUpIcon = this.add.sprite(70, 70, 'powerup_score');

    // Double-check the texture to be extra safe
    if (!this.powerUpIcon.texture.key || this.powerUpIcon.frame.name === '__MISSING') {
      console.log('[StarshipScene] Power-up texture still missing, creating now');
      this.createPowerUpFallback('powerup_score');
      this.powerUpIcon.setTexture('powerup_score');
    }

    this.powerUpIcon.setScale(0.5);
    this.powerUpIcon.setAlpha(0); // Initially invisible
    this.powerUpIcon.setDepth(100); // Make sure it appears above other elements

    // Create the timer circle graphic
    this.powerUpTimerCircle = this.add.graphics();
    this.powerUpTimerCircle.setDepth(99); // Just below the icon

    // Initialize the power-up label with empty text to prevent null errors later
    this.powerUpLabel = this.add.text(this.powerUpIcon.x + 25, this.powerUpIcon.y, '', {
      fontSize: '20px',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.powerUpLabel.setOrigin(0, 0.5);
    this.powerUpLabel.setAlpha(0); // Initially invisible
  }

  private updatePowerUpTimerUI(): void {
    if (this.activePowerUps.size === 0 || !this.powerUpIcon || !this.powerUpTimerCircle) {
      if (this.powerUpTimerCircle) this.powerUpTimerCircle.clear();
      if (this.powerUpIcon) this.powerUpIcon.setAlpha(0);
      if (this.powerUpLabel) this.powerUpLabel.setAlpha(0);
      return;
    }

    // For now, just display the timer for the most recent power-up
    const lastPowerUpTimer = Array.from(this.activePowerUps.values()).pop();
    if (!lastPowerUpTimer) return;

    // Calculate the progress (0 to 1, where 0 is empty and 1 is full)
    const progress = lastPowerUpTimer.getRemaining() / this.powerUpDuration;

    // Clear previous drawing
    this.powerUpTimerCircle.clear();

    // Draw background circle
    this.powerUpTimerCircle.lineStyle(3, 0x333333, 0.5);
    this.powerUpTimerCircle.strokeCircle(this.powerUpIcon.x, this.powerUpIcon.y, 22);

    // Draw progress circle (only if there's time remaining)
    if (progress > 0) {
      // Draw the progress arc
      this.powerUpTimerCircle.lineStyle(3, 0xffff00, 1);

      // Calculate the angles for the arc (in radians)
      const startAngle = -Math.PI / 2; // Start at top (270 degrees)
      const endAngle = startAngle + Math.PI * 2 * progress; // Progress clockwise

      // Draw the arc
      this.powerUpTimerCircle.beginPath();
      this.powerUpTimerCircle.arc(
        this.powerUpIcon.x,
        this.powerUpIcon.y,
        22, // Radius
        startAngle,
        endAngle, // Start and end angles
        false // Counter-clockwise
      );
      this.powerUpTimerCircle.strokePath();
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
    if (this.powerUpIcon) {
      this.powerUpIcon.destroy();
      this.powerUpIcon = null as unknown as Phaser.GameObjects.Sprite;
    }
    if (this.powerUpLabel) {
      this.powerUpLabel.destroy();
      this.powerUpLabel = null as unknown as Phaser.GameObjects.Text;
    }
    if (this.powerUpTimerCircle) {
      this.powerUpTimerCircle.destroy();
      this.powerUpTimerCircle = null as unknown as Phaser.GameObjects.Graphics;
    }

    // Reset game state variables
    this.score = 0;
    this.scoreMultiplier = 1;
    this.fireRate = 200;
    this.lastFired = 0;
    this.difficulty = 1;

    console.log('[StarshipScene] Shutdown completed, all resources cleaned up');
  }
}
