import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { LevelSettings } from '../../../../shared/types/buildMode';

/**
 * Setup step: simple, readable layout with a template grid and a fixed HTML form
 */
export class SetupStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;

  // Phaser UI
  private container!: Phaser.GameObjects.Container;
  private templateButtons: Phaser.GameObjects.Container[] = [];

  // HTML form (Phaser DOMElement)
  private formDom: Phaser.GameObjects.DOMElement | undefined;
  private nameInput!: HTMLInputElement;
  private descriptionInput!: HTMLTextAreaElement;
  private difficultySlider!: HTMLInputElement;

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
    const realign = this.container?.getData('formRealign') as (() => void) | undefined;
    if (realign) {
      this.scene.scale.off('resize', realign);
      window.removeEventListener('resize', realign as EventListener);
    }
    if (this.resizeHandler) {
      this.scene.scale.off('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    if (this.footerResizeHandler) {
      this.scene.scale.off('resize', this.footerResizeHandler);
      this.footerResizeHandler = undefined;
    }
    this.removeInputElements();
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
    const rows = this.createTemplateGrid(84);

    // DOM form as a Phaser DOMElement inside the container
    this.mountDomForm(rows, 84);

    // Footer navigation
    this.createNavigationButtons();

    // Resize: stretch bars and realign wrapper + rebuild grid
    this.resizeHandler = () => {
      // Limit bg to canvas width (Phaser scale reflects canvas width)
      bg.width = this.scene.scale.width;
      bg.height = this.scene.scale.height - 60;

      // Realign DOM form to new canvas size
      const realign = this.container.getData('formRealign') as (() => void) | undefined;
      if (realign) realign();

      // Rebuild template grid for new width
      this.templateButtons.forEach((c) => c.destroy());
      this.templateButtons = [];
      this.createTemplateGrid(84);
    };
    this.scene.scale.on('resize', this.resizeHandler);
  }

  /**
   * Create simple template selection UI
   */
  private createTemplateGrid(startY: number): number {
    const padding = 16;
    const cardW = 160;
    const cardH = 110;
    const gap = 14;
    const maxWidth = this.scene.scale.width - padding * 2;
    const perRow = Math.max(2, Math.floor((maxWidth + gap) / (cardW + gap)));
    const startX = padding;

    const title = this.scene.add.text(startX, startY - 22, 'Templates', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.container.add(title);

    this.templates.forEach((tpl, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const c = this.scene.add.container(x, y);
      const bg = this.scene.add.rectangle(0, 0, cardW, cardH, 0x2a3240).setOrigin(0, 0);
      bg.setStrokeStyle(this.selectedTemplate === tpl.id ? 2 : 1, 0x3a4154);
      if (this.selectedTemplate === tpl.id) bg.fillColor = 0x2a3a4a;
      bg.setInteractive();

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

      this.templateButtons.push(c);
      this.container.add(c);
    });
    // Return number of rows to help position the form beneath the grid
    const rows = Math.ceil(this.templates.length / perRow);
    return rows;
  }

  private mountDomForm(gridRows: number, gridStartY: number) {
    // Remove old DOMElement if exists
    if (this.formDom) {
      this.formDom.destroy();
      this.formDom = undefined;
    }

    const html = `
      <div id="build-mode-form-container" style="width:100%;max-width:520px;padding:16px;background:rgba(18,20,25,0.95);border:1px solid #2f3646;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.35)">
        <div class="build-below-header" style="margin-bottom:10px">Level Settings</div>
        <label class="build-mode-label">Level Name</label>
        <input id="bm-name" class="build-mode-input" type="text" placeholder="Enter a level name" />
        <label class="build-mode-label" style="margin-top:12px">Description</label>
        <textarea id="bm-desc" class="build-mode-input build-mode-textarea" placeholder="Describe your level"></textarea>
        <label class="build-mode-label" style="margin-top:12px">Difficulty <span id="bm-diff-val" class="bm-pill" style="margin-left:8px">1</span></label>
        <input id="bm-diff" class="build-mode-slider" type="range" min="1" max="10" />
      </div>`;

    // Compute target position under the grid
    const padding = 16;
    const cardH = 110;
    const gap = 14;
    const gridHeight = gridStartY + gridRows * (cardH + gap) + 16;

    // Create DOMElement
    const dom = this.scene.add.dom(padding, gridHeight).createFromHTML(html);
    dom.setOrigin(0, 0);
    this.container.add(dom);
    this.formDom = dom;

    const root = dom.node as HTMLElement;
    this.nameInput = root.querySelector('#bm-name') as HTMLInputElement;
    this.descriptionInput = root.querySelector('#bm-desc') as HTMLTextAreaElement;
    this.difficultySlider = root.querySelector('#bm-diff') as HTMLInputElement;
    const diffVal = root.querySelector('#bm-diff-val') as HTMLSpanElement;

    this.nameInput.value = this.levelSettings.name || '';
    this.descriptionInput.value = this.levelSettings.description || '';
    this.difficultySlider.value = String(this.levelSettings.difficulty ?? 1);
    diffVal.textContent = this.difficultySlider.value;

    const setDiffColor = (n: number) => {
      if (n <= 3) diffVal.style.color = '#4aff4a';
      else if (n <= 7) diffVal.style.color = '#ffff4a';
      else diffVal.style.color = '#ff4a4a';
    };
    setDiffColor(parseInt(this.difficultySlider.value));
    this.difficultySlider.addEventListener('input', () => {
      const n = parseInt(this.difficultySlider.value);
      diffVal.textContent = String(n);
      setDiffColor(n);
    });

    // Position relative to canvas and template grid height
    const realign = () => {
      const maxW = Math.min(520, Math.max(280, this.scene.scale.width - padding * 2));
      dom.setPosition(padding, gridStartY + gridRows * (cardH + gap) + 16);
      (root.firstElementChild as HTMLElement).style.maxWidth = `${maxW}px`;
      (root.firstElementChild as HTMLElement).style.width = `${maxW}px`;
    };
    realign();
    this.container.setData('formRealign', realign);
    this.scene.scale.on('resize', realign);
    // No window listener needed; Phaser scale handles canvas changes
  }

  /**
   * Create HTML input elements for the form
   */
  private removeInputElements() {
    if (this.formDom) {
      this.formDom.destroy();
      this.formDom = undefined;
    }
  }

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
          container.setScale(1.05);
        } else {
          // Non-selected template styling
          bg.setStrokeStyle(1, 0x3a4154);
          bg.fillColor = 0x2a3240;
          container.setScale(1.0);
        }
      }
    });
  }

  /**
   * Proceed to the design step
   */
  private proceedToDesign() {
    // Update level settings from form
    this.levelSettings.name = this.nameInput.value;
    this.levelSettings.description = this.descriptionInput.value;
    this.levelSettings.difficulty = parseInt(this.difficultySlider.value);

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
