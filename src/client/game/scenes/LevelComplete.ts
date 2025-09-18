import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { createPanel, createButton, titleText, bodyText } from '../ui/UiKit';
import { BackgroundManager } from '../services/BackgroundManager';

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
  private starfield!: Phaser.GameObjects.TileSprite;

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

    // Background: shared starfield
    const starsKey = BackgroundManager.ensureStars(this);
    this.starfield = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, starsKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    // Panel
    const panelWidth = Math.min(600, this.scale.width * 0.9);
    this.panelHeight = 380;
    this.panelY = this.scale.height / 2 - 180;
    createPanel(
      this,
      this.scale.width / 2 - panelWidth / 2,
      this.panelY,
      panelWidth,
      this.panelHeight
    );

    // Title
    titleText(this, this.scale.width / 2, this.panelY + 40, 'Level Complete!')
      .setScale(0.85)
      .setAlpha(0);

    // Shine sweep removed

    // Subtitle (level name)
    if (this.levelName) {
      bodyText(this, this.scale.width / 2, this.panelY + 90, this.levelName, 22);
    }

    // Score
    const scoreText = bodyText(
      this,
      this.scale.width / 2,
      this.panelY + 140,
      `Score: ${this.score}`,
      28
    ).setAlpha(0);
    this.tweens.add({ targets: scoreText, alpha: 1, duration: 500, delay: 200 });

    // Duration
    if (this.durationMs !== undefined) {
      const secs = Math.max(0, Math.round(this.durationMs / 1000));
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      bodyText(this, this.scale.width / 2, this.panelY + 180, `Time: ${mm}:${ss}`, 22);
    }

    // Enemies stats
    if (this.enemiesDefeated !== undefined && this.enemiesExpected !== undefined) {
      bodyText(
        this,
        this.scale.width / 2,
        this.panelY + 210,
        `Enemies: ${this.enemiesDefeated} / ${this.enemiesExpected}`,
        20
      );
    }

    // Buttons
    const buttonY = this.panelY + this.panelHeight - 100;
    const replay = createButton(this, this.scale.width / 2, buttonY, 'Play Again');
    const menu = createButton(this, this.scale.width / 2, buttonY + 48, 'Main Menu');
    let clicked = false;
    const guard = (fn: () => void) => {
      if (clicked) return;
      clicked = true;
      fn();
    };
    replay.container.once('pointerdown', () => guard(() => this.replay()));
    menu.container.once('pointerdown', () => guard(() => this.toMenu()));

    // Instruction hint
    const hintPanelY = this.panelY + this.panelHeight + 12;
    createPanel(this, this.scale.width / 2 - 160, hintPanelY, 320, 34, { fillAlpha: 0.4 });
    const hint = bodyText(
      this,
      this.scale.width / 2,
      hintPanelY + 17,
      'Press SPACE to play again',
      18
    );
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
    // Gentle starfield scroll
    if (this.starfield) {
      this.starfield.tilePositionY += 0.15;
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
