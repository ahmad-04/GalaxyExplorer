import * as Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load only a minimal set; scenes create fallbacks if missing
    this.load.image('ship', '/assets/ship.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');
    this.load.audio('boom', '/assets/Boom.wav');
  }

  create() {
    console.log('[Boot] Scene create() called.');
    // The logic to load config from props is now handled in main.ts.
    // Start the loading scene first for smooth UX.
    this.scene.start('LoadingScene');
  }
}
