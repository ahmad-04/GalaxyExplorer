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
  private currentLevelId?: string;
  
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
    
    console.log(`[BuildModeScene] Initialized with step: ${this.currentStep}, levelId: ${this.currentLevelId || 'none'}`);
  }

  create() {
    // Register key bindings
    this.input.keyboard.on('keydown-ESC', this.handleEscapeKey, this);
    
    // Set up event handlers for step transitions
    this.events.on('step:change', this.changeStep, this);
    
    // Initialize the current step
    this.activateCurrentStep();
    
    // Create common UI elements
    this.createCommonUI();
  }
  
  /**
   * Create UI elements common to all steps
   */
  private createCommonUI() {
    // Header with title
    const header = this.add.rectangle(0, 0, this.scale.width, 60, 0x333333);
    header.setOrigin(0, 0);
    
    const title = this.add.text(20, 20, 'Galaxy Explorer Build Mode', { 
      fontSize: '24px', 
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    // Help button
    const helpButton = this.add.text(this.scale.width - 80, 20, 'Help', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#666666',
      padding: { x: 10, y: 5 }
    });
    helpButton.setInteractive({ useHandCursor: true });
    helpButton.on('pointerdown', () => {
      this.showHelp();
    });
  }
  
  /**
   * Change to a different step in the workflow
   * @param stepName The name of the step to change to
   */
  changeStep(stepName: string) {
    console.log(`[BuildModeScene] Changing step from ${this.currentStep} to ${stepName}`);
    
    // Deactivate current step
    this.deactivateCurrentStep();
    
    // Update current step
    this.currentStep = stepName;
    
    // Activate new step
    this.activateCurrentStep();
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
  
  update(time: number, delta: number) {
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
        this.publishStep?.update(time, delta);
        break;
        
      case 'browser':
        this.levelBrowser?.update(time, delta);
        break;
    }
  }
}
