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
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('enemy', 'assets/enemy.png');
    // Attempt to load per-type enemy icons used in gameplay/editor
    this.load.image('enemy_scout', 'assets/enemy_scout.png');
    this.load.image('enemy_cruiser', 'assets/enemy_cruiser.png');
    this.load.image('enemy_seeker', 'assets/enemy_seeker.png');
    this.load.image('enemy_gunship', 'assets/enemy_gunship.png');
    this.load.image('powerup_score', 'assets/powerup-score.png');
    this.load.image('powerup_shield', 'assets/shield.png');
    this.load.image('shield', 'assets/shield.png');
    this.load.audio('boom', 'assets/Boom.wav');
  }

  create() {
    console.log('[Boot] Scene create() called.');
    // The logic to load config from props is now handled in main.ts.
    // Start the loading scene first for smooth UX.
    this.scene.start('LoadingScene');
  }
}
