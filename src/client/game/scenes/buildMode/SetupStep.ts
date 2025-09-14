import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { LevelSettings } from '../../../../shared/types/buildMode';

/**
 * Setup step: simple, readable layout with a template grid
 */
export class SetupStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;

  // Phaser UI
  private container!: Phaser.GameObjects.Container;
  private templateButtons: Phaser.GameObjects.Container[] = [];
  private templateGridContainer: Phaser.GameObjects.Container | undefined;
  private nextButtonText: Phaser.GameObjects.Text | undefined;
  private leftKeyHandler: ((ev: KeyboardEvent) => void) | undefined;
  private rightKeyHandler: ((ev: KeyboardEvent) => void) | undefined;

  // Removed level settings popup/form

  // State
  private selectedTemplate = 'empty';
  private levelId: string | undefined;
  private resizeHandler: (() => void) | undefined;
  private footerResizeHandler: (() => void) | undefined;

  private templates = [
    { id: 'empty', name: 'Empty Level', description: 'Start from scratch', icon: '🆕' },
    { id: 'basic', name: 'Basic Level', description: 'Simple essentials', icon: '🔰' },
    { id: 'asteroid', name: 'Asteroid Field', description: 'Dodge debris', icon: '🌑' },
    { id: 'boss', name: 'Boss Battle', description: 'One tough fight', icon: '👑' },
    { id: 'wave', name: 'Wave Attack', description: 'Endless waves', icon: '🌊' },
    { id: 'defense', name: 'Base Defense', description: 'Hold the line', icon: '🛡️' },
  ];

  private levelSettings: LevelSettings = {
    name: 'Untitled Level',
    author: 'Anonymous',
    difficulty: 1,
    backgroundSpeed: 1,
    backgroundTexture: 'stars',
    musicTrack: 'default',
    version: '1.0.0',
  };

  constructor(scene: Phaser.Scene, manager: BuildModeManager, service: BuildModeService) {
    this.scene = scene;
    this.manager = manager;
    this.service = service;
  }

  /** Activate the setup step UI */
  public activate(levelId?: string) {
    this.levelId = levelId;
    if (levelId) {
      const data = this.service.loadLevel(levelId);
      if (data && data.settings) {
        this.levelSettings = { ...this.levelSettings, ...data.settings };
      }
    }
    this.createUI();
  }

  /** Deactivate and cleanup */
  public deactivate() {
    // Cleanup resize handlers
    if (this.resizeHandler) {
      this.scene.scale.off('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    if (this.footerResizeHandler) {
      this.scene.scale.off('resize', this.footerResizeHandler);
      this.footerResizeHandler = undefined;
    }
    // Cleanup keyboard handlers
    if (this.leftKeyHandler) {
      // @ts-expect-error Phaser types
      this.scene.input.keyboard.off('keydown-LEFT', this.leftKeyHandler, this);
      this.leftKeyHandler = undefined;
    }
    if (this.rightKeyHandler) {
      // @ts-expect-error Phaser types
      this.scene.input.keyboard.off('keydown-RIGHT', this.rightKeyHandler, this);
      this.rightKeyHandler = undefined;
    }
    if (this.container) {
      this.container.destroy(true);
      // @ts-expect-error allow cleanup
      this.container = undefined;
    }
  }

  private createUI() {
    // Root container
    this.container = this.scene.add.container(0, 0);

    // Simple background under content (left canvas area only)
    const bg = this.scene.add.rectangle(
      0,
      60,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x1e1e2f
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);

    // Template grid
    this.buildTemplateGrid(84);

    // Footer navigation
    this.createNavigationButtons();

    // Resize: stretch bars and rebuild grid
    this.resizeHandler = () => {
      // Limit bg to canvas width (Phaser scale reflects canvas width)
      bg.width = this.scene.scale.width;
      bg.height = this.scene.scale.height - 60;

      // Rebuild template grid for new width
      if (this.templateGridContainer) {
        this.templateGridContainer.destroy(true);
        this.templateGridContainer = undefined;
      }
      this.templateButtons = [];
      this.buildTemplateGrid(84);
    };
    this.scene.scale.on('resize', this.resizeHandler);

    // Keyboard navigation for template selection
    this.leftKeyHandler = () => this.cycleTemplate(-1);
    this.rightKeyHandler = () => this.cycleTemplate(1);
    // @ts-expect-error Phaser types
    this.scene.input.keyboard.on('keydown-LEFT', this.leftKeyHandler, this);
    // @ts-expect-error Phaser types
    this.scene.input.keyboard.on('keydown-RIGHT', this.rightKeyHandler, this);
  }

  /**
   * Create simple template selection UI
   */
  private buildTemplateGrid(startY: number): void {
    const padding = 16;
    const cardW = 160;
    const cardH = 110;
    const gap = 14;
    const maxWidth = this.scene.scale.width - padding * 2;
    const perRow = Math.max(2, Math.floor((maxWidth + gap) / (cardW + gap)));
    const startX = padding;

    // Container to scope grid and allow simple rebuilds
    const grid = this.scene.add.container(0, 0);
    this.templateGridContainer = grid;
    this.container.add(grid);

    const title = this.scene.add.text(startX, startY - 22, 'Templates', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    grid.add(title);

    this.templates.forEach((tpl, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const c = this.scene.add.container(x, y);
      const bg = this.scene.add.rectangle(0, 0, cardW, cardH, 0x2a3240).setOrigin(0, 0);
      bg.setStrokeStyle(this.selectedTemplate === tpl.id ? 2 : 1, 0x3a4154);
      if (this.selectedTemplate === tpl.id) bg.fillColor = 0x2a3a4a;
      bg.setInteractive({ useHandCursor: true });

      const icon = this.scene.add.text(cardW / 2, 30, tpl.icon || '🚀', { fontSize: '24px' });
      icon.setOrigin(0.5);
      const name = this.scene.add.text(cardW / 2, 60, tpl.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      });
      name.setOrigin(0.5);
      const desc = this.scene.add.text(cardW / 2, 86, tpl.description, {
        fontSize: '11px',
        color: '#b8c0cc',
        fontFamily: 'Arial',
        wordWrap: { width: cardW - 12 },
        align: 'center',
      });
      desc.setOrigin(0.5);

      c.add([bg, icon, name, desc]);
      bg.on('pointerdown', () => this.selectTemplate(tpl.id));
      bg.on('pointerover', () => {
        if (this.selectedTemplate !== tpl.id) bg.fillColor = 0x334155;
      });
      bg.on('pointerout', () => {
        if (this.selectedTemplate !== tpl.id) bg.fillColor = 0x2a3240;
      });

      this.templateButtons.push(c);
      grid.add(c);
    });
  }

  // Removed form mounting and inputs

  /**
   * Create simple navigation buttons
   */
  private createNavigationButtons() {
    // Create a simple footer bar
    const footerBar = this.scene.add.rectangle(
      0,
      this.scene.scale.height - 80,
      this.scene.scale.width,
      80,
      0x1a1e2c
    );
    footerBar.setOrigin(0, 0);
    this.container.add(footerBar);

    // Add a separator line
    const footerLine = this.scene.add.graphics();
    footerLine.lineStyle(1, 0x3a4154);
    footerLine.lineBetween(
      0,
      this.scene.scale.height - 80,
      this.scene.scale.width,
      this.scene.scale.height - 80
    );
    this.container.add(footerLine);

    // Back button - simple rectangle
    const backButton = this.scene.add.container(30, this.scene.scale.height - 50);
    const backBg = this.scene.add.rectangle(0, 0, 150, 40, 0x3a3a5a);
    backBg.setOrigin(0, 0.5);
    backBg.setStrokeStyle(1, 0x555555);
    backBg.setInteractive();

    const backText = this.scene.add.text(75, 0, 'Back to Menu', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    backText.setOrigin(0.5);

    backButton.add([backBg, backText]);

    // Simple hover effect
    backBg.on('pointerover', () => (backBg.fillColor = 0x4a4a6a));
    backBg.on('pointerout', () => (backBg.fillColor = 0x3a3a5a));
    backBg.on('pointerdown', () => this.scene.scene.start('MainMenu'));

    this.container.add(backButton);

    // Next button - green to indicate progress
    const nextButton = this.scene.add.container(
      this.scene.scale.width - 180,
      this.scene.scale.height - 50
    );

    const nextBg = this.scene.add.rectangle(0, 0, 150, 40, 0x2ecc71);
    nextBg.setOrigin(0, 0.5);
    nextBg.setStrokeStyle(1, 0x3ee884);
    nextBg.setInteractive();

    const nextText = this.scene.add.text(75, 0, 'Next: Design', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    nextText.setOrigin(0.5);
    this.nextButtonText = nextText;
    const currentTpl = this.templates.find((t) => t.id === this.selectedTemplate);
    if (currentTpl) this.nextButtonText.setText(`Next: Design (${currentTpl.name})`);

    nextButton.add([nextBg, nextText]);

    // Simple hover effect
    nextBg.on('pointerover', () => (nextBg.fillColor = 0x3ee884));
    nextBg.on('pointerout', () => (nextBg.fillColor = 0x2ecc71));
    nextBg.on('pointerdown', () => this.proceedToDesign());

    this.container.add(nextButton);

    // Update positions on resize
    this.footerResizeHandler = () => {
      footerBar.width = this.scene.scale.width;
      footerBar.y = this.scene.scale.height - 80;

      footerLine.clear();
      footerLine.lineStyle(1, 0x3a4154);
      footerLine.lineBetween(
        0,
        this.scene.scale.height - 80,
        this.scene.scale.width,
        this.scene.scale.height - 80
      );

      backButton.y = this.scene.scale.height - 50;
      nextButton.x = this.scene.scale.width - 180;
      nextButton.y = this.scene.scale.height - 50;
    };
    this.scene.scale.on('resize', this.footerResizeHandler);
  }

  // Removed legacy scroll logic to simplify layout

  /**
   * Select a template
   * @param templateId The ID of the template to select
   */
  private selectTemplate(templateId: string) {
    console.log(`[SetupStep] Selected template: ${templateId}`);

    // Update selected template
    this.selectedTemplate = templateId;

    // Update UI to show selection - simplified version
    this.templates.forEach((template, index) => {
      const container = this.templateButtons[index];

      if (container && container.list.length > 0) {
        const bg = container.list[0] as Phaser.GameObjects.Rectangle;

        if (template.id === templateId) {
          // Selected template styling
          bg.setStrokeStyle(2, 0x4a90e2);
          bg.fillColor = 0x2a3a4a;
          this.scene.tweens.add({ targets: container, scale: 1.06, duration: 120 });
        } else {
          // Non-selected template styling
          bg.setStrokeStyle(1, 0x3a4154);
          bg.fillColor = 0x2a3240;
          container.setScale(1.0);
        }
      }
    });

    // Update Next button text with current selection name
    const tpl = this.templates.find((t) => t.id === templateId);
    if (this.nextButtonText && tpl) {
      this.nextButtonText.setText(`Next: Design (${tpl.name})`);
    }
  }

  /**
   * Cycle template selection with keyboard arrows
   */
  private cycleTemplate(direction: -1 | 1) {
    const idx = this.templates.findIndex((t) => t.id === this.selectedTemplate);
    if (idx === -1) return;
    const nextIdx = (idx + direction + this.templates.length) % this.templates.length;
    const nextTpl = this.templates[nextIdx];
    if (nextTpl) this.selectTemplate(nextTpl.id);
  }

  /**
   * Proceed to the design step
   */
  private proceedToDesign() {
    console.log('[SetupStep] Proceeding to design with settings:', this.levelSettings);

    // Create or update level
    let levelData;
    if (this.levelId) {
      // Load existing level and update settings
      levelData = this.service.loadLevel(this.levelId);
      if (levelData) {
        levelData.settings = this.levelSettings;
      } else {
        // Fallback if level can't be loaded
        levelData = this.service.createLevelFromTemplate(this.selectedTemplate, this.levelSettings);
      }
    } else {
      // Create new level from template
      levelData = this.service.createLevelFromTemplate(this.selectedTemplate, this.levelSettings);
    }

    // Save level
    const levelId = this.service.saveLevel(levelData);

    // Update manager with current level ID
    this.manager.setCurrentLevelId(levelId);

    // Transition to design step
    this.scene.events.emit('step:change', 'design');
  }

  /**
   * Update method called every frame
   * @param _time Current time
   * @param _delta Time since last frame
   */
  update(_time: number, _delta: number) {
    // No continuous updates needed for this step
  }
}
