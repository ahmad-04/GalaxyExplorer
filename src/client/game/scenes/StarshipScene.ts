import * as Phaser from 'phaser';

export class StarshipScene extends Phaser.Scene {
  private ship!: Phaser.Physics.Arcade.Sprite;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score = 0;
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
  private spawnTimer!: Phaser.Time.TimerEvent;
  private difficulty = 1;
  private starScrollDir = -1; // -1 = up, 1 = down (reversed)
  private shipAcceleration = 220;

  // resolved texture keys (fallback-safe)
  private tex = { ship: 'ship', bullet: 'bullet', enemy: 'enemy', stars: 'stars' };

  constructor() {
    super({ key: 'StarshipScene' });
  }

  init(): void {
    // Reset score when scene starts/restarts
    this.score = 0;
    this.difficulty = 1;
    this.lastFired = 0;
  }

  preload(): void {
    // Load from Vite publicDir (src/client/public) => served at /assets/*
    this.load.image('ship', '/assets/ShipClassic.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');
    this.load.image('stars', '/assets/stars.png'); // optional

    this.load.audio('shoot', '/assets/SpaceShipClassicShootingSFX.wav'); // optional
    this.load.audio('boom', '/assets/Boom.wav'); // optional

    this.load.on('loaderror', (file: Phaser.Loader.File) =>
      console.error('Asset failed:', file.key)
    );
  }

  create(): void {
    // Ensure keyboard works inside Devvit iframe
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Capture keys
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);

    // Check for custom background config and set up textures
    const bgConfig = this.registry.get('backgroundConfig');
    if (bgConfig) {
      this.generateCustomBackground(bgConfig);
      this.tex.stars = 'custom_stars';
      this.ensureTextures(true); // Skips star texture setup
    } else {
      // Resolve all textures or create fallbacks to avoid green boxes
      this.ensureTextures();
    }

    // Parallax starfield
    const { width, height } = this.scale;
    this.starfield = this.add
      .tileSprite(0, 0, width, height, this.tex.stars)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);

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
    const shipMaxVelocity = 260 + 50 * (speedMultiplier - 1);
    const shipDrag = 200 + 100 * (speedMultiplier - 1);
    this.shipAcceleration = 220 + 80 * (speedMultiplier - 1);

    // Ship
    this.ship = this.physics.add.sprite(w / 2, h - 80, this.tex.ship);
    this.ship.setOrigin(0.5).setAngle(-90);
    this.ship.setCollideWorldBounds(true);
    this.ship.setDrag(shipDrag).setAngularDrag(150).setMaxVelocity(shipMaxVelocity);

    // Reduce ONLY the player ship size (e.g., 128x128)
    this.ship.setDisplaySize(128, 128);

    // Use a centered circle hitbox sized for display size (scale-aware)
    {
      const body = this.ship.body as Phaser.Physics.Arcade.Body;

      // Unscaled frame size
      const frameW = this.ship.frame.width;
      const frameH = this.ship.frame.height;

      // Convert desired display radius to body units (divide by scale)
      const scale = Math.max(this.ship.scaleX, this.ship.scaleY);
      const desiredDisplayRadius = Math.min(this.ship.displayWidth, this.ship.displayHeight) * 0.4;
      const radius = desiredDisplayRadius / scale;

      const diameter = radius * 2;
      const offsetX = (frameW - diameter) / 2;
      const offsetY = (frameH - diameter) / 2;

      body.setCircle(radius, offsetX, offsetY);

      // lock rotation so the ship never rotates
      body.allowRotation = false;
      this.ship.setAngularVelocity(0);
      this.ship.setRotation(Phaser.Math.DegToRad(-90));
    }

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Groups (use resolved keys)
    this.bullets = this.physics.add.group({ defaultKey: this.tex.bullet, maxSize: 60 });
    this.enemies = this.physics.add.group({ defaultKey: this.tex.enemy });

    // UI
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', color: '#ffffff' });
    this.add
      .text(w / 2, h - 16, 'Click game, then use Arrows + Space', {
        fontSize: '12px',
        color: '#bbbbbb',
      })
      .setOrigin(0.5);

    // Overlaps
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (b, e) =>
        this.onBulletHitEnemy(b as Phaser.Physics.Arcade.Image, e as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );
    this.physics.add.overlap(this.ship, this.enemies, () => this.onPlayerHit(), undefined, this);

    // Enemy spawn with difficulty ramp
    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        this.difficulty = Math.min(10, this.difficulty + 1);
        const newDelay = Math.max(400, this.spawnTimer.delay - 100);
        if (this.spawnTimer) {
          this.spawnTimer.remove();
        }
        this.spawnTimer = this.time.addEvent({
          delay: newDelay,
          loop: true,
          callback: () => this.spawnEnemy(),
        });
      },
    });
  }

  override update(time: number, delta: number): void {
    if (!this.ship?.body) return;

    // Parallax (frame-rate independent)
    const bgConfig = this.registry.get('backgroundConfig');
    const speed = bgConfig ? bgConfig.speed : 1;
    const d = delta / 16.6667;
    this.starfield.tilePositionY += this.starScrollDir * (speed + 0.2 * this.difficulty) * d;

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

    // Wrap
    this.wrap(this.ship);
    this.enemies
      .getChildren()
      .forEach((e) => this.wrapHorizontal(e as Phaser.GameObjects.GameObject));
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

  private wrapHorizontal(obj: Phaser.GameObjects.GameObject): void {
    const s = obj as Phaser.Physics.Arcade.Sprite;
    const w = this.scale.width;
    const buffer = s.width;
    if (s.x < -buffer) s.x = w + buffer;
    else if (s.x > w + buffer) s.x = -buffer;
  }

  private spawnEnemy(): void {
    const x = Phaser.Math.Between(60, this.scale.width - 60);
    const enemy = this.enemies.create(x, -60, this.tex.enemy) as Phaser.Physics.Arcade.Sprite;
    if (!enemy?.body) return;
    enemy.setActive(true).setVisible(true);

    // Keep enemy’s original asset size; only set a circular hitbox
    {
      const ebody = enemy.body as Phaser.Physics.Arcade.Body;
      const ew = enemy.displayWidth;
      const eh = enemy.displayHeight;
      const er = Math.min(ew, eh) * 0.38;
      const edown = eh * 0.06;
      ebody.setCircle(er, ew / 2 - er, eh / 2 - er + edown);
    }

    // Adjust speed based on custom settings
    const bgConfig = this.registry.get('backgroundConfig');
    const speedMultiplier = bgConfig ? bgConfig.speed / 0.5 : 1; // Default speed is 0.5, so we use that as the baseline
    const baseSpeed = Phaser.Math.Between(80, 140);
    const finalSpeed = baseSpeed * speedMultiplier + 20 * (this.difficulty - 1);

    enemy.setVelocity(0, finalSpeed);

    // Zig-zag
    this.tweens.add({
      targets: enemy,
      x: x + Phaser.Math.Between(-120, 120),
      yoyo: true,
      duration: 1000,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private onBulletHitEnemy(
    bullet: Phaser.Physics.Arcade.Image,
    enemy: Phaser.Physics.Arcade.Sprite
  ): void {
    bullet.destroy();
    enemy.destroy();
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);
    this.cameras.main.shake(80, 0.005);
    this.boomSfx?.play();
  }

  private onPlayerHit(): void {
    this.physics.pause();
    this.ship.setTint(0xff0000);
    this.cameras.main.shake(120, 0.01);
    this.time.delayedCall(800, () => this.scene.start('GameOver', { score: this.score }));
  }

  private generateCustomBackground(config: { density: number }) {
    const key = 'custom_stars';
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    this.createStarsFallback(key, this.scale.width, this.scale.height, config.density);
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
    if (!this.textures.exists('stars')) {
      this.createStarsFallback('stars_fallback', 256, 256, 120);
      this.tex.stars = 'stars_fallback';
    } else {
      this.tex.stars = 'stars';
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

  private createStarsFallback(key: string, w: number, h: number, count: number) {
    const g = this.add.graphics();
    // transparent background; draw small white stars
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, w - 1);
      const y = Phaser.Math.Between(0, h - 1);
      const r = Phaser.Math.Between(1, 2);
      g.fillRect(x, y, r, r);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
