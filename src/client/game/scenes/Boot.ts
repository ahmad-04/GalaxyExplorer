import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Preload assets for the main menu
    this.load.image('stars', '/assets/stars.png');
  }

  create() {
    console.log('Boot scene starting MainMenu');
    this.scene.start('MainMenu');
  }
}
