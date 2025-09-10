import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { submitScore, getLeaderboard } from '../api';
// TODO: Update below to the correct location of the Score type if it exists elsewhere.
// import { Score } from '../../shared/types/api';

// Temporary fix: Define the Score type here if the module is missing.
type Score = {
  username: string;
  score: number;
};

export class GameOver extends Scene {
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private restartButton!: Phaser.GameObjects.Text;
  private mainMenuButton!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private leaderboard: Score[] = [];
  private startTime: Date = new Date();
  private panelY: number = 0;
  private panelHeight: number = 420;
  // Removed unused scoreText property

  constructor() {
    super('GameOver');
  }

  init(data: { score: number }) {
    this.score = data.score || 0;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [GameOver] Scene initialized with score: ${this.score}`);
  }

  async create() {
    this.startTime = new Date();
    console.log(
      `[${this.startTime.toISOString()}] [GameOver] Scene create started. Score: ${this.score}`
    );

    // Start API calls early and in parallel
    const apiStartTime = new Date();
    console.log(`[${apiStartTime.toISOString()}] [GameOver] Starting API calls in parallel`);
    const scorePromise = submitScore(this.score).catch((error) => {
      console.error(`[${new Date().toISOString()}] [GameOver] Score submission error:`, error);
      return null;
    });
    const leaderboardPromise = getLeaderboard(10).catch((error) => {
      console.error(`[${new Date().toISOString()}] [GameOver] Leaderboard fetch error:`, error);
      return { scores: [] };
    });

    // Enable keyboard input and ensure focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();

    // Add spacebar key and capture it to prevent page scrolling
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x000000);

    // Add a semi-transparent overlay background with fade-in animation
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.7);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    // Create a dark space-themed background gradient - expanded to cover all black space
    console.log(`[${new Date().toISOString()}] [GameOver] Creating background elements`);
    const bgGraphics = this.add.graphics();
    bgGraphics.fillGradientStyle(
      0x000066, // brighter blue at top
      0x000044, // mid blue
      0x000033, // darker blue
      0x000022, // darkest blue at bottom
      1,
      1,
      1,
      1
    );
    bgGraphics.fillRect(0, 0, this.scale.width, this.scale.height);

    // Add more stars to fill the background nicely
    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9);

      const star = this.add.circle(x, y, size, 0xffffff, alpha);

      // Add twinkling animation to more stars
      if (Math.random() > 0.5) {
        this.tweens.add({
          targets: star,
          alpha: 0.2,
          yoyo: true,
          repeat: -1,
          duration: Phaser.Math.Between(1000, 4000),
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 2000), // randomize start time
        });
      }

      // Add some brighter blue stars
      if (Math.random() > 0.9) {
        const bluestar = this.add.circle(
          Phaser.Math.Between(0, this.scale.width),
          Phaser.Math.Between(0, this.scale.height),
          Phaser.Math.FloatBetween(1, 3),
          0x88aaff,
          0.7
        );

        this.tweens.add({
          targets: bluestar,
          alpha: 0.3,
          yoyo: true,
          repeat: -1,
          duration: Phaser.Math.Between(1000, 2000),
          ease: 'Sine.easeInOut',
        });
      }
    }

    // Add a panel for the game content - adjusted to be more centered
    console.log(`[${new Date().toISOString()}] [GameOver] Creating game panel`);
    const panelWidth = Math.min(600, this.scale.width * 0.9);
    this.panelHeight = 420; // slightly shorter to avoid being too tall

    // Calculate panel position - moved up to reduce empty space at the top
    this.panelY = this.scale.height / 2 - 200;

    // Create a more substantial panel with rounded corners
    const panel = this.add.graphics();
    panel.fillStyle(0x111155, 0.7);
    panel.lineStyle(3, 0x4466ff, 0.4);
    panel.fillRoundedRect(
      this.scale.width! / 2 - panelWidth / 2,
      this.panelY,
      panelWidth,
      this.panelHeight,
      15
    );

    // Add a more pronounced inner glow to the panel
    const glow = this.add.graphics();
    glow.lineStyle(5, 0x4488ff, 0.15);
    glow.strokeRoundedRect(
      this.scale.width / 2 - panelWidth / 2 + 10,
      this.panelY + 10,
      panelWidth - 20,
      this.panelHeight - 20,
      15
    );

    // Add an outer glow effect
    const outerGlow = this.add.graphics();
    outerGlow.lineStyle(8, 0x3355dd, 0.1);
    outerGlow.strokeRoundedRect(
      this.scale.width / 2 - panelWidth / 2 - 10,
      this.panelY - 10,
      panelWidth + 20,
      this.panelHeight + 20,
      25
    );

    // More complex animation for panel and glow effects
    panel.alpha = 0;
    glow.alpha = 0;
    outerGlow.alpha = 0;

    // Add a slight scale animation to the panel for a more dynamic entry
    this.tweens.add({
      targets: [panel, glow, outerGlow],
      alpha: { from: 0, to: 1 },
      duration: 1000,
      ease: 'Power2',
      delay: 200,
    });

    // Add a subtle pulse effect to the outer glow
    this.tweens.add({
      targets: outerGlow,
      alpha: 0.2,
      yoyo: true,
      repeat: -1,
      duration: 2000,
      ease: 'Sine.easeInOut',
      delay: 1200,
    });

    // "Game Over" text with enhanced styling and animation - positioned higher
    const gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 160, 'Game Over', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '60px',
        color: '#ffffff',
        stroke: '#000033',
        strokeThickness: 6,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000033',
          blur: 8,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setScale(0.8)
      .setAlpha(0);

    // Animate the Game Over text
    this.tweens.add({
      targets: gameOverText,
      scale: 1,
      alpha: 1,
      duration: 800,
      ease: 'Back.out',
      delay: 400,
    });

    // Add a shine effect across the title
    this.time.delayedCall(1200, () => {
      const shine = this.add.graphics();
      shine.fillStyle(0xffffff, 0.3);
      shine.fillRect(-100, this.scale.height / 2 - 110 - 30, 50, 60);
      shine.x = -50;

      this.tweens.add({
        targets: shine,
        x: this.scale.width + 100,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          shine.destroy();
        },
      });
    });

    // Submit score and get leaderboard
    try {
      // Continue building UI while waiting for API results
      // Build the UI first then wait for API promises to resolve
      console.log(`[${new Date().toISOString()}] [GameOver] Waiting for API calls to complete`);
      const [_, leaderboardData] = await Promise.all([scorePromise, leaderboardPromise]);
      const apiEndTime = new Date();
      console.log(
        `[${apiEndTime.toISOString()}] [GameOver] API calls completed. Total time: ${apiEndTime.getTime() - apiStartTime.getTime()}ms`
      );
      this.leaderboard = leaderboardData?.scores || [];

      // Now that we have the leaderboard data, we can render it
      this.renderLeaderboard();
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [GameOver] Error during score submission or leaderboard fetch:`,
        error
      );
    }

    // Score text with enhanced styling and animation - adjusted position
    const scoreText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 80, `Score: ${this.score}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000033',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Animate the score text
    this.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      delay: 800,
    });

    // Add decorative separator line - adjusted position
    const separator = this.add.graphics();
    separator.lineStyle(1, 0x4466ff, 0.6);
    separator.lineBetween(
      this.scale.width / 2 - 150,
      this.scale.height / 2 - 40,
      this.scale.width / 2 + 150,
      this.scale.height / 2 - 40
    );

    // Display only the top score for this post with better styling - adjusted position
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 10, 'Post High Score', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#88bbff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create buttons before waiting for leaderboard - improves perceived performance
    this.createButtons();

    // Log completion time of create method
    const endTime = new Date();
    const createDuration = endTime.getTime() - this.startTime.getTime();
    console.log(
      `[${endTime.toISOString()}] [GameOver] Scene create completed. Total time: ${createDuration}ms`
    );
  }

  private renderLeaderboard() {
    if (this.leaderboard && this.leaderboard.length > 0) {
      console.log(
        `[${new Date().toISOString()}] [GameOver] Rendering leaderboard with ${this.leaderboard.length} entries`
      );
      // Get the top score from the leaderboard
      const topScore = this.leaderboard[0];
      if (topScore) {
        // Create a highlight box for the top score - adjusted position
        const scoreHighlight = this.add.graphics();
        scoreHighlight.fillStyle(0x223366, 0.3);
        scoreHighlight.lineStyle(1, 0x4466ff, 0.4);
        scoreHighlight.fillRoundedRect(
          this.scale.width / 2 - 150,
          this.scale.height / 2 + 20,
          300,
          40,
          10
        );
        scoreHighlight.strokeRoundedRect(
          this.scale.width / 2 - 150,
          this.scale.height / 2 + 20,
          300,
          40,
          10
        );

        // Add the top score text - adjusted position
        this.add
          .text(
            this.scale.width / 2,
            this.scale.height / 2 + 40,
            `${topScore.username}: ${topScore.score}`,
            {
              fontFamily: 'Arial, sans-serif',
              fontSize: '24px',
              color: '#ffffff',
              align: 'center',
              fontStyle: 'bold',
            }
          )
          .setOrigin(0.5);
      }
    } else {
      this.add
        .text(this.scale.width / 2, this.scale.height / 2 + 40, 'No high scores yet!', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#aaaaaa',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    // Create buttons
    const buttonCreationTime = new Date();
    this.createButtons();
    console.log(
      `[${new Date().toISOString()}] [GameOver] Buttons created. Time taken: ${new Date().getTime() - buttonCreationTime.getTime()}ms`
    );
  }

  private createButtons() {
    // Define button positions
    const buttonY = this.panelY + this.panelHeight - 100;
    const buttonSpacing = 60;

    // Create restart button background with gradient and border
    const restartBg = this.add.graphics();
    restartBg.fillGradientStyle(0xaa1111, 0xaa1111, 0x771111, 0x771111, 1, 1, 1, 1);
    restartBg.lineStyle(2, 0xff3333, 0.5);
    restartBg.fillRoundedRect(this.scale.width / 2 - 80, buttonY - 20, 160, 40, 10);
    restartBg.strokeRoundedRect(this.scale.width / 2 - 80, buttonY - 20, 160, 40, 10);

    // Restart button with improved styling
    this.restartButton = this.add
      .text(this.scale.width / 2, buttonY, 'Restart', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
        stroke: '#330000',
        strokeThickness: 1,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Main menu button background with gradient and border
    const menuBg = this.add.graphics();
    menuBg.fillGradientStyle(0x113388, 0x113388, 0x112266, 0x112266, 1, 1, 1, 1);
    menuBg.lineStyle(2, 0x4477ff, 0.5);
    menuBg.fillRoundedRect(this.scale.width / 2 - 80, buttonY + buttonSpacing - 15, 160, 40, 10);
    menuBg.strokeRoundedRect(this.scale.width / 2 - 80, buttonY + buttonSpacing - 15, 160, 40, 10);

    // Add Main Menu button with improved styling
    this.mainMenuButton = this.add
      .text(this.scale.width / 2, buttonY + buttonSpacing, 'Main Menu', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000033',
        strokeThickness: 1,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Add space key instruction text below the panel with a clear background for better visibility
    // Add space key instruction text below the panel with a clear background for better visibility
    // First add a background for the text - wider to fully cover the text
    const textBg = this.add.graphics();
    textBg.fillStyle(0x000066, 0.4);
    textBg.lineStyle(1, 0x4466ff, 0.6);
    textBg.fillRoundedRect(
      this.scale.width / 2 - 160,
      this.panelY + this.panelHeight + 15,
      320,
      36,
      10
    );
    textBg.strokeRoundedRect(
      this.scale.width / 2 - 160,
      this.panelY + this.panelHeight + 15,
      320,
      36,
      10
    );

    const spaceInstruction = this.add
      .text(this.scale.width / 2, this.panelY + this.panelHeight + 32, 'Press SPACE to restart', {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'italic',
        stroke: '#000033',
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(1);

    // Animate the space instruction for better visibility
    this.tweens.add({
      targets: spaceInstruction,
      alpha: 0.7,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    });

    // Button interactions with hover effects
    // Restart button interactions
    this.restartButton
      .on('pointerover', () => {
        this.restartButton.setScale(1.1);
        // Create a glow effect
        const glow = this.add.graphics();
        glow.name = 'restartGlow';
        glow.fillStyle(0xff3333, 0.3);
        glow.fillCircle(this.scale.width / 2, buttonY, 90);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setDepth(-1);
        // Place the glow behind the button
        this.children.bringToTop(this.restartButton);
      })
      .on('pointerout', () => {
        this.restartButton.setScale(1.0);
        // Remove the glow effect
        const glow = this.children.getByName('restartGlow');
        if (glow) {
          glow.destroy();
        }
      })
      .on('pointerdown', () => {
        this.restartButton.setScale(0.95);

        console.log('[GameOver] Restart button clicked');
        console.log('[GameOver] Starting fresh StarshipScene');

        // First, make sure any existing scene is completely gone
        if (this.scene.get('StarshipScene')) {
          console.log('[GameOver] Stopping existing StarshipScene');
          this.scene.stop('StarshipScene');
        }

        // Wait a tiny bit to ensure the scene is fully stopped
        this.time.delayedCall(50, () => {
          // Start a fresh StarshipScene
          console.log('[GameOver] Creating new StarshipScene');
          this.scene.start('StarshipScene');
        });
      });

    // Main menu button interactions
    this.mainMenuButton
      .on('pointerover', () => {
        this.mainMenuButton.setScale(1.1);
        // Create a glow effect for the menu button
        const glow = this.add.graphics();
        glow.name = 'menuGlow';
        glow.fillStyle(0x3366ff, 0.3);
        glow.fillCircle(this.scale.width / 2, buttonY + buttonSpacing, 90);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setDepth(-1);
        // Place the glow behind the button
        this.children.bringToTop(this.mainMenuButton);
      })
      .on('pointerout', () => {
        this.mainMenuButton.setScale(1.0);
        // Remove the glow effect
        const glow = this.children.getByName('menuGlow');
        if (glow) {
          glow.destroy();
        }
      })
      .on('pointerdown', () => {
        this.mainMenuButton.setScale(0.95);

        console.log(`[${new Date().toISOString()}] [GameOver] Main Menu button clicked`);

        // First, make sure any existing scene is completely gone
        if (this.scene.get('StarshipScene')) {
          console.log(
            `[${new Date().toISOString()}] [GameOver] Stopping existing StarshipScene before going to menu`
          );
          this.scene.stop('StarshipScene');
        }

        // Wait a tiny bit to ensure the scene is fully stopped
        this.time.delayedCall(50, () => {
          // Go back to the main menu
          console.log(`[${new Date().toISOString()}] [GameOver] Starting MainMenu scene`);
          this.scene.start('MainMenu');
        });
      });

    // Log completion time of create method
    const endTime = new Date();
    const createDuration = endTime.getTime() - this.startTime.getTime();
    console.log(
      `[${endTime.toISOString()}] [GameOver] Scene create completed. Total time: ${createDuration}ms`
    );
  }

  override update() {
    // Check for spacebar press
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      console.log(`[${new Date().toISOString()}] [GameOver] Space key pressed, restarting game`);
      this.restartGame();
    }
  }

  private restartGame() {
    console.log(`[${new Date().toISOString()}] [GameOver] restartGame() called`);

    // First, make sure any existing scene is completely gone
    if (this.scene.get('StarshipScene')) {
      console.log(
        `[${new Date().toISOString()}] [GameOver] Stopping existing StarshipScene before restart`
      );
      this.scene.stop('StarshipScene');
    }

    // Wait a tiny bit to ensure the scene is fully stopped
    this.time.delayedCall(50, () => {
      // Force full recreation of the game scene
      console.log(`[${new Date().toISOString()}] [GameOver] Starting new StarshipScene`);
      this.scene.start('StarshipScene');
    });
  }
}
