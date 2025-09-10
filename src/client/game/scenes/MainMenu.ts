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

    const leaderboardButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 140, 'Top 10 Leaderboard', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#aa00aa',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

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

    // Add instruction text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 210, 'Press SPACE to start', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create but hide the leaderboard popup initially
    this.createLeaderboardPopup();

    startButton.on('pointerdown', () => {
      this.startGame();
    });

    customizeButton.on('pointerdown', () => {
      // Reset leaderboard state before changing scenes
      this.resetLeaderboardState();
      this.scene.start('CustomizationScene');
    });

    leaderboardButton.on('pointerdown', () => {
      void this.showLeaderboard(); // Use void to explicitly mark promise as handled
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

    // Create an invisible fullscreen backdrop to prevent clicks passing through
    const fullscreenBlock = this.add.rectangle(
      0,
      0,
      this.scale.width * 2,
      this.scale.height * 2,
      0x000000,
      0.01
    );
    fullscreenBlock.setInteractive();
    fullscreenBlock.on('pointerdown', () => {
      // Consume the click but do nothing
      console.log('[Leaderboard] Blocked click on backdrop');
      return false;
    });

    // Create a semi-transparent background - make it larger to accommodate more scores
    const background = this.add.rectangle(0, 0, 500, 700, 0x000000, 0.8);
    background.setStrokeStyle(2, 0x4466ff, 1);

    // Make the background interactive to capture clicks
    background.setInteractive();
    background.on('pointerdown', () => {
      // Consume the click but do nothing
      console.log('[Leaderboard] Blocked click on leaderboard background');
      return false;
    });

    // Add title text
    const titleText = this.add
      .text(0, -250, 'Top 10 Leaderboard', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create a close button
    const closeButton = this.add
      .text(220, -250, 'X', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        backgroundColor: '#aa0000',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Handle close button click
    closeButton.on('pointerdown', () => {
      // Stop propagation by consuming the event
      console.log('[Leaderboard] Close button clicked');
      this.hideLeaderboard();
      return false;
    });

    // Create a loading text initially
    const loadingText = this.add
      .text(0, 0, 'Loading scores...', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Add everything to the container
    this.leaderboardPopup.add([fullscreenBlock, background, titleText, closeButton, loadingText]);

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
        // Show no scores available message
        const noScoresText = this.add
          .text(0, 0, 'No scores available yet.\nBe the first to score!', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
          })
          .setOrigin(0.5);

        this.leaderboardPopup.add(noScoresText);
      } else {
        console.log('[Leaderboard] Creating leaderboard UI with scores');
        // Create header row
        const rankHeader = this.add.text(-200, -180, 'Rank', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffff00',
          align: 'left',
          fontStyle: 'bold',
        });

        const nameHeader = this.add.text(-100, -180, 'Player', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffff00',
          align: 'left',
          fontStyle: 'bold',
        });

        const scoreHeader = this.add.text(120, -180, 'Score', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffff00',
          align: 'left',
          fontStyle: 'bold',
        });

        this.leaderboardPopup.add([rankHeader, nameHeader, scoreHeader]);

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

          // Rank number
          const rankText = this.add.text(-200, y, `${index + 1}`, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            align: 'left',
          });

          // Username - truncate if too long
          let username = score.username;
          if (username.length > 15) {
            username = username.substring(0, 12) + '...';
            console.log(`[Leaderboard] Truncated username: ${score.username} -> ${username}`);
          }

          const nameText = this.add.text(-100, y, username, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            align: 'left',
          });

          // Score
          const scoreText = this.add.text(120, y, `${score.score}`, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            align: 'left',
          });

          // Highlight the top score
          if (index === 0) {
            console.log('[Leaderboard] Highlighting top score');
            rankText.setColor('#ffff00');
            nameText.setColor('#ffff00');
            scoreText.setColor('#ffff00');
          }

          scrollContainer.add([rankText, nameText, scoreText]);
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

      // Show error message
      const errorText = this.add
        .text(0, 0, 'Failed to load leaderboard.\nPlease try again later.', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ff0000',
          align: 'center',
        })
        .setOrigin(0.5);

      this.leaderboardPopup.add(errorText);
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
