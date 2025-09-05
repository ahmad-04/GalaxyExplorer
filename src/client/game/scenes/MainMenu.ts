import { Scene } from 'phaser';

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
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
      .text(this.scale.width / 2, this.scale.height / 2 + 50, 'Start Game', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#00ff00',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    startButton.on('pointerdown', () => {
      this.scene.start('StarshipScene');
    });
  }
}
