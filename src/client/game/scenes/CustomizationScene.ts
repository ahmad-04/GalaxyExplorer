import * as Phaser from 'phaser';

export class CustomizationScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private generatedTextureKey = 'generated_stars';

  // Default configuration for the starfield
  private currentConfig = {
    density: 200,
    speed: 0.5,
  };

  private densityText!: Phaser.GameObjects.Text;

  constructor() {
    super('CustomizationScene');
  }

  create() {
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

    // --- Back Button ---
    const backButton = this.add
      .text(this.scale.width / 2, this.scale.height - 50, 'Save & Back', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#00cc00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerdown', () => {
      this.registry.set('backgroundConfig', this.currentConfig);
      this.scene.start('MainMenu');
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
