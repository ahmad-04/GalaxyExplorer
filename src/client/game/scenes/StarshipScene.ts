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

  // resolved texture keys (fallback-safe)
  private tex = { ship: 'ship', bullet: 'bullet', enemy: 'enemy', stars: 'stars' };

  constructor() {
    super({ key: 'StarshipScene' });
  }

  preload(): void {
    // Load from Vite publicDir (src/client/public) => served at /assets/*
    this.load.image('ship', '/assets/ship.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');
    this.load.image('stars', '/assets/stars.png'); // optional

    this.load.audio('shoot', '/assets/shoot.wav'); // optional
    this.load.audio('boom', '/assets/boom.wav'); // optional

    this.load.on('loaderror', (f: any) => console.error('Asset failed:', f?.src));
  }

  create(): void {
    // Ensure keyboard works inside Devvit iframe
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Capture keys
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);

    // Resolve textures or create fallbacks to avoid green boxes
    this.ensureTextures();

    // Parallax starfield
    const { width, height } = this.scale;
    this.starfield = this.add
      .tileSprite(0, 0, width, height, this.tex.stars)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);

    // Keyboard (WASD + Space)
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE') as any;

    // Sounds (optional)
    if (this.sound) {
      if (this.sound.get('shoot') || this.cache.audio.exists('shoot'))
        this.shootSfx = this.sound.add('shoot', { volume: 0.5 });
      if (this.sound.get('boom') || this.cache.audio.exists('boom'))
        this.boomSfx = this.sound.add('boom', { volume: 0.6 });
    }

    const { width: w, height: h } = this.scale;
    this.physics.world.setBounds(0, 0, w, h);

    // Ship
    this.ship = this.physics.add.sprite(w / 2, h - 80, this.tex.ship);
    this.ship.setOrigin(0.5).setAngle(-90);
    this.ship.setCollideWorldBounds(true);
    this.ship.setDrag(120).setAngularDrag(150).setMaxVelocity(260);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();

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
        this.spawnTimer.delay = Math.max(400, this.spawnTimer.delay - 100);
      },
    });
  }

  update(time: number): void {
    if (!this.ship?.body) return;

    // Parallax
    this.starfield.tilePositionY += 1 + 0.2 * this.difficulty;

    // WASD + arrows
    const left = this.cursors.left?.isDown || this.keys.A?.isDown;
    const right = this.cursors.right?.isDown || this.keys.D?.isDown;
    const up = this.cursors.up?.isDown || this.keys.W?.isDown;
    const down = this.cursors.down?.isDown || this.keys.S?.isDown; // NEW: reverse
    const fire = this.cursors.space?.isDown || this.keys.SPACE?.isDown;

    // Rotation
    if (left) this.ship.setAngularVelocity(-160);
    else if (right) this.ship.setAngularVelocity(160);
    else this.ship.setAngularVelocity(0);

    // Thrust (forward/backward)
    const a = this.ship.rotation;
    const speed = 220;
    if (up && !down) {
      this.ship.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    } else if (down && !up) {
      // reverse thrust (move backward relative to facing)
      this.ship.setVelocity(-Math.cos(a) * speed * 0.8, -Math.sin(a) * speed * 0.8);
    } else {
      const body = this.ship.body as Phaser.Physics.Arcade.Body;
      this.ship.setVelocity(body.velocity.x * 0.98, body.velocity.y * 0.98);
    }

    // Shooting (unchanged)
    if (fire && time > this.lastFired) {
      const bullet = this.bullets.create(
        this.ship.x,
        this.ship.y,
        this.tex.bullet
      ) as Phaser.Physics.Arcade.Image;
      if (bullet?.body) {
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        bullet.setRotation(this.ship.rotation);
        this.physics.velocityFromRotation(this.ship.rotation, 500, body.velocity);
        this.time.delayedCall(1000, () => bullet.destroy());
        this.lastFired = time + this.fireRate;
        this.shootSfx?.play();
      }
    }

    // Wrap (unchanged)
    this.wrap(this.ship);
    this.bullets.getChildren().forEach((b) => this.wrap(b as Phaser.GameObjects.GameObject));
    this.enemies.getChildren().forEach((e) => this.wrap(e as Phaser.GameObjects.GameObject));
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

  private spawnEnemy(): void {
    const x = Phaser.Math.Between(60, this.scale.width - 60);
    const enemy = this.enemies.create(x, 60, this.tex.enemy) as Phaser.Physics.Arcade.Sprite;
    if (!enemy?.body) return;
    enemy.setActive(true).setVisible(true);
    enemy.setVelocity(0, Phaser.Math.Between(80, 140) + 20 * (this.difficulty - 1));

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
    this.time.delayedCall(800, () => this.scene.restart());
  }

  // ---------- helpers: create fallbacks to avoid green boxes ----------
  private ensureTextures() {
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

    // Stars background
    if (!this.textures.exists('stars')) {
      this.createStarsFallback('stars_fallback', 256, 256, 120);
      this.tex.stars = 'stars_fallback';
    } else {
      this.tex.stars = 'stars';
    }
  }

  private createShipFallback(key: string) {
    const g = this.make.graphics({ add: false });
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
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createRectFallback(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private createStarsFallback(key: string, w: number, h: number, count: number) {
    const g = this.make.graphics({ add: false });
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
