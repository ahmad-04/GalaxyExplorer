import * as Phaser from 'phaser';
import { getLeaderboard } from '../api';

export class MainMenu extends Phaser.Scene {
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private startEnabled = true;
  private background!: Phaser.GameObjects.TileSprite;
  private starsTextureKey = 'stars';
  private leaderboardPopup!: Phaser.GameObjects.Container;
  private leaderboardVisible = false;

  constructor() {
    super('MainMenu');
  }

  init() {
    // Reset the startEnabled flag whenever the scene is initialized
    this.startEnabled = true;
    // Reset the leaderboard visibility state when returning to this scene
    this.leaderboardVisible = false;
    console.log('MainMenu scene initialized, startEnabled =', this.startEnabled);
  }

  create() {
    // --- 1. Draw the scene immediately with defaults ---

    this.ensureStarsTexture(); // Make sure a texture is available

    // Enable keyboard input and ensure focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Ensure leaderboard is hidden when scene starts/restarts
    if (this.leaderboardPopup) {
      this.leaderboardPopup.setVisible(false);
      console.log('[Leaderboard] Reset leaderboard visibility on scene create');
    }

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

    // Create main UI container to organize all menu elements
    const menuContainer = this.add.container(0, 0);

    // Helper function to create stylized buttons
    const createMenuButton = (
      y: number, 
      text: string
    ) => {
      // Create a container for the button and its effects positioned relative to (0,0)
      const buttonContainer = this.add.container(0, y);
      buttonContainer.setDepth(100); // Set very high depth to ensure buttons are on top
      
      // Button dimensions
      const buttonWidth = 250;
      const buttonHeight = 50;
      
      // Create simple button with blue frame to match mockup
      const buttonBg = this.add.graphics();
      
      // Simple transparent background
      buttonBg.fillStyle(0x000000, 0.2);
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
      
      // Blue border
      buttonBg.lineStyle(2, 0x0088ff, 1);
      buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
      
      // Button text with soft shadow
      const shadow = this.add.text(2, 2, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#000000',
        align: 'center',
      }).setOrigin(0.5);
      
      const buttonText = this.add.text(0, 0, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5);
      
      // Add elements to container
      buttonContainer.add([buttonBg, shadow, buttonText]);
      
      // Create hitbox for the button
      const hitArea = new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight);
      buttonContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      
      // Add simple hover effects
      buttonContainer.on('pointerover', () => {
        buttonBg.clear();
        
        // Slightly brighter background on hover
        buttonBg.fillStyle(0x0044aa, 0.3);
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Brighter blue border
        buttonBg.lineStyle(2, 0x00aaff, 1);
        buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Brighten text
        buttonText.setTint(0xffffff);
      });
      
      buttonContainer.on('pointerout', () => {
        buttonBg.clear();
        
        // Restore normal appearance
        buttonBg.fillStyle(0x000000, 0.2);
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Blue border
        buttonBg.lineStyle(2, 0x0088ff, 1);
        buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Reset text tint
        buttonText.clearTint();
      });
      
      buttonContainer.on('pointerdown', () => {
        // Simple pressed effect
        buttonText.setY(1);
        buttonBg.clear();
        buttonBg.fillStyle(0x0066ff, 0.4);
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        buttonBg.lineStyle(2, 0x0088ff, 1);
        buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
      });
      
      buttonContainer.on('pointerup', () => {
        // Restore hover state
        buttonText.setY(0);
        buttonBg.clear();
        buttonBg.fillStyle(0x0044aa, 0.3);
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
        buttonBg.lineStyle(2, 0x00aaff, 1);
        buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
      });
      
      return buttonContainer;
    };

    // Create a decorative blue frame around the menu area as shown in the mockup
    const menuFrame = this.add.graphics();
    
    // Draw the frame with rounded corners
    const frameWidth = this.scale.width * 0.8;
    const originalFrameHeight = this.scale.height * 0.7;
    
    // Reduce frame height by making it smaller from the top
    const topReduction = 50; // Reduce frame size from top by 50 pixels
    const frameHeight = originalFrameHeight - topReduction;
    
    const frameX = this.scale.width / 2 - frameWidth / 2;
    // Calculate frameY to keep the bottom edge at the same position
    const originalFrameY = this.scale.height / 2 - originalFrameHeight / 2;
    const frameY = originalFrameY + topReduction;
    
    // Add a translucent blue fill
    menuFrame.fillStyle(0x0066ff, 0.15); // Light blue with low opacity (0.15 = 15%)
    menuFrame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 10);
    
    // Add a blue border on top of the fill
    menuFrame.lineStyle(2, 0x0088ff, 0.8);
    menuFrame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 10);
    menuContainer.add(menuFrame);
    
    // Create a container for buttons positioned in the center
    const buttonContainer = this.add.container(this.scale.width * 0.5, 250); // Moved up from 300 to 250
    menuContainer.add(buttonContainer);
    
    // Create a simple title with blue glow to match mockup - ADDED AFTER THE MENU FRAME
    const titleText = this.add.text(this.scale.width / 2, 100, 'GALAXY EXPLORER', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#0066ff',
      strokeThickness: 6,
      align: 'center',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#0088ff',
        blur: 10,
        fill: true
      }
    }).setOrigin(0.5);
    titleText.setDepth(100); // Set very high depth to ensure it's on top
    
    // Add a simple space-themed tagline - ADDED AFTER THE MENU FRAME
    const tagline = this.add.text(this.scale.width / 2, 170, 'CONQUER THE COSMOS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#88ccff',
      align: 'center',
    }).setOrigin(0.5);
    tagline.setDepth(100); // Set very high depth to ensure it's on top
    
    // Create the simple buttons with blue frames
    const startButton = createMenuButton(
      0, 
      'START GAME'
    );
    
    const customizeButton = createMenuButton(
      90, 
      'CUSTOMIZE'
    );
    
    const leaderboardButton = createMenuButton(
      180, 
      'LEADERBOARD'
    );
    
    buttonContainer.add([startButton, customizeButton, leaderboardButton]);
    
    // Keep the design clean as shown in the mockup - no additional decorations

    // Test data button - commented out for production
    /* 
    const testDataButton = this.add
      .text(100, this.scale.height - 30, 'Add Test Scores', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 1)
      .setInteractive()
      .setAlpha(0.7);
    */

    // Add instruction text with better styling
    const instructionContainer = this.add.container(this.scale.width / 2, 550); // Moved down from 520 to 550
    menuContainer.add(instructionContainer);
    
    // Instruction background
    const instructionBg = this.add.rectangle(0, 0, 400, 40, 0x000000, 0.3);
    instructionBg.setStrokeStyle(1, 0x4466ff, 0.3);
    instructionContainer.add(instructionBg);
    
    // Instruction text
    const instructionText = this.add.text(0, 0, 'PRESS SPACE TO START', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#aaccff',
      align: 'center',
    }).setOrigin(0.5);
    instructionContainer.add(instructionText);
    
    // Animate the instruction text subtly
    this.tweens.add({
      targets: instructionText,
      alpha: { from: 1, to: 0.6 },
      duration: 1500,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1
    });
    
    // Add a version number/footer at the bottom
    const versionText = this.add.text(
      this.scale.width - 10, 
      this.scale.height - 10, 
      'v1.0', 
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#666666',
        align: 'right',
      }
    ).setOrigin(1, 1);
    menuContainer.add(versionText);

    // Create but hide the leaderboard popup initially
    this.createLeaderboardPopup();

    startButton.on('pointerdown', () => {
      // Add a button press sound effect (if available)
      // this.sound.play('button_click');
      
      // Add a flash effect
      this.cameras.main.flash(300, 255, 255, 255, true);
      
      // Start the game with a slight delay for the visual effect
      this.time.delayedCall(300, () => {
        this.startGame();
      });
    });

    customizeButton.on('pointerdown', () => {
      // Add a button press sound effect (if available)
      // this.sound.play('button_click');
      
      // Reset leaderboard state before changing scenes
      this.resetLeaderboardState();
      
      // Add subtle camera effect
      this.cameras.main.flash(300, 100, 100, 255, true);
      
      // Start scene with slight delay for visual effect
      this.time.delayedCall(200, () => {
        this.scene.start('CustomizationScene');
      });
    });

    leaderboardButton.on('pointerdown', () => {
      // Add a button press sound effect (if available)
      // this.sound.play('button_click');
      
      // Add subtle pulse effect
      this.tweens.add({
        targets: leaderboardButton,
        scale: { from: 0.95, to: 1 },
        duration: 300,
        ease: 'Bounce.Out'
      });
      
      // Show leaderboard with slight delay
      this.time.delayedCall(100, () => {
        void this.showLeaderboard(); // Use void to explicitly mark promise as handled
      });
    });

    // Test data button event handler - commented out for production
    /*
    testDataButton.on('pointerdown', () => {
      void this.generateTestScores();
    });
    */

    // Create but hide the leaderboard popup initially
    this.createLeaderboardPopup();

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
    
    // Add parallax elements to the background
    this.addParallaxElements();
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
      // Set a dark red background color regardless of the config
      this.cameras.main.setBackgroundColor('#000000ff');
      this.generateCustomBackground(config);
      this.background.setTexture('custom_stars');
    }
  }

  // Add parallax background elements for depth perception
  private addParallaxElements() {
    // Remove any existing parallax elements
    this.children.getAll().forEach(child => {
      if (child.getData('parallaxElement')) {
        child.destroy();
      }
    });
    
    // Create some distant stars that move at a different speed than the main background
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.FloatBetween(1.5, 3);
      
      const distantStar = this.add.circle(x, y, size, 0xffffff, 0.7);
      distantStar.setData('parallaxElement', true);
      distantStar.setData('parallaxSpeed', 0.4);
      distantStar.setDepth(1);
    }
  }
  
  override update(_time: number, delta: number) {
    // Use a fixed speed of 0.5 instead of getting it from the configuration
    const fixedSpeed = 0.5;
    const d = delta / 16.6667; // Make movement frame-rate independent
    
    // Scroll the background at the fixed speed
    this.background.tilePositionY -= fixedSpeed * d;
    
    // Update parallax elements
    this.children.getAll().forEach(child => {
      if (child.getData('parallaxElement')) {
        const parallaxSpeed = child.getData('parallaxSpeed') || 0.5;
        
        // If this element is orbiting something
        const orbitData = child.getData('orbit');
        if (orbitData) {
          // Update orbit position
          orbitData.angle += orbitData.speed * d;
          const x = orbitData.center.x + Math.cos(orbitData.angle) * orbitData.radius;
          const y = orbitData.center.y + Math.sin(orbitData.angle) * orbitData.radius;
          
          // Type safety - only call setPosition if the object has it
          if ('setPosition' in child && typeof child.setPosition === 'function') {
            child.setPosition(x, y);
          }
        } 
        // Otherwise just move it vertically
        else if ('y' in child) {
          // Type safety - ensure we're updating a property that has 'y'
          const gameObject = child as unknown as { y: number };
          gameObject.y += parallaxSpeed * d;
          
          // Wrap around when off-screen
          if (gameObject.y > this.scale.height + 50) {
            gameObject.y = -50;
          }
        }
      }
    });

    // Check for spacebar press - use both methods for redundancy
    if (this.startEnabled && this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      console.log('Space key detected in update()');
      this.startGame();
    }
  }

  /**
   * Reset the leaderboard state forcefully (for scene transitions)
   */
  private resetLeaderboardState(): void {
    console.log('[Leaderboard] Forcefully resetting leaderboard state');

    // Skip animation and just reset everything
    if (this.leaderboardPopup) {
      this.leaderboardPopup.setVisible(false);
      this.leaderboardPopup.setAlpha(1);
      this.leaderboardPopup.setScale(1);

      // Clear all score entries but keep the first 5 elements (fullscreen block, background, title, close button, loading text)
      while (this.leaderboardPopup.list.length > 5) {
        const item = this.leaderboardPopup.list[
          this.leaderboardPopup.list.length - 1
        ] as Phaser.GameObjects.GameObject; // Properly clean up container objects
        if (item instanceof Phaser.GameObjects.Container) {
          // Destroy all children in the container
          item.each((child: Phaser.GameObjects.GameObject) => {
            if (child && 'destroy' in child) {
              child.destroy();
            }
          });
        }

        if (item && 'destroy' in item) {
          item.destroy();
        } else {
          // If we can't destroy it properly, at least remove it from the container
          this.leaderboardPopup.remove(item);
        }
      }
    }

    // Reset the state flag
    this.leaderboardVisible = false;
  }

  /**
   * Clean up when the scene is shut down (switching to another scene)
   */
  shutdown() {
    console.log('[MainMenu] Scene shutdown, cleaning up resources');
    // Reset leaderboard state when shutting down the scene
    this.resetLeaderboardState();
  }

  private startGame() {
    if (!this.startEnabled) {
      console.log('Start game attempted but startEnabled is false');
      return;
    }

    // Disable starting to prevent multiple calls
    this.startEnabled = false;
    console.log('Starting game, startEnabled set to false');

    // Reset leaderboard state when starting the game
    this.resetLeaderboardState();

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
    
    // Create a dark red background as shown in the mockup
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = w;
    gradientCanvas.height = h;
    const ctx = gradientCanvas.getContext('2d');
    if (ctx) {
      // Create a dark red background
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(70, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(50, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      
      // No nebulas - keeping it simple as in the mockup
      this.textures.addCanvas(key + '_background', gradientCanvas);
    }

    // Create a simple starfield with white stars, similar to the mockup
    // Generate simple white stars of varying sizes
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, w - 1);
      const y = Phaser.Math.Between(0, h - 1);
      
      // Simple star size variation
      const starSize = Phaser.Math.FloatBetween(0.5, 2);
      
      // Use white stars only
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, starSize);
    }
    
    // Add just a few larger stars
    for (let i = 0; i < Math.min(15, count / 30); i++) {
      const x = Phaser.Math.Between(0, w - 1);
      const y = Phaser.Math.Between(0, h - 1);
      const size = Phaser.Math.Between(2, 3);
      
      // Simple white stars with no glow effect
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, size);
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
    // No animated elements - keeping it simple as in the mockup
  }
  

  


  private createLeaderboardPopup(): void {
    console.log('[Leaderboard] Creating leaderboard popup');

    // Clean up existing leaderboard popup if it exists
    if (this.leaderboardPopup) {
      console.log('[Leaderboard] Cleaning up existing leaderboard popup');
      this.leaderboardPopup.removeAll(true); // Remove and destroy all children
      this.leaderboardPopup.destroy();
    }

    // Create a container for the leaderboard popup
    this.leaderboardPopup = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Create a dimming overlay for the background
    const fullscreenBlock = this.add.rectangle(
      0,
      0,
      this.scale.width * 2,
      this.scale.height * 2,
      0x000000,
      0.5
    );
    fullscreenBlock.setInteractive();
    fullscreenBlock.on('pointerdown', () => {
      // Clicking the backdrop will close the leaderboard
      console.log('[Leaderboard] Click on backdrop, closing leaderboard');
      this.hideLeaderboard();
      return false;
    });

    // Create a space-themed panel for the leaderboard
    // Main background
    const background = this.add.rectangle(0, 0, 500, 550, 0x000022, 0.85);
    background.setStrokeStyle(3, 0x4466ff, 1);
    
    // Add a decorative header
    const headerBg = this.add.rectangle(0, -250, 500, 70, 0x0033aa, 0.8);
    headerBg.setStrokeStyle(2, 0x88aaff, 1);
    
    // Add decorative elements
    const decorGraphics = this.add.graphics();
    // Top left corner decoration
    decorGraphics.lineStyle(2, 0x4466ff, 0.7);
    decorGraphics.beginPath();
    decorGraphics.moveTo(-250, -230);
    decorGraphics.lineTo(-210, -230);
    decorGraphics.moveTo(-230, -250);
    decorGraphics.lineTo(-230, -210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(-230, -230, 4);
    
    // Top right corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(250, -230);
    decorGraphics.lineTo(210, -230);
    decorGraphics.moveTo(230, -250);
    decorGraphics.lineTo(230, -210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(230, -230, 4);
    
    // Bottom left corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(-250, 230);
    decorGraphics.lineTo(-210, 230);
    decorGraphics.moveTo(-230, 250);
    decorGraphics.lineTo(-230, 210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(-230, 230, 4);
    
    // Bottom right corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(250, 230);
    decorGraphics.lineTo(210, 230);
    decorGraphics.moveTo(230, 250);
    decorGraphics.lineTo(230, 210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(230, 230, 4);

    // Make the background interactive to capture clicks
    background.setInteractive();
    background.on('pointerdown', () => {
      // Consume the click but do nothing
      console.log('[Leaderboard] Blocked click on leaderboard background');
      return false;
    });

    // Add title text with sci-fi style
    const titleText = this.add
      .text(0, -250, 'GALACTIC LEADERBOARD', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    
    // Add subtitle
    const subtitleText = this.add
      .text(0, -215, 'TOP SPACE COMMANDERS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#88ccff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create a styled close button
    const closeButtonBg = this.add.circle(220, -250, 25, 0x000022, 0.8);
    closeButtonBg.setStrokeStyle(2, 0x4466ff, 1);
    
    const closeButton = this.add
      .text(220, -250, 'X', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive();

    // Handle close button hover effects
    closeButton.on('pointerover', () => {
      closeButtonBg.setFillStyle(0xaa0000, 0.8);
      closeButtonBg.setStrokeStyle(2, 0xff6666, 1);
    });
    
    closeButton.on('pointerout', () => {
      closeButtonBg.setFillStyle(0x000022, 0.8);
      closeButtonBg.setStrokeStyle(2, 0x4466ff, 1);
    });

    // Handle close button click
    closeButton.on('pointerdown', () => {
      // Stop propagation by consuming the event
      console.log('[Leaderboard] Close button clicked');
      this.hideLeaderboard();
      return false;
    });

    // Create a themed loading indicator
    const loadingContainer = this.add.container(0, 0);
    
    const loadingText = this.add
      .text(0, -20, 'RETRIEVING DATA...', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#4466ff',
        align: 'center',
      })
      .setOrigin(0.5);
    
    // Create loading spinner animation
    const spinner = this.add.graphics();
    spinner.lineStyle(3, 0x4466ff, 1);
    spinner.beginPath();
    spinner.arc(0, 30, 25, 0, Math.PI * 1.5);
    spinner.strokePath();
    
    // Animate spinner rotation
    this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 1500,
      repeat: -1
    });
    
    loadingContainer.add([loadingText, spinner]);

    // Add everything to the container
    this.leaderboardPopup.add([
      fullscreenBlock, 
      background, 
      headerBg,
      decorGraphics,
      titleText,
      subtitleText, 
      closeButtonBg,
      closeButton, 
      loadingContainer
    ]);

    // Set initial visibility and depth
    this.leaderboardPopup.setVisible(false);
    this.leaderboardPopup.setDepth(100);

    // Ensure the entire container blocks clicks
    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (
          this.leaderboardVisible &&
          (this.leaderboardPopup.list.includes(gameObject as Phaser.GameObjects.GameObject) ||
            gameObject === this.leaderboardPopup)
        ) {
          console.log('[Leaderboard] Click intercepted on leaderboard element');
          return false;
        }
      }
    );
  }

  private async showLeaderboard(): Promise<void> {
    if (this.leaderboardVisible) {
      console.log('[Leaderboard] Leaderboard is already visible, ignoring showLeaderboard call');
      return;
    }

    console.log('[Leaderboard] Opening leaderboard popup');
    this.leaderboardVisible = true;
    this.leaderboardPopup.setVisible(true);

    try {
      // Make all children except loading text invisible while we load
      for (let i = 0; i < this.leaderboardPopup.list.length - 1; i++) {
        const item = this.leaderboardPopup.list[i] as unknown as Phaser.GameObjects.GameObject & {
          setVisible: (visible: boolean) => void;
        };
        if (item && typeof item.setVisible === 'function') {
          item.setVisible(true);
        }
      }

      console.log('[Leaderboard] Fetching leaderboard data...');
      const startTime = performance.now();

      // Fetch the leaderboard data - get exactly 10 scores to display
      const leaderboardData = await getLeaderboard(10);

      const endTime = performance.now();
      console.log(`[Leaderboard] Data fetched in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('[Leaderboard] Retrieved data:', JSON.stringify(leaderboardData));
      console.log(`[Leaderboard] Number of scores: ${leaderboardData.scores.length}`);

      // Remove the loading text
      const loadingText = this.leaderboardPopup.list[
        this.leaderboardPopup.list.length - 1
      ] as Phaser.GameObjects.Text;
      if (loadingText && 'destroy' in loadingText) {
        loadingText.destroy();
      }

      if (leaderboardData.scores.length === 0) {
        console.log('[Leaderboard] No scores available');
        
        // Create an empty galaxy graphic
        const emptyGraphic = this.add.graphics();
        
        // Create a small galaxy illustration
        emptyGraphic.fillStyle(0x4466ff, 0.3);
        emptyGraphic.fillCircle(0, -50, 40);
        emptyGraphic.fillStyle(0x0033aa, 0.5);
        emptyGraphic.fillCircle(0, -50, 25);
        emptyGraphic.fillStyle(0xffffff, 0.8);
        emptyGraphic.fillCircle(0, -50, 5);
        
        // Add some dots around to represent stars
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 20 + Math.random() * 60;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance - 50;
          const size = Math.random() * 2 + 1;
          emptyGraphic.fillStyle(0xffffff, 0.7);
          emptyGraphic.fillCircle(x, y, size);
        }
        
        // Create empty state container
        const emptyContainer = this.add.container(0, 0);
        
        // Show no scores available message with better styling
        const noScoresText = this.add
          .text(0, 20, 'NO COMMANDERS DETECTED', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            color: '#4466ff',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
          
        const encourageText = this.add
          .text(0, 60, 'Be the first to claim your place\nin the galactic rankings!', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
          })
          .setOrigin(0.5);
        
        // Add pulsing animation to the galaxy
        this.tweens.add({
          targets: emptyGraphic,
          alpha: { from: 0.7, to: 1 },
          scale: { from: 0.9, to: 1.1 },
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        emptyContainer.add([emptyGraphic, noScoresText, encourageText]);
        this.leaderboardPopup.add(emptyContainer);
        
      } else {
        console.log('[Leaderboard] Creating leaderboard UI with scores');
        // Create styled header section with background
        const headerBg = this.add.rectangle(0, -180, 460, 40, 0x0033aa, 0.6);
        headerBg.setStrokeStyle(1, 0x4466ff, 0.7);
        
        // Create header row with better alignment and styling
        const rankHeader = this.add.text(-200, -180, 'RANK', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#aaccff',
          align: 'center',
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        const nameHeader = this.add.text(0, -180, 'COMMANDER', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#aaccff',
          align: 'center',
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        const scoreHeader = this.add.text(180, -180, 'SCORE', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#aaccff',
          align: 'center',
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        this.leaderboardPopup.add([headerBg, rankHeader, nameHeader, scoreHeader]);

        // Add a separator line
        const separatorLine = this.add.graphics();
        separatorLine.lineStyle(1, 0x4466ff, 0.7);
        separatorLine.beginPath();
        separatorLine.moveTo(-230, -160);
        separatorLine.lineTo(230, -160);
        separatorLine.strokePath();
        this.leaderboardPopup.add(separatorLine);

        // Create a container for scrollable content
        const scrollContainer = this.add.container(0, -130);
        this.leaderboardPopup.add(scrollContainer);

        console.log('[Leaderboard] Adding individual score entries to UI');
        // Add each score to the leaderboard (limit to 10 entries maximum)
        const scoresToDisplay = leaderboardData.scores.slice(0, 10);
        scoresToDisplay.forEach((score, index) => {
          console.log(
            `[Leaderboard] Adding score entry ${index + 1}: ${score.username} - ${score.score}`
          );
          const y = index * 40; // Position relative to scroll container
          
          // Create row container for each entry
          const rowContainer = this.add.container(0, y);
          
          // Add alternating row background for better readability
          let rowBgColor = index % 2 === 0 ? 0x223366 : 0x112244;
          // Special styling for top 3
          if (index < 3) {
            const topColors = [0x664400, 0x555555, 0x553311];
            const topColor = topColors[index] || 0x223366; // Fallback to default if undefined
            rowBgColor = topColor;
          }
          
          const rowBg = this.add.rectangle(0, 0, 460, 36, rowBgColor, 0.3);
          rowContainer.add(rowBg);

          // Consistent rank display for all positions
          let rankDisplay;
          // For all ranks, use the same position but with different styling
          if (index === 0) {
            // Gold medal
            rankDisplay = this.add.text(-200, 0, `${index + 1}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#ffcc00', // Gold color
              fontStyle: 'bold',
              align: 'center',
            }).setOrigin(0.5);
          } else if (index === 1) {
            // Silver medal
            rankDisplay = this.add.text(-200, 0, `${index + 1}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#cccccc', // Silver color
              fontStyle: 'bold',
              align: 'center',
            }).setOrigin(0.5);
          } else if (index === 2) {
            // Bronze medal
            rankDisplay = this.add.text(-200, 0, `${index + 1}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#cc8844', // Bronze color
              fontStyle: 'bold',
              align: 'center',
            }).setOrigin(0.5);
          } else {
            // Regular number
            rankDisplay = this.add.text(-200, 0, `${index + 1}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#ffffff',
              align: 'center',
            }).setOrigin(0.5);
          }

          // Username - truncate if too long
          let username = score.username;
          if (username.length > 15) {
            username = username.substring(0, 12) + '...';
            console.log(`[Leaderboard] Truncated username: ${score.username} -> ${username}`);
          }

          const nameText = this.add.text(0, 0, username, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
          }).setOrigin(0.5);

          // Score with formatting
          const scoreText = this.add.text(180, 0, `${score.score.toLocaleString()}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
          }).setOrigin(0.5);

          // Add special effects for top scores
          if (index < 3) {
            const glowColor = [0xffdd00, 0xdddddd, 0xddaa66][index];
            
            // Add subtle glow effect
            nameText.setTint(glowColor);
            scoreText.setTint(glowColor);
            
            // Make text slightly larger for top scores
            nameText.setFontSize(22);
            scoreText.setFontSize(22);
          }
          
          // Add all elements to the row
          rowContainer.add([rankDisplay, nameText, scoreText]);
          
          // Add row to scroll container with animation delay
          scrollContainer.add(rowContainer);
          
          // Initial state - slide in from right with delay based on position
          rowContainer.setX(500);
          rowContainer.setAlpha(0);
          
          // Animate each row in sequence
          this.tweens.add({
            targets: rowContainer,
            x: 0,
            alpha: 1,
            delay: index * 80,
            duration: 300,
            ease: 'Back.Out'
          });
        });
      }

      console.log('[Leaderboard] Adding opening animation');
      // Add a nice animation
      this.tweens.add({
        targets: this.leaderboardPopup,
        scale: { from: 0.8, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          console.log('[Leaderboard] Opening animation completed');
        },
      });
    } catch (error) {
      console.error('[Leaderboard] Error loading leaderboard:', error);

      // Remove the loading text
      const loadingText = this.leaderboardPopup.list[
        this.leaderboardPopup.list.length - 1
      ] as Phaser.GameObjects.Text;
      if (loadingText && 'destroy' in loadingText) {
        loadingText.destroy();
      }

      // Create an error display container
      const errorContainer = this.add.container(0, 0);
      
      // Create warning icon
      const warningGraphic = this.add.graphics();
      warningGraphic.fillStyle(0xdd3333, 0.8);
      warningGraphic.fillTriangle(0, -80, -40, -20, 40, -20);
      warningGraphic.fillStyle(0x000000, 1);
      warningGraphic.fillRect(-4, -70, 8, 30);
      warningGraphic.fillCircle(0, -30, 4);
      
      // Show error message with better styling
      const errorText = this.add
        .text(0, 20, 'COMMUNICATION ERROR', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '26px',
          color: '#ff6666',
          align: 'center',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
        
      const errorDetailText = this.add
        .text(0, 60, 'Unable to establish connection with\nthe galactic database.\nPlease try again later.', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);
        
      // Add retry button
      const retryButton = this.add.container(0, 120);
      
      const retryBg = this.add.rectangle(0, 0, 120, 40, 0x444444, 0.8);
      retryBg.setStrokeStyle(2, 0xff6666);
      
      const retryText = this.add.text(0, 0, 'RETRY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5);
      
      retryButton.add([retryBg, retryText]);
      retryButton.setInteractive(
        new Phaser.Geom.Rectangle(-60, -20, 120, 40),
        Phaser.Geom.Rectangle.Contains
      );
      
      // Add hover effects for retry button
      retryButton.on('pointerover', () => {
        retryBg.setFillStyle(0x666666, 0.8);
        retryText.setTint(0xff9999);
      });
      
      retryButton.on('pointerout', () => {
        retryBg.setFillStyle(0x444444, 0.8);
        retryText.setTint(0xffffff);
      });
      
      // Add retry functionality
      retryButton.on('pointerdown', () => {
        errorContainer.destroy();
        const loadingText = this.add
          .text(0, 0, 'RETRIEVING DATA...', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            color: '#4466ff',
            align: 'center',
          })
          .setOrigin(0.5);
        this.leaderboardPopup.add(loadingText);
        
        // Retry getting the leaderboard after a short delay
        this.time.delayedCall(500, () => {
          this.hideLeaderboard();
          this.time.delayedCall(300, () => {
            void this.showLeaderboard();
          });
        });
      });
      
      // Add flashing animation to warning icon
      this.tweens.add({
        targets: warningGraphic,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
        yoyo: true, 
        repeat: -1
      });
      
      errorContainer.add([warningGraphic, errorText, errorDetailText, retryButton]);
      this.leaderboardPopup.add(errorContainer);
    }
  }

  private hideLeaderboard(): void {
    if (!this.leaderboardVisible) {
      console.log('[Leaderboard] Leaderboard is already hidden, ignoring hideLeaderboard call');
      return;
    }

    console.log('[Leaderboard] Closing leaderboard popup');

    // Add a nice animation when hiding
    this.tweens.add({
      targets: this.leaderboardPopup,
      scale: { from: 1, to: 0.8 },
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        console.log('[Leaderboard] Closing animation completed');
        this.leaderboardPopup.setVisible(false);

        // Important: Only set the flag to false AFTER the animation completes
        // and the cleanup is done
        this.leaderboardVisible = false;
        console.log('[Leaderboard] Clearing score entries from popup');
        // Clear all score entries but keep the first 5 elements (fullscreen block, background, title, close button, loading text)
        while (this.leaderboardPopup.list.length > 5) {
          const item = this.leaderboardPopup.list[
            this.leaderboardPopup.list.length - 1
          ] as Phaser.GameObjects.GameObject;

          // Properly clean up container objects
          if (item instanceof Phaser.GameObjects.Container) {
            console.log('[Leaderboard] Cleaning up container with', item.list.length, 'children');
            // Destroy all children in the container
            item.each((child: Phaser.GameObjects.GameObject) => {
              if (child && 'destroy' in child) {
                child.destroy();
              }
            });
          }

          if (item && 'destroy' in item) {
            item.destroy();
          } else {
            // If we can't destroy it properly, at least remove it from the container
            this.leaderboardPopup.remove(item);
          }
        }

        console.log('[Leaderboard] Recreating loading text for next open');
        // Recreate the loading text
        const loadingText = this.add
          .text(0, 0, 'Loading scores...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
          })
          .setOrigin(0.5);

        this.leaderboardPopup.add(loadingText);
      },
    });
  }

  /**
   * Generates and submits test scores for the leaderboard
   * This is a development utility function - currently disabled
   */
  /*
  private async generateTestScores(): Promise<void> {
    console.log('[TestData] Generating test scores for leaderboard...');

    // Create an array of test player names
    const testPlayers = [
      'SpaceAce',
      'StarHunter',
      'CosmicRider',
      'GalaxyQueen',
      'NebulaNinja',
      'AstroBlaster',
      'VoidWalker',
      'SolarSurfer',
      'MeteorMaster',
      'PlanetHopper',
    ];

    // Function to submit a score for a specific username
    const submitTestScore = async (username: string, score: number): Promise<void> => {
      console.log(`[TestData] Submitting score ${score} for ${username}`);
      try {
        const response = await fetch('/api/submit-test-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, score }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`[TestData] Successfully submitted score for ${username}`);
      } catch (error) {
        console.error(`[TestData] Error submitting score for ${username}:`, error);
      }
    };

    try {
      // Show a loading message
      const loadingText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Generating test scores...', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Submit scores for each test player with random scores
      const promises = testPlayers.map((player, index) => {
        // Generate a random score between 100 and 1000
        const baseScore = 100 + Math.floor(Math.random() * 900);
        // Make scores somewhat descending for better visual display
        const adjustedScore = baseScore - index * 50 + Math.floor(Math.random() * 100);
        const finalScore = Math.max(50, adjustedScore);

        // Add a small delay between submissions to avoid overwhelming the server
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            await submitTestScore(player, finalScore);
            resolve();
          }, index * 200);
        });
      });

      await Promise.all(promises);

      // Remove the loading text
      loadingText.destroy();

      // Show success message
      const successText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Test scores generated!', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Show the leaderboard after a short delay
      setTimeout(() => {
        successText.destroy();
        void this.showLeaderboard();
      }, 1500);
    } catch (error) {
      console.error('[TestData] Error generating test scores:', error);
    }
  }
  */
}
