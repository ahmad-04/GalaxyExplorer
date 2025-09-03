import Phaser from 'phaser';
import { Scene } from 'phaser';

export class StarshipScene extends Scene {
  private ship!: Phaser.Physics.Arcade.Sprite;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private lastFired: number = 0;
  private fireRate: number = 200; // Time between shots in ms
  private particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private thruster!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'StarshipScene' });
  }

  preload() {
    console.log('Loading assets...');
    this.load.on('complete', () => {
      console.log('All assets loaded successfully');
    });

    // Remove setBaseURL as we'll use absolute paths from public folder
    this.load.image('ship', '/assets/ship.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');
    this.load.image('explosion', '/assets/explosion.png');
    this.load.image('particle', '/assets/particle.png');
  }

  create() {
    // Debug texture loading
    console.log('Creating game objects...');
    const textures = this.textures.list;
    console.log('Loaded textures:', Object.keys(textures));

    // Create player ship
    this.ship = this.physics.add.sprite(400, 500, 'ship');
    this.ship.setScale(1); // Adjust if needed
    this.ship.setOrigin(0.5);
    this.ship.angle = -90; // Point ship upwards
    this.ship.setCollideWorldBounds(true);
    this.ship.setDrag(300);
    this.ship.setAngularDrag(400);
    this.ship.setMaxVelocity(300);

    // Create bullet group
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 10,
      runChildUpdate: true,
    });

    // Setup controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add score display
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#fff',
    });

    // Spawn enemies periodically
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // Collision handlers
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);

    this.physics.add.overlap(this.ship, this.enemies, this.gameOver, undefined, this);

    // Add particle system
    this.particles = this.add.particles('particle');

    // Create thruster effect
    this.thruster = this.particles.createEmitter({
      speed: 100,
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      tint: 0xff8800, // Orange color for thruster
      on: false,
    });
    this.thruster.startFollow(this.ship, 0, 25);
  }

  override update(time: number) {
    if (!this.ship.active) return;

    // Rotation
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }

    // Thrust
    if (this.cursors.up.isDown) {
      const body = this.ship.body as Phaser.Physics.Arcade.Body;
      this.physics.velocityFromRotation(this.ship.rotation, 200, body.velocity);
      if (this.thruster) {
        this.thruster.start();
      }
    } else {
      this.ship.setAcceleration(0);
      if (this.thruster) {
        this.thruster.stop();
      }
    }

    // Shooting
    if (this.cursors.space.isDown && time > this.lastFired) {
      const bullet = this.bullets.get(this.ship.x, this.ship.y) as Phaser.Physics.Arcade.Sprite;

      if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setRotation(this.ship.rotation);

        // Calculate bullet velocity based on ship's rotation
        this.physics.velocityFromRotation(this.ship.rotation, 400, bullet.body.velocity);

        this.lastFired = time + this.fireRate;

        // Destroy bullet after 1 second
        this.time.delayedCall(1000, () => {
          bullet.destroy();
        });
      }
    }

    // Screen wrap
    this.wrapObject(this.ship);
    this.bullets.getChildren().forEach((bullet) => {
      this.wrapObject(bullet);
    });
  }

  private wrapObject(object: Phaser.GameObjects.GameObject) {
    const sprite = object as Phaser.Physics.Arcade.Sprite;
    const width = this.game.config.width as number;
    const height = this.game.config.height as number;

    if (sprite.x < 0) {
      sprite.x = width;
    } else if (sprite.x > width) {
      sprite.x = 0;
    }

    if (sprite.y < 0) {
      sprite.y = height;
    } else if (sprite.y > height) {
      sprite.y = 0;
    }
  }

  private spawnEnemy() {
    const x = Phaser.Math.Between(0, this.game.config.width as number);
    const enemy = this.enemies.create(x, 0, 'enemy') as Phaser.Physics.Arcade.Sprite;

    const angle = Phaser.Math.Between(-30, 30);
    const speed = Phaser.Math.Between(100, 200);

    this.physics.velocityFromAngle(angle + 90, speed, enemy.body.velocity);
  }

  private hitEnemy(bullet: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) {
    const bulletSprite = bullet as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;

    // Create explosion effect
    this.particles
      .createEmitter({
        x: enemySprite.x,
        y: enemySprite.y,
        speed: { min: -100, max: 100 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        maxParticles: 20,
      })
      .explode();

    bulletSprite.destroy();
    enemySprite.destroy();
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private gameOver() {
    this.physics.pause();
    this.ship.setTint(0xff0000);
    this.add
      .text(400, 300, 'Game Over', {
        fontSize: '64px',
        color: '#fff',
      })
      .setOrigin(0.5);
  }
}
