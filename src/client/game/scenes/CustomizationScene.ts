import * as Phaser from 'phaser';

export class CustomizationScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private generatedTextureKey = 'generated_stars';

  // Default configuration for the starfield
  private currentConfig = {
    density: 200,
    speed: 0.5,
    color: '#000000', // Default to black
  };

  private densityText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;

  constructor() {
    super('CustomizationScene');
  }

  create() {
    // Load config from registry if it exists, otherwise use defaults
    const existingConfig = this.registry.get('backgroundConfig');
    if (existingConfig) {
      // Create a copy to avoid modifying the object in the registry directly
      this.currentConfig = { ...existingConfig };
    }
    console.log('CustomizationScene started with config:', this.currentConfig);

    // Set the initial background color from the config
    this.cameras.main.setBackgroundColor(this.currentConfig.color);

    // Generate the initial background
    this.generateStarfieldTexture();
    this.background = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, this.generatedTextureKey)
      .setOrigin(0);

    // Add a title
    this.add
      .text(this.scale.width / 2, 50, 'Customize Background', {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // --- Star Density UI ---
    this.add.text(100, 150, 'Star Density:', { fontSize: '24px', color: '#ffffff' });
    this.densityText = this.add.text(350, 150, this.currentConfig.density.toString(), {
      fontSize: '24px',
      color: '#ffffff',
    });

    this.add
      .text(320, 150, '-', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 5 },
      })
      .setInteractive()
      .on('pointerdown', () => this.updateDensity(-50));

    this.add
      .text(450, 150, '+', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 5 },
      })
      .setInteractive()
      .on('pointerdown', () => this.updateDensity(50));

    // --- Scroll Speed UI ---
    this.add.text(100, 220, 'Scroll Speed:', { fontSize: '24px', color: '#ffffff' });
    this.speedText = this.add.text(350, 220, this.currentConfig.speed.toFixed(1), {
      fontSize: '24px',
      color: '#ffffff',
    });

    this.add
      .text(320, 220, '-', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 5 },
      })
      .setInteractive()
      .on('pointerdown', () => this.updateSpeed(-0.5));

    this.add
      .text(450, 220, '+', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 5 },
      })
      .setInteractive()
      .on('pointerdown', () => this.updateSpeed(0.5));

    // --- Background Color UI ---
    this.add.text(100, 290, 'Color:', { fontSize: '24px', color: '#ffffff' });
    const colors = ['#000000', '#0d1b2a', '#2c0735', '#4a0404'];
    let x = 320;
    colors.forEach((color) => {
      this.add
        .rectangle(x, 295, 40, 40, parseInt(color.slice(1), 16))
        .setInteractive()
        .on('pointerdown', () => this.updateColor(color));
      x += 50;
    });

    // --- Action Buttons ---
    const backButton = this.add
      .text(this.scale.width / 2 - 100, this.scale.height - 50, 'Save & Back', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#00cc00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerdown', () => {
      // Save to the backend for persistence
      fetch('/api/save-user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentConfig),
      }).catch((error) => console.error('Failed to save config to server:', error));

      // Also save to registry for immediate use in the next scene
      console.log('Saving to registry:', this.currentConfig);
      this.registry.set('backgroundConfig', this.currentConfig);

      // Transition scenes
      this.scene.stop();
      this.scene.launch('MainMenu');
    });

    const shareButton = this.add
      .text(this.scale.width / 2 + 100, this.scale.height - 50, 'Share', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#ff8c00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    shareButton.on('pointerdown', () => this.shareBackground());
  }

  private shareBackground() {
    const shareButton = this.children.list.find(
      (child) => child.type === 'Text' && (child as Phaser.GameObjects.Text).text === 'Share'
    ) as Phaser.GameObjects.Text;

    if (!shareButton || shareButton.text === 'Sharing...') {
      return; // Prevent multiple clicks
    }

    const originalText = shareButton.text;
    shareButton.setText('Sharing...');

    fetch('/api/share-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.currentConfig),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to share');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Share success:', data);
        shareButton.setText('Shared!');

        // Navigate to the new post
        if (data.url) {
          window.top!.location.href = data.url;
        }

        this.time.delayedCall(2000, () => {
          shareButton.setText(originalText);
        });
      })
      .catch((error) => {
        console.error('Share error:', error);
        shareButton.setText('Error!');
        this.time.delayedCall(2000, () => {
          shareButton.setText(originalText);
        });
      });
  }

  override update() {
    // Scroll the background
    this.background.tilePositionY -= this.currentConfig.speed;
  }

  private updateDensity(change: number) {
    // Update the density, ensuring it stays within a reasonable range
    this.currentConfig.density = Phaser.Math.Clamp(this.currentConfig.density + change, 0, 1000);
    this.densityText.setText(this.currentConfig.density.toString());

    // Regenerate the background with the new density
    this.generateStarfieldTexture();
    this.background.setTexture(this.generatedTextureKey);
  }

  private updateSpeed(change: number) {
    // Update the speed, ensuring it stays within a reasonable range
    this.currentConfig.speed = parseFloat(
      Phaser.Math.Clamp(this.currentConfig.speed + change, 0.5, 3.0).toFixed(1)
    );
    this.speedText.setText(this.currentConfig.speed.toFixed(1));
  }

  private updateColor(color: string) {
    this.currentConfig.color = color;
    this.cameras.main.setBackgroundColor(color);
  }

  private generateStarfieldTexture() {
    const w = this.scale.width;
    const h = this.scale.height;
    const count = this.currentConfig.density;

    // If the texture already exists, destroy it before creating a new one
    if (this.textures.exists(this.generatedTextureKey)) {
      this.textures.remove(this.generatedTextureKey);
    }

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, w - 1);
      const y = Phaser.Math.Between(0, h - 1);
      const r = Phaser.Math.Between(1, 2);
      g.fillRect(x, y, r, r);
    }
    g.generateTexture(this.generatedTextureKey, w, h);
    g.destroy();
  }
}
