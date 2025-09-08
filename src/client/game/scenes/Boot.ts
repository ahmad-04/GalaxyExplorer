import * as Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('stars', '/assets/stars.png');
    this.load.image('bg', '/assets/bg.png');
    this.load.image('ship', '/assets/ship.png');
    this.load.image('ShipClassic', '/assets/ShipClassic.png');
    this.load.image('glacticShipPrimary', '/assets/glacticShipPrimary.png');
    this.load.image('glacticShipSecondary', '/assets/glacticShipSecondary.png');
  }

  create() {
    console.log('[Boot] Scene create() called.');
    // The logic to load config from props is now handled in main.ts.
    // This scene now just needs to start the next one.
    this.scene.start('MainMenu');
  }
}
