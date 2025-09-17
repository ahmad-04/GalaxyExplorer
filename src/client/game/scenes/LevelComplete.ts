import { Scene } from 'phaser';
import * as Phaser from 'phaser';

type LevelCompleteData = {
  score: number;
  durationMs?: number;
  levelName?: string;
  enemiesDefeated?: number;
  enemiesExpected?: number;
};

export class LevelComplete extends Scene {
  private score = 0;
  private durationMs: number | undefined;
  private levelName: string | undefined;
  private enemiesDefeated: number | undefined;
  private enemiesExpected: number | undefined;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private panelY = 0;
  private panelHeight = 380;
  private stars: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('LevelComplete');
  }

  init(data: LevelCompleteData) {
    this.score = data?.score ?? 0;
    this.durationMs = data?.durationMs;
    this.levelName = data?.levelName;
    this.enemiesDefeated = data?.enemiesDefeated;
    this.enemiesExpected = data?.enemiesExpected;
    console.log('[LevelComplete] init:', data);
  }

  create() {
    // Ensure keyboard focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x001a33, 0x001133, 0x000d26, 0x000a1f, 1, 1, 1, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Stars (store for gentle drift in update)
    this.stars = [];
    for (let i = 0; i < 140; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.FloatBetween(0.6, 2.2),
        0xffffff,
        Phaser.Math.FloatBetween(0.25, 0.9)
      ) as Phaser.GameObjects.Arc;
      if (Math.random() > 0.6) {
        this.tweens.add({ targets: s, alpha: 0.2, yoyo: true, repeat: -1, duration: 1800 });
      }
      this.stars.push(s);
    }

    // Panel
    const panelWidth = Math.min(600, this.scale.width * 0.9);
    this.panelHeight = 380;
    this.panelY = this.scale.height / 2 - 180;
    const panel = this.add.graphics();
    panel.fillStyle(0x0f2340, 0.7);
    panel.lineStyle(3, 0x4caf50, 0.5);
    panel.fillRoundedRect(
      this.scale.width / 2 - panelWidth / 2,
      this.panelY,
      panelWidth,
      this.panelHeight,
      16
    );
    panel.strokeRoundedRect(
      this.scale.width / 2 - panelWidth / 2,
      this.panelY,
      panelWidth,
      this.panelHeight,
      16
    );

    // Title
    const title = this.add
      .text(this.scale.width / 2, this.panelY + 40, 'Level Complete!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '52px',
        color: '#ffffff',
        stroke: '#0b2e13',
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 2, color: '#001a0a', blur: 8, fill: true },
      })
      .setOrigin(0.5)
      .setScale(0.85)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 700, ease: 'Back.out' });

    // Shine sweep across title
    this.time.delayedCall(700, () => {
      const shine = this.add.rectangle(-100, title.y, 60, 70, 0xffffff, 0.18);
      shine.setAngle(20);
      this.tweens.add({
        targets: shine,
        x: this.scale.width + 100,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => shine.destroy(),
      });
    });

    // Subtitle (level name)
    if (this.levelName) {
      this.add
        .text(this.scale.width / 2, this.panelY + 90, this.levelName, {
          fontSize: '22px',
          color: '#a6d8a8',
        })
        .setOrigin(0.5);
    }

    // Score
    const scoreText = this.add
      .text(this.scale.width / 2, this.panelY + 140, `Score: ${this.score}`, {
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#08200d',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: scoreText, alpha: 1, duration: 500, delay: 200 });

    // Duration
    if (this.durationMs !== undefined) {
      const secs = Math.max(0, Math.round(this.durationMs / 1000));
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      this.add
        .text(this.scale.width / 2, this.panelY + 180, `Time: ${mm}:${ss}`, {
          fontSize: '22px',
          color: '#cfead1',
        })
        .setOrigin(0.5);
    }

    // Enemies stats
    if (this.enemiesDefeated !== undefined && this.enemiesExpected !== undefined) {
      this.add
        .text(
          this.scale.width / 2,
          this.panelY + 210,
          `Enemies: ${this.enemiesDefeated} / ${this.enemiesExpected}`,
          { fontSize: '20px', color: '#b8e0ba' }
        )
        .setOrigin(0.5);
    }

    // Buttons
    const buttonY = this.panelY + this.panelHeight - 100;
    const replayBg = this.add.graphics();
    replayBg.fillGradientStyle(0x1b5e20, 0x1b5e20, 0x104d15, 0x104d15, 1, 1, 1, 1);
    replayBg.lineStyle(2, 0x4caf50, 0.6);
    replayBg.fillRoundedRect(this.scale.width / 2 - 90, buttonY - 18, 180, 40, 10);
    replayBg.strokeRoundedRect(this.scale.width / 2 - 90, buttonY - 18, 180, 40, 10);

    const replayBtn = this.add
      .text(this.scale.width / 2, buttonY, 'Play Again', {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#08200d',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const menuBg = this.add.graphics();
    menuBg.fillGradientStyle(0x113388, 0x113388, 0x112266, 0x112266, 1, 1, 1, 1);
    menuBg.lineStyle(2, 0x4477ff, 0.5);
    menuBg.fillRoundedRect(this.scale.width / 2 - 90, buttonY + 42 - 18, 180, 40, 10);
    menuBg.strokeRoundedRect(this.scale.width / 2 - 90, buttonY + 42 - 18, 180, 40, 10);

    const menuBtn = this.add
      .text(this.scale.width / 2, buttonY + 42, 'Main Menu', {
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#001133',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => this.replay());
    menuBtn.on('pointerdown', () => this.toMenu());

    // Hover effects
    replayBtn
      .on('pointerover', () => replayBtn.setScale(1.08))
      .on('pointerout', () => replayBtn.setScale(1))
      .on('pointerdown', () => replayBtn.setScale(0.96));
    menuBtn
      .on('pointerover', () => menuBtn.setScale(1.08))
      .on('pointerout', () => menuBtn.setScale(1))
      .on('pointerdown', () => menuBtn.setScale(0.96));

    // Instruction hint
    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x001a33, 0.4);
    hintBg.lineStyle(1, 0x4caf50, 0.5);
    hintBg.fillRoundedRect(
      this.scale.width / 2 - 160,
      this.panelY + this.panelHeight + 12,
      320,
      34,
      10
    );
    hintBg.strokeRoundedRect(
      this.scale.width / 2 - 160,
      this.panelY + this.panelHeight + 12,
      320,
      34,
      10
    );
    const hint = this.add
      .text(
        this.scale.width / 2,
        this.panelY + this.panelHeight + 29,
        'Press SPACE to play again',
        {
          fontSize: '18px',
          color: '#ffffff',
        }
      )
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.7, yoyo: true, repeat: -1, duration: 900 });

    // Confetti burst using particle texture (create fallback if missing)
    if (!this.textures.exists('particle')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture('particle', 16, 16);
      g.destroy();
    }
    const colors = [0x4caf50, 0x8bc34a, 0xffffff, 0x81c784, 0xa5d6a7];
    const emitter = this.add.particles(this.scale.width / 2, this.panelY + 20, 'particle', {
      angle: { min: 200, max: 340 },
      speed: { min: 120, max: 240 },
      gravityY: 200,
      lifespan: 1200,
      scale: { start: 0.5, end: 0 },
      quantity: 150,
      frequency: -1,
      tint: colors,
      emitting: true,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.time.delayedCall(1400, () => emitter.destroy());
  }

  override update() {
    // Gentle star drift
    for (const s of this.stars) {
      s.y += 0.03;
      if (s.y > this.scale.height) s.y = 0;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.replay();
    }
  }

  private replay() {
    // Stop any running game scene, then start appropriate scene
    if (this.scene.get('StarshipScene')) this.scene.stop('StarshipScene');
    const last = this.registry.get('lastRunMode');
    this.scene.start(last === 'custom' ? 'CustomLevelScene' : 'EndlessScene');
  }

  private toMenu() {
    if (this.scene.get('StarshipScene')) this.scene.stop('StarshipScene');
    this.scene.start('MainMenu');
  }
}
