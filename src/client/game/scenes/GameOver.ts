import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { submitScore, getLeaderboard } from '../api';
import { BackgroundManager } from '../services/BackgroundManager';
import { titleText, bodyText, createPanel, createButton } from '../ui/UiKit';
import { shineSweep } from '../effects/Effects';
// TODO: Update below to the correct location of the Score type if it exists elsewhere.
// import { Score } from '../../shared/types/api';

// Temporary fix: Define the Score type here if the module is missing.
type Score = {
  username: string;
  score: number;
};

export class GameOver extends Scene {
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private restartBtn?: ReturnType<typeof createButton>;
  private menuBtn?: ReturnType<typeof createButton>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private leaderboard: Score[] = [];
  private startTime: Date = new Date();
  private panelY: number = 0;
  private panelHeight: number = 420;
  private starfield!: Phaser.GameObjects.TileSprite;
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

    // Configure camera and background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x000000);
    const starsKey = BackgroundManager.ensureStars(this);
    this.starfield = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, starsKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    // Add a panel for the game content - adjusted to be more centered
    console.log(`[${new Date().toISOString()}] [GameOver] Creating game panel`);
    const panelWidth = Math.min(600, this.scale.width * 0.9);
    this.panelHeight = 420; // slightly shorter to avoid being too tall

    // Calculate panel position - moved up to reduce empty space at the top
    this.panelY = this.scale.height / 2 - 200;

    // Themed panel
    createPanel(
      this,
      this.scale.width / 2 - panelWidth / 2,
      this.panelY,
      panelWidth,
      this.panelHeight
    );

    // "Game Over" text with enhanced styling and animation - positioned higher
    const title = titleText(this, this.scale.width / 2, this.scale.height / 2 - 160, 'Game Over')
      .setScale(0.9)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 700, ease: 'Back.out' });
    this.time.delayedCall(700, () => shineSweep(this, title.y));

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
    const scoreText = bodyText(
      this,
      this.scale.width / 2,
      this.scale.height / 2 - 80,
      `Score: ${this.score}`,
      32
    ).setAlpha(0);
    this.tweens.add({ targets: scoreText, alpha: 1, duration: 600, ease: 'Power2', delay: 300 });

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
    bodyText(this, this.scale.width / 2, this.scale.height / 2 - 10, 'Post High Score', 22);

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
    // Avoid duplicates if called twice
    if (this.restartBtn || this.menuBtn) return;

    const buttonY = this.panelY + this.panelHeight - 100;
    const buttonSpacing = 60;
    this.restartBtn = createButton(this, this.scale.width / 2, buttonY, 'Restart');
    this.menuBtn = createButton(this, this.scale.width / 2, buttonY + buttonSpacing, 'Main Menu');

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

    const spaceInstruction = bodyText(
      this,
      this.scale.width / 2,
      this.panelY + this.panelHeight + 32,
      'Press SPACE to restart',
      18
    ).setAlpha(1);

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
    this.restartBtn.container.once('pointerdown', () => {
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
        const last = this.registry.get('lastRunMode');
        this.scene.start(last === 'custom' ? 'CustomLevelScene' : 'EndlessScene');
      });
    });

    // Main menu button interactions
    this.menuBtn.container.once('pointerdown', () => {
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
    if (this.starfield) {
      this.starfield.tilePositionY += 0.2;
    }
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
      const last = this.registry.get('lastRunMode');
      this.scene.start(last === 'custom' ? 'CustomLevelScene' : 'EndlessScene');
    });
  }
}
