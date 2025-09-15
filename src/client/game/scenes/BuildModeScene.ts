import * as Phaser from 'phaser';
import { BuildModeManager } from '../entities/BuildModeManager';
import BuildModeService from '../services/BuildModeService';
import { SetupStep } from './buildMode/SetupStep';
import { DesignStep } from './buildMode/DesignStep';
import { TestStep } from './buildMode/TestStep';
import { PublishStep } from './buildMode/PublishStep';
import { LevelBrowser } from '../ui/LevelBrowser';

/**
 * Main scene for the Build Mode feature
 * This scene manages the workflow between different steps:
 * 1. Setup - Configure basic level properties
 * 2. Design - Place and configure entities
 * 3. Test - Playtest the level
 * 4. Publish - Finalize and publish the level
 */
export class BuildModeScene extends Phaser.Scene {
  // Service for data operations
  private buildModeService!: BuildModeService;

  // Manager for editor state
  private buildModeManager!: BuildModeManager;

  // Current step in the workflow
  private currentStep: string = 'setup';

  // Step scenes
  private setupStep?: SetupStep;
  private designStep?: DesignStep;
  private testStep?: TestStep;
  private publishStep?: PublishStep;
  private levelBrowser?: LevelBrowser;

  // Current level ID (if any)
  private currentLevelId?: string | undefined;

  // Header collapse state (start collapsed to maximize grid area)
  private headerCollapsed: boolean = true;

  constructor() {
    super({ key: 'BuildModeScene' });
  }

  init(data: { levelId?: string; action?: string }) {
    // Initialize services
    this.buildModeService = new BuildModeService();
    this.buildModeManager = new BuildModeManager(this);

    // Check if we're loading an existing level
    if (data.levelId) {
      this.currentLevelId = data.levelId;
    }

    // Handle startup action
    if (data.action === 'browse') {
      this.currentStep = 'browser';
    }

    console.log(
      `[BuildModeScene] Initialized with step: ${this.currentStep}, levelId: ${this.currentLevelId || 'none'}`
    );
  }

  create() {
    // Register key bindings (guard for strict null checks)
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', this.handleEscapeKey, this);
    }

    // Set up event handlers for step transitions
    this.events.on('step:change', this.changeStep, this);

    // Create placeholder textures for entities
    this.createPlaceholderTextures();

    // Initialize the current step
    this.activateCurrentStep();

    // Create common UI elements
    this.createCommonUI();
  }

  /**
   * Create placeholder textures for entities
   */
  private createPlaceholderTextures(): void {
    // Helper function to create texture
    const createTexture = (name: string, drawFunc: (g: Phaser.GameObjects.Graphics) => void) => {
      if (!this.textures.exists(name)) {
        const graphics = this.add.graphics();
        drawFunc(graphics);
        graphics.generateTexture(name, 32, 32);
        graphics.destroy();
      }
    };

    // Fighter (red triangle)
    createTexture('enemy_fighter', (g) => {
      g.fillStyle(0xff3333, 1);
      g.beginPath();
      g.moveTo(16, 0);
      g.lineTo(32, 32);
      g.lineTo(0, 32);
      g.closePath();
      g.fillPath();
    });

    // Scout (cyan diamond)
    createTexture('enemy_scout', (g) => {
      g.fillStyle(0x00ffff, 1);
      g.beginPath();
      g.moveTo(16, 0);
      g.lineTo(32, 16);
      g.lineTo(16, 32);
      g.lineTo(0, 16);
      g.closePath();
      g.fillPath();
    });

    // Cruiser (orange rectangle)
    createTexture('enemy_cruiser', (g) => {
      g.fillStyle(0xff6600, 1);
      g.fillRect(0, 0, 32, 32);
      g.lineStyle(2, 0xaa4400);
      g.strokeRect(4, 4, 24, 24);
    });

    // Seeker (red circle)
    createTexture('enemy_seeker', (g) => {
      g.fillStyle(0xff0000, 1);
      g.fillCircle(16, 16, 12);
      g.lineStyle(2, 0xffffff);
      g.strokeCircle(16, 16, 12);
    });

    // Gunship (purple square with guns)
    createTexture('enemy_gunship', (g) => {
      g.fillStyle(0x8800ff, 1);
      g.fillRect(2, 2, 28, 28);
      g.fillStyle(0x444444, 1);
      g.fillRect(10, 0, 2, 8);
      g.fillRect(20, 0, 2, 8);
    });

    // PowerUp (yellow star)
    createTexture('powerup', (g) => {
      g.fillStyle(0xffcc00, 1);
      const centerX = 16;
      const centerY = 16;
      const outerRadius = 16;
      const innerRadius = 8;
      const spikes = 5;

      let rot = (Math.PI / 2) * 3;
      let x = centerX;
      let y = centerY;
      const step = Math.PI / spikes;

      g.beginPath();
      g.moveTo(centerX, centerY - outerRadius);

      for (let i = 0; i < spikes; i++) {
        x = centerX + Math.cos(rot) * outerRadius;
        y = centerY + Math.sin(rot) * outerRadius;
        g.lineTo(x, y);
        rot += step;

        x = centerX + Math.cos(rot) * innerRadius;
        y = centerY + Math.sin(rot) * innerRadius;
        g.lineTo(x, y);
        rot += step;
      }

      g.lineTo(centerX, centerY - outerRadius);
      g.closePath();
      g.fillPath();
    });

    console.log('[BuildModeScene] Created placeholder textures for entities');
  }

  /**
   * Create UI elements common to all steps
   */
  private createCommonUI() {
    // Header with title - using gradient for visual enhancement
    const expandedHeaderHeight = 12;
    const initialHeaderHeight = this.headerCollapsed ? 0 : expandedHeaderHeight;
    const header = this.add.rectangle(0, 0, this.scale.width, initialHeaderHeight, 0x333333);
    header.setOrigin(0, 0);

    // Add subtle gradient to header
    const headerGradient = this.add.graphics();
    headerGradient.fillGradientStyle(0x444444, 0x444444, 0x222222, 0x222222, 1);
    headerGradient.fillRect(0, 0, this.scale.width, expandedHeaderHeight);

    const title = this.add.text(8, 1, 'Build Mode', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1,
    });

    // Simple subtle animation for the title
    this.tweens.add({
      targets: title,
      y: 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Help button
    const helpButton = this.add.text(this.scale.width - 48, 1, 'Help', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#666666',
      padding: { x: 10, y: 5 },
    });
    helpButton.setInteractive({ useHandCursor: true });
    helpButton.on('pointerdown', () => {
      this.showHelp();
    });

    // Persist header height for steps to use
    this.data.set('headerHeight', initialHeaderHeight);

    // Set initial visibility for collapsed state
    const visible = !this.headerCollapsed;
    header.setVisible(visible);
    headerGradient.setVisible(visible);
    title.setVisible(visible);
    helpButton.setVisible(visible);

    // Collapse/expand toggle
    const toggle = this.add.text(this.scale.width - 20, 1, this.headerCollapsed ? '▼' : '▲', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 4, y: 2 },
    });
    toggle.setInteractive({ useHandCursor: true });
    toggle.on('pointerdown', () => {
      this.headerCollapsed = !this.headerCollapsed;
      const newHeight = this.headerCollapsed ? 0 : expandedHeaderHeight;

      // Update visibility
      header.setVisible(!this.headerCollapsed);
      headerGradient.setVisible(!this.headerCollapsed);
      title.setVisible(!this.headerCollapsed);
      helpButton.setVisible(!this.headerCollapsed);
      toggle.setText(this.headerCollapsed ? '▼' : '▲');

      // Publish new height for steps
      this.data.set('headerHeight', newHeight);
      this.events.emit('ui:header:heightChanged', newHeight);
    });
  }

  /**
   * Change to a different step in the workflow
   * @param stepName The name of the step to change to
   * @param levelId Optional level ID to pass to the next step
   */
  changeStep(stepName: string, levelId?: string) {
    console.log(`[BuildModeScene] Changing step from ${this.currentStep} to ${stepName}`);

    // Deactivate current step
    this.deactivateCurrentStep();

    // Update current step
    this.currentStep = stepName;

    // Update current level ID if provided
    if (levelId) {
      this.currentLevelId = levelId;
    } else {
      // If no level ID is provided, get the current one from the manager
      this.currentLevelId = this.buildModeManager.getCurrentLevelId();
    }

    // Reset camera so previous step state (e.g., Design panning) doesn't leak
    this.resetCameraForStep(stepName);

    // Activate new step
    this.activateCurrentStep();
  }

  /**
   * Reset camera scroll, bounds, and zoom to safe defaults for the target step
   * Ensures scrolling in Design does not affect Setup/Test/Publish pages
   */
  private resetCameraForStep(stepName: string): void {
    const cam = this.cameras.main;
    // Stop any following behavior and normalize zoom
    cam.stopFollow();
    cam.setZoom(1);

    // Default: no panning for non-design steps; tight bounds to viewport
    if (stepName !== 'design') {
      cam.setBounds(0, 0, this.scale.width, this.scale.height);
      cam.setScroll(0, 0);
      return;
    }

    // For design, start neutral; DesignStep will configure its own world bounds
    cam.setBounds(0, 0, this.scale.width, this.scale.height);
    cam.setScroll(0, 0);
  }

  /**
   * Activate the current step
   */
  private activateCurrentStep() {
    switch (this.currentStep) {
      case 'setup':
        if (!this.setupStep) {
          this.setupStep = new SetupStep(this, this.buildModeManager, this.buildModeService);
        }
        this.setupStep.activate(this.currentLevelId);
        break;

      case 'design':
        if (!this.designStep) {
          this.designStep = new DesignStep(this, this.buildModeManager, this.buildModeService);
        }
        this.designStep.activate(this.currentLevelId);
        break;

      case 'test':
        if (!this.testStep) {
          this.testStep = new TestStep(this, this.buildModeManager, this.buildModeService);
        }
        this.testStep.activate(this.currentLevelId);
        break;

      case 'publish':
        if (!this.publishStep) {
          this.publishStep = new PublishStep(this, this.buildModeManager, this.buildModeService);
        }
        this.publishStep.activate(this.currentLevelId);
        break;

      case 'browser':
        if (!this.levelBrowser) {
          this.levelBrowser = new LevelBrowser(this, this.buildModeService);
        }
        this.levelBrowser.activate();
        break;

      default:
        console.error(`[BuildModeScene] Unknown step: ${this.currentStep}`);
        this.changeStep('setup');
        break;
    }
  }

  /**
   * Deactivate the current step
   */
  private deactivateCurrentStep() {
    switch (this.currentStep) {
      case 'setup':
        this.setupStep?.deactivate();
        break;

      case 'design':
        this.designStep?.deactivate();
        break;

      case 'test':
        this.testStep?.deactivate();
        break;

      case 'publish':
        this.publishStep?.deactivate();
        break;

      case 'browser':
        this.levelBrowser?.deactivate();
        break;

      default:
        console.error(`[BuildModeScene] Unknown step when deactivating: ${this.currentStep}`);
        break;
    }
  }

  /**
   * Handle ESC key press
   */
  private handleEscapeKey() {
    // Different behavior depending on current step
    switch (this.currentStep) {
      case 'setup':
        this.showExitConfirmation();
        break;

      case 'design':
        this.changeStep('setup');
        break;

      case 'test':
        this.changeStep('design');
        break;

      case 'publish':
        this.changeStep('design');
        break;

      case 'browser':
        this.showExitConfirmation();
        break;
    }
  }

  /**
   * Show exit confirmation dialog
   */
  private showExitConfirmation() {
    // In a real implementation, this would show a dialog
    // For now, just log and exit
    console.log('[BuildModeScene] Exit confirmation shown');
    this.scene.start('MainMenu');
  }

  /**
   * Show help dialog
   */
  private showHelp() {
    // In a real implementation, this would show context-sensitive help
    console.log(`[BuildModeScene] Showing help for step: ${this.currentStep}`);
  }

  override update(time: number, delta: number) {
    // Update the current step
    switch (this.currentStep) {
      case 'setup':
        this.setupStep?.update(time, delta);
        break;

      case 'design':
        this.designStep?.update(time, delta);
        break;

      case 'test':
        this.testStep?.update(time, delta);
        break;

      case 'publish':
        // Skip update call for PublishStep since it doesn't have an update method
        break;

      case 'browser':
        this.levelBrowser?.update(time, delta);
        break;
    }
  }
}
