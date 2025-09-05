import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { submitScore, getLeaderboard } from '../api';
// TODO: Update the import path below to the correct location of the Score type if it exists elsewhere.
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
  // Removed unused scoreText property

  constructor() {
    super('GameOver');
  }

  init(data: { score: number }) {
    this.score = data.score || 0;
    console.log('GameOver scene initialized with score:', this.score);
  }

  async create() {
    console.log('GameOver scene created. Score:', this.score);
    
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

    // "Game Over" text
    // "Game Over" text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 100, 'Game Over', {
        fontFamily: 'Arial Black',
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);
    // Score text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Score: ${this.score}`, {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Submit score and get leaderboard
    try {
      console.log('Submitting score:', this.score);
      await submitScore(this.score);
      console.log('Score submitted successfully.');

      console.log('Fetching leaderboard...');
      const leaderboardData = await getLeaderboard();
      console.log('Leaderboard data received:', leaderboardData);
      this.leaderboard = leaderboardData?.scores || [];
    } catch (error) {
      console.error('Error during score submission or leaderboard fetch:', error);
    }

    // Display leaderboard
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 50, 'High Scores', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    if (this.leaderboard && this.leaderboard.length > 0) {
      this.leaderboard.forEach((scoreItem, index) => {
        this.add
          .text(
            this.scale.width / 2,
            this.scale.height / 2 + 90 + index * 30,
            `${index + 1}. ${scoreItem.username}: ${scoreItem.score}`,
            {
              fontFamily: 'Arial',
              fontSize: '20px',
              color: '#ffffff',
              align: 'center',
            }
          )
          .setOrigin(0.5);
      });
    } else {
      this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2 + 90,
          'No high scores yet!',
          {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#aaaaaa',
            align: 'center',
          }
        )
        .setOrigin(0.5);
    }

    // Restart button
    this.restartButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 180, 'Restart', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#ff0000',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Add Main Menu button
    this.mainMenuButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 240, 'Main Menu', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#0066ff',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Add instruction text
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 300, 'Press SPACE to restart', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5);

    // Button interactions
    this.restartButton.on('pointerdown', () => {
      this.restartGame();
    });

    this.mainMenuButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  override update() {
    // Check for spacebar press
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.restartGame();
    }
  }

  private restartGame() {
    this.scene.start('StarshipScene');
  }
}
