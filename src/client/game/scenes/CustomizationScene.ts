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

  private shipPrimary!: Phaser.GameObjects.Image;
  private shipSecondary!: Phaser.GameObjects.Image;
  private selectedShip: string = 'ship';
  private shipOptions: string[] = ['ship', 'ShipClassic', 'galactic'];
  private currentShipIndex: number = 0;
  private selectedPrimaryTint: number = 0xffffff;
  private selectedSecondaryTint: number = 0xffffff;
  private activeTintTarget: 'primary' | 'secondary' = 'primary';

  // Define a ship config type
  private shipConfigType: {
    ship: string;
    primaryTint: number;
    secondaryTint: number;
    combinedTextureKey?: string;
  } = { ship: 'ship', primaryTint: 0xffffff, secondaryTint: 0xffffff };

  private primaryColorIndicator!: Phaser.GameObjects.Text;
  private secondaryColorIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super('CustomizationScene');
  }

  create() {
    // Load config from registry if it exists, otherwise use defaults
    const existingConfig = this.registry.get('backgroundConfig');
    if (existingConfig) {
      this.currentConfig = { ...existingConfig };
    }

    // Load ship config from registry if it exists
    const existingShipConfig = this.registry.get('shipConfig');
    if (existingShipConfig) {
      this.selectedShip = existingShipConfig.ship || 'ship';
      this.selectedPrimaryTint = existingShipConfig.primaryTint || 0xffffff;
      this.selectedSecondaryTint = existingShipConfig.secondaryTint || 0xffffff;

      // Find the index of the selected ship in our options array
      const shipIndex = this.shipOptions.indexOf(this.selectedShip);
      if (shipIndex !== -1) {
        this.currentShipIndex = shipIndex;
      }
    }

    this.cameras.main.setBackgroundColor(this.currentConfig.color);
    this.generateStarfieldTexture();
    this.background = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, this.generatedTextureKey)
      .setOrigin(0);

    // --- Main Title ---
    this.add
      .text(this.scale.width / 2, 40, 'Galaxy Explorer Customization', {
        fontFamily: 'Arial Black',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // --- Ship Customization Section ---
    this.add
      .text(this.scale.width / 2, 90, 'Customize Your Ship', {
        fontSize: '28px',
        color: '#dddddd',
      })
      .setOrigin(0.5);

    // Create both ship layers. The secondary is hidden by default.
    this.shipSecondary = this.add
      .image(this.scale.width / 2, 180, 'glacticShipSecondary')
      .setScale(2)
      .setVisible(false);
    this.shipPrimary = this.add
      .image(this.scale.width / 2, 180, this.shipOptions[this.currentShipIndex] as string)
      .setScale(2);

    // Apply the correct textures and tints based on the selected ship
    this.updateShipPreview();

    const prevButton = this.add
      .text(this.scale.width / 2 - 120, 180, '<', {
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive();
    prevButton.on('pointerdown', () => this.cycleShip(-1));

    const nextButton = this.add
      .text(this.scale.width / 2 + 120, 180, '>', {
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive();
    nextButton.on('pointerdown', () => this.cycleShip(1));

    // --- Primary/Secondary Color Selection ---
    this.primaryColorIndicator = this.add
      .text(this.scale.width / 2 - 70, 230, 'Primary', {
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#007bff', // Highlighted by default
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => this.setActiveTintTarget('primary'));

    this.secondaryColorIndicator = this.add
      .text(this.scale.width / 2 + 70, 230, 'Secondary', {
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#6c757d', // Muted by default
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => this.setActiveTintTarget('secondary'));

    const colorPalette = [0xffffff, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    const swatchSize = 30;
    const swatchSpacing = 10;
    const paletteStartX =
      this.scale.width / 2 -
      (colorPalette.length * (swatchSize + swatchSpacing)) / 2 +
      swatchSize / 2;
    colorPalette.forEach((color, index) => {
      const swatch = this.add
        .rectangle(
          paletteStartX + index * (swatchSize + swatchSpacing),
          280, // Adjusted Y position
          swatchSize,
          swatchSize,
          color
        )
        .setInteractive();
      if (color !== 0xffffff) swatch.setStrokeStyle(2, 0xcccccc);
      swatch.on('pointerdown', () => {
        this.applyColor(color);
      });
    });

    // --- Background Customization Section ---
    this.add
      .text(this.scale.width / 2, 320, 'Customize The Cosmos', {
        fontSize: '28px',
        color: '#dddddd',
      })
      .setOrigin(0.5);

    // Density
    this.createSlider(
      150,
      370,
      'Star Density',
      () => this.updateDensity(-50),
      () => this.updateDensity(50)
    );
    this.densityText = this.add
      .text(400, 370, this.currentConfig.density.toString(), {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Speed
    this.createSlider(
      150,
      420,
      'Scroll Speed',
      () => this.updateSpeed(-0.5),
      () => this.updateSpeed(0.5)
    );
    this.speedText = this.add
      .text(400, 420, this.currentConfig.speed.toFixed(1), {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Color
    this.add
      .text(230, 470, 'Background Color:', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    const bgColors = ['#000000', '#0d1b2a', '#2c0735', '#4a0404'];
    let colorX = 380;
    bgColors.forEach((color) => {
      this.add
        .rectangle(colorX, 470, 30, 30, parseInt(color.slice(1), 16))
        .setInteractive()
        .on('pointerdown', () => this.updateColor(color));
      colorX += 40;
    });

    // --- Action Buttons ---
    const backButton = this.add
      .text(80, 40, '< Back', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#6c757d',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });

    const saveButton = this.add
      .text(this.scale.width / 2 - 100, 550, 'Save', {
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#007bff',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    saveButton.on('pointerdown', () => {
      // Save background config
      this.registry.set('backgroundConfig', this.currentConfig);

      // Create a ship config object with the correct type
      const shipConfig: typeof this.shipConfigType = {
        ship: this.selectedShip,
        primaryTint: this.selectedPrimaryTint,
        secondaryTint: this.selectedSecondaryTint,
      };

      // If using the galactic ship, add the combined texture key
      if (this.selectedShip === 'galactic') {
        const combinedTextureKey = this.createCombinedShipTexture();
        shipConfig.combinedTextureKey = combinedTextureKey;
      }

      // Save ship config to registry
      this.registry.set('shipConfig', shipConfig);

      // Also save to localStorage for persistence between sessions
      try {
        localStorage.setItem('galaxyExplorer_backgroundConfig', JSON.stringify(this.currentConfig));
        localStorage.setItem('galaxyExplorer_shipConfig', JSON.stringify(shipConfig));
        console.log('Saved configurations to localStorage');
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }

      // Visual feedback
      saveButton.setText('Saved!').setStyle({ backgroundColor: '#1a5d1a' });
      this.time.delayedCall(2000, () => {
        saveButton.setText('Save').setStyle({ backgroundColor: '#007bff' });
      });
    });

    const shareButton = this.add
      .text(this.scale.width / 2, 550, 'Share', {
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#6c757d',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    shareButton.on('pointerdown', () => this.shareConfiguration(shareButton));

    const startButton = this.add
      .text(this.scale.width / 2 + 100, 550, 'Start', {
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#28a745',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    startButton.on('pointerdown', () => {
      this.registry.set('backgroundConfig', this.currentConfig);

      // Create a shipConfig object with the correct type
      const shipConfig: typeof this.shipConfigType = {
        ship: this.selectedShip,
        primaryTint: this.selectedPrimaryTint,
        secondaryTint: this.selectedSecondaryTint,
      };

      // If using the galactic ship, add the combined texture key
      if (this.selectedShip === 'galactic') {
        const combinedTextureKey = this.createCombinedShipTexture();
        shipConfig.combinedTextureKey = combinedTextureKey;
      }

      // Store in registry and pass to scene
      this.registry.set('shipConfig', shipConfig);
      this.scene.start('StarshipScene', shipConfig);
    });
  }

  private setActiveTintTarget(target: 'primary' | 'secondary') {
    this.activeTintTarget = target;
    if (target === 'primary') {
      this.primaryColorIndicator.setStyle({ backgroundColor: '#007bff' });
      this.secondaryColorIndicator.setStyle({ backgroundColor: '#6c757d' });
    } else {
      this.primaryColorIndicator.setStyle({ backgroundColor: '#6c757d' });
      this.secondaryColorIndicator.setStyle({ backgroundColor: '#007bff' });
    }
  }

  private applyColor(color: number) {
    if (this.activeTintTarget === 'primary') {
      this.selectedPrimaryTint = color;
      this.shipPrimary.setTint(this.selectedPrimaryTint);

      // If this is the galactic ship, update the combined texture
      if (this.selectedShip === 'galactic') {
        this.createCombinedShipTexture();
      }
    } else {
      this.selectedSecondaryTint = color;
      if (this.shipSecondary.visible) {
        this.shipSecondary.setTint(this.selectedSecondaryTint);

        // Update the combined texture
        this.createCombinedShipTexture();
      }
    }
  }

  private createCombinedShipTexture() {
    // Create a unique key for this specific color combination
    const combinedKey = `combined_ship_${this.selectedPrimaryTint.toString(16)}_${this.selectedSecondaryTint.toString(16)}`;

    // If the texture already exists, no need to recreate it
    if (this.textures.exists(combinedKey)) {
      return combinedKey;
    }

    // Get the width and height from the primary ship texture
    const primaryFrame = this.textures.getFrame('glacticShipPrimary');
    const width = primaryFrame.width;
    const height = primaryFrame.height;

    // Create a render texture to combine the ships
    const rt = this.add.renderTexture(0, 0, width, height);

    // Create temporary sprites with the right tints
    const tempSecondary = this.add
      .image(width / 2, height / 2, 'glacticShipSecondary')
      .setTint(this.selectedSecondaryTint);
    const tempPrimary = this.add
      .image(width / 2, height / 2, 'glacticShipPrimary')
      .setTint(this.selectedPrimaryTint);

    // Draw both layers to the render texture
    rt.draw(tempSecondary);
    rt.draw(tempPrimary);

    // Save the render texture as a new texture
    rt.saveTexture(combinedKey);

    // Clean up temporary objects
    tempSecondary.destroy();
    tempPrimary.destroy();
    rt.destroy();

    return combinedKey;
  }

  private shareConfiguration(shareButton: Phaser.GameObjects.Text) {
    const originalText = shareButton.text;
    const originalColor = shareButton.style.backgroundColor;
    shareButton.setText('Sharing...').setStyle({ backgroundColor: '#5a6268' });

    // Create ship config object with combined texture if applicable
    const shipConfig: typeof this.shipConfigType = {
      ship: this.selectedShip,
      primaryTint: this.selectedPrimaryTint,
      secondaryTint: this.selectedSecondaryTint,
    };

    // If using the galactic ship, include the combined texture key
    if (this.selectedShip === 'galactic') {
      const combinedTextureKey = this.createCombinedShipTexture();
      shipConfig.combinedTextureKey = combinedTextureKey;
    }

    const fullConfig = {
      background: this.currentConfig,
      ship: shipConfig,
    };

    // This is a placeholder for the actual API call.
    // In a real scenario, you would send `fullConfig` to your server.
    console.log('Sharing configuration:', fullConfig);

    // Simulate an API call
    this.time.delayedCall(1500, () => {
      // On success, you might get a URL back from the server
      shareButton.setText('Copied!').setStyle({ backgroundColor: '#1a5d1a' });

      // You could use the clipboard API to copy the link
      // navigator.clipboard.writeText('https://your-share-url.com/...');

      this.time.delayedCall(2000, () => {
        shareButton.setText(originalText).setStyle({ backgroundColor: originalColor });
      });
    });
  }

  private cycleShip(direction: number) {
    this.currentShipIndex =
      (this.currentShipIndex + direction + this.shipOptions.length) % this.shipOptions.length;
    this.selectedShip = this.shipOptions[this.currentShipIndex] as string;

    // Update the ship preview with the new selection
    this.updateShipPreview();

    // If it's the galactic ship, create the combined texture
    if (this.selectedShip === 'galactic') {
      this.createCombinedShipTexture();
    }
  }

  private createSlider(
    x: number,
    y: number,
    label: string,
    onMinus: () => void,
    onPlus: () => void
  ) {
    this.add.text(x, y, label, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(x + 150, y, '-', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', onMinus);

    this.add
      .text(x + 290, y, '+', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', onPlus);
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

  private updateShipPreview() {
    // Set the correct textures and visibility based on the selected ship
    if (this.selectedShip === 'galactic') {
      this.shipPrimary.setTexture('glacticShipPrimary');
      this.shipSecondary.setTexture('glacticShipSecondary').setVisible(true);

      // Apply tints
      this.shipPrimary.setTint(this.selectedPrimaryTint);
      this.shipSecondary.setTint(this.selectedSecondaryTint);
    } else {
      // It's a single-layer ship
      this.shipPrimary.setTexture(this.selectedShip);
      this.shipSecondary.setVisible(false);

      // Apply primary tint only
      this.shipPrimary.setTint(this.selectedPrimaryTint);
    }
  }
}
