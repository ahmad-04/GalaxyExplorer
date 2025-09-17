import * as Phaser from 'phaser';

export class CustomizationScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private generatedTextureKey = 'generated_stars';

  // Fixed configuration for the starfield - not customizable
  private currentConfig = {
    density: 200,
    speed: 0.5,
    color: '#000000',
  };

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
    // No longer loading background config since it's not customizable
    // Fixed values are used instead

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
    // Section title removed since we're removing background customization

    // Background customization options completely removed

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
      // No longer saving background config as it's not customizable

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
        // No longer saving background config
        localStorage.setItem('galaxyExplorer_shipConfig', JSON.stringify(shipConfig));
        console.log('Saved ship configuration to localStorage');
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
      this.scene.start('EndlessScene', shipConfig);
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

  // createSlider method removed as background customization is no longer needed

  override update() {
    // Scroll the background at fixed speed
    this.background.tilePositionY -= 0.5; // Using fixed value for simplicity
  }

  // updateDensity method removed as background customization is no longer needed

  // updateSpeed method removed as background customization is no longer needed

  // updateColor method removed as background customization is no longer needed

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
