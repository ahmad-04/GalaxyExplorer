import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;
  score = 0;
  scoreText!: Phaser.GameObjects.Text;
  restartButton!: Phaser.GameObjects.Text;

  constructor() {
    super('GameOver');
  }

  init(data: { score: number }) {
    this.score = data.score;
  }

  create() {
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x000000);

    // "Game Over" text
    this.gameover_text = this.add
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
    this.scoreText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Score: ${this.score}`, {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Restart button
    this.restartButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 100, 'Restart', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#ff0000',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Return to Main Menu on tap / click
    this.restartButton.on('pointerdown', () => {
      this.scene.start('StarshipScene');
    });
  }
}
