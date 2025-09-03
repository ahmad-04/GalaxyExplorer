import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    console.log('Boot scene starting StarshipScene');
    this.scene.start('StarshipScene');
  }
}
