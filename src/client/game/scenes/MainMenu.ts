import * as Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private startEnabled = true;
  private background!: Phaser.GameObjects.TileSprite;
  private starsTextureKey = 'stars';

  constructor() {
    super('MainMenu');
  }

  init() {
    // Reset the startEnabled flag whenever the scene is initialized
    this.startEnabled = true;
    console.log('MainMenu scene initialized, startEnabled =', this.startEnabled);
  }

  create() {
    // Enable keyboard input and ensure focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Ensure stars texture exists or create a fallback
    this.ensureStarsTexture();

    // Add background
    this.background = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      this.starsTextureKey
    );
    this.background.setOrigin(0, 0);

    // Add spacebar key and capture it to prevent page scrolling
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Add a direct keyboard event listener for space key
    this.input.keyboard?.on('keydown-SPACE', () => {
      console.log('Space key pressed via event listener');
      if (this.startEnabled) {
        this.startGame();
      }
    });

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 100, 'Galaxy Explorer', {
        fontFamily: 'Arial Black',
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 50, 'Start Game', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#00ff00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Add instruction text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 120, 'Press SPACE to start', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5);

    startButton.on('pointerdown', () => {
      this.startGame();
    });
  }

  override update() {
    // Scroll the background
    this.background.tilePositionY -= 0.5;

    // Check for spacebar press - use both methods for redundancy
    if (this.startEnabled && this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      console.log('Space key detected in update()');
      this.startGame();
    }
  }

  private startGame() {
    if (!this.startEnabled) {
      console.log('Start game attempted but startEnabled is false');
      return;
    }

    // Disable starting to prevent multiple calls
    this.startEnabled = false;
    console.log('Starting game, startEnabled set to false');

    this.scene.start('StarshipScene');
  }

  private ensureStarsTexture() {
    if (!this.textures.exists('stars')) {
      this.createStarsFallback('stars_fallback', 256, 256, 120);
      this.starsTextureKey = 'stars_fallback';
    } else {
      this.starsTextureKey = 'stars';
    }
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
