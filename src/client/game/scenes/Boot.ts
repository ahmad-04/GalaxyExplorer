import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    console.log('Boot scene starting');
    this.scene.start('StarshipScene'); // Changed this to directly start StarshipScene
  }
}
