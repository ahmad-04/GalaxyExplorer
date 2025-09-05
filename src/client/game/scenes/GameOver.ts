import { Scene } from 'phaser';
import { submitScore, getLeaderboard } from '../api';
import { Score } from '../../shared/types/api';

export class GameOver extends Scene {
  // ... existing code ...
  leaderboard: Score[] = [];

  constructor() {
    super('GameOver');
  }

  init(data: { score: number }) {
    this.score = data.score;
  }

  async create() {
    // ... existing code ...

    // Submit score and get leaderboard
    await submitScore(this.score);
    const leaderboardData = await getLeaderboard();
    this.leaderboard = leaderboardData.scores;

    // Display leaderboard
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 150, 'High Scores', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.leaderboard.forEach((scoreItem, index) => {
      this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2 + 200 + index * 30,
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

    // Return to Main Menu on tap / click
    this.restartButton.on('pointerdown', () => {
      this.scene.start('StarshipScene');
    });
  }
}
