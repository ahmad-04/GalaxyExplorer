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
    // --- 1. Draw the scene immediately with defaults ---

    this.ensureStarsTexture(); // Make sure a texture is available

    // Enable keyboard input and ensure focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

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
      .text(this.scale.width / 2, this.scale.height / 2, 'Start Game', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#00ff00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    const customizeButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 70, 'Customize', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#0000ff',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Add instruction text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 140, 'Press SPACE to start', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5);

    startButton.on('pointerdown', () => {
      this.startGame();
    });

    customizeButton.on('pointerdown', () => {
      this.scene.start('CustomizationScene');
    });

    // --- 2. Asynchronously load custom config and update if found ---

    // Check for config passed from CustomizationScene first for responsiveness
    const registryConfig = this.registry.get('backgroundConfig');
    if (registryConfig) {
      console.log('Applying config from registry:', registryConfig);
      this.applyBackgroundConfig(registryConfig);
    } else {
      // If no registry config, try loading from the server
      this.loadConfigFromServer().catch((error) => {
        console.error('Failed to load or apply server config:', error);
      });
    }
  }

  private async loadConfigFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/load-user-config');
      if (response.ok) {
        const config = await response.json();
        console.log('Successfully loaded config from server:', config);
        this.registry.set('backgroundConfig', config); // Store for other scenes
        this.applyBackgroundConfig(config);
      }
    } catch (error) {
      console.error('Could not load user config from server:', error);
    }
  }

  private applyBackgroundConfig(config: { color: string; density: number }) {
    if (config && this.background) {
      this.cameras.main.setBackgroundColor(config.color);
      this.generateCustomBackground(config);
      this.background.setTexture('custom_stars');
    }
  }

  override update() {
    const bgConfig = this.registry.get('backgroundConfig');
    const speed = bgConfig ? bgConfig.speed : 0.5;
    // Scroll the background
    this.background.tilePositionY -= speed;

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

    // Get ship configuration from registry if available
    const shipConfig = this.registry.get('shipConfig');
    if (shipConfig) {
      console.log('Starting game with ship config:', shipConfig);
      this.scene.start('StarshipScene', shipConfig);
    } else {
      // Use default configuration if none is saved
      const defaultShipConfig = {
        ship: 'ship',
        primaryTint: 0xffffff,
        secondaryTint: 0xffffff,
      };
      console.log('Starting game with default ship config');
      this.scene.start('StarshipScene', defaultShipConfig);
    }
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

  private generateCustomBackground(config: { density: number }) {
    const key = 'custom_stars';
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    this.createStarsFallback(key, this.scale.width, this.scale.height, config.density);
  }
}
