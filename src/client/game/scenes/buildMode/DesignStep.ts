/**
 * DesignStep.ts
 * Second step in the Build Mode workflow
 * Handles placing and editing entities in the level
 */

import * as Phaser from 'phaser';
import { BuildModeManager, BuildModeTool } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { BaseEntity, EntityType, Position } from '../../../../shared/types/buildMode';

/**
 * Design step in the Build Mode workflow
 * Provides UI for placing, editing, and arranging entities in the level
 */
export class DesignStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;
  
  // UI elements
  private container!: Phaser.GameObjects.Container;
  private toolbarContainer!: Phaser.GameObjects.Container;
  private entityPaletteContainer!: Phaser.GameObjects.Container;
  private propertiesContainer!: Phaser.GameObjects.Container;
  
  // Grid and camera
  private grid!: Phaser.GameObjects.Grid;
  private cameraControls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  
  // Entity management
  private entities: Phaser.GameObjects.Container[] = [];
  private selectedEntity?: Phaser.GameObjects.Container;
  
  // Level ID
  private levelId?: string;
  
  constructor(scene: Phaser.Scene, manager: BuildModeManager, service: BuildModeService) {
    this.scene = scene;
    this.manager = manager;
    this.service = service;
  }
  
  /**
   * Activate this step
   * @param levelId Optional level ID to load
   */
  activate(levelId?: string): void {
    console.log(`[DesignStep] Activating with levelId: ${levelId || 'none'}`);
    this.levelId = levelId;
    
    // Create the UI
    this.createUI();
    
    // Set up camera controls
    this.setupCameraControls();
    
    // Load existing level data if available
    if (levelId) {
      this.loadLevel(levelId);
    }
    
    // Set up events
    this.setupEvents();
  }
  
  /**
   * Deactivate this step
   */
  deactivate(): void {
    console.log('[DesignStep] Deactivating');
    
    // Clean up UI
    if (this.container) {
      this.container.destroy();
    }
    
    // Clean up camera controls
    if (this.cameraControls) {
      this.cameraControls.destroy();
    }
    
    // Clean up events
    this.cleanupEvents();
  }
  
  /**
   * Create the UI for this step
   */
  private createUI(): void {
    // Main container
    this.container = this.scene.add.container(0, 60);
    
    // Background
    const bg = this.scene.add.rectangle(
      0, 0,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x222222
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);
    
    // Create grid
    this.createGrid();
    
    // Create toolbar
    this.createToolbar();
    
    // Create entity palette
    this.createEntityPalette();
    
    // Create properties panel
    this.createPropertiesPanel();
    
    // Add step navigation buttons
    this.createStepNavigation();
  }
  
  /**
   * Set up camera controls
   */
  private setupCameraControls(): void {
    // Create camera control configuration
    const controlConfig = {
      camera: this.scene.cameras.main,
      left: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      zoomIn: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 0.06,
      drag: 0.003,
      maxSpeed: 1.0
    };
    
    // Create camera controls
    this.cameraControls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);
    
    // Enable zoom with mouse wheel
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
      const camera = this.scene.cameras.main;
      const zoom = camera.zoom;
      
      // Adjust zoom based on wheel direction
      if (deltaY > 0) {
        camera.setZoom(Math.max(0.5, zoom - 0.1));
      } else {
        camera.setZoom(Math.min(2, zoom + 0.1));
      }
    });
  }
  
  /**
   * Create the grid for entity placement
   */
  private createGrid(): void {
    // To be implemented - create a grid overlay for the level
  }
  
  /**
   * Create the toolbar with editing tools
   */
  private createToolbar(): void {
    // Create toolbar container
    this.toolbarContainer = this.scene.add.container(10, 10);
    this.container.add(this.toolbarContainer);
    
    // Create toolbar background
    const toolbarBg = this.scene.add.rectangle(
      0, 0,
      50, 300,
      0x333333
    );
    toolbarBg.setOrigin(0, 0);
    toolbarBg.setStrokeStyle(1, 0x555555);
    this.toolbarContainer.add(toolbarBg);
    
    // Create tool buttons
    const tools = [
      { tool: BuildModeTool.SELECT, icon: '👆', label: 'Select' },
      { tool: BuildModeTool.PLACE, icon: '➕', label: 'Place' },
      { tool: BuildModeTool.MOVE, icon: '✋', label: 'Move' },
      { tool: BuildModeTool.ROTATE, icon: '🔄', label: 'Rotate' },
      { tool: BuildModeTool.DELETE, icon: '❌', label: 'Delete' },
      { tool: BuildModeTool.PAN, icon: '👁️', label: 'Pan' }
    ];
    
    tools.forEach((toolInfo, index) => {
      const y = 20 + index * 50;
      
      // Tool button
      const toolButton = this.scene.add.text(
        25, y,
        toolInfo.icon,
        {
          fontSize: '20px',
          color: '#ffffff',
        }
      ).setOrigin(0.5);
      
      // Make button interactive
      toolButton.setInteractive({ useHandCursor: true });
      
      // Add hover effects
      toolButton.on('pointerover', () => {
        toolButton.setTint(0x00ffff);
        
        // Show tooltip
        const tooltip = this.scene.add.text(
          60, y,
          toolInfo.label,
          {
            fontSize: '14px',
            backgroundColor: '#444444',
            padding: { x: 5, y: 3 },
            color: '#ffffff'
          }
        ).setOrigin(0, 0.5);
        
        toolButton.setData('tooltip', tooltip);
      });
      
      toolButton.on('pointerout', () => {
        toolButton.clearTint();
        
        // Remove tooltip
        const tooltip = toolButton.getData('tooltip');
        if (tooltip) {
          tooltip.destroy();
        }
      });
      
      // Set tool on click
      toolButton.on('pointerdown', () => {
        this.manager.setCurrentTool(toolInfo.tool);
      });
      
      this.toolbarContainer.add(toolButton);
    });
  }
  
  /**
   * Create the entity palette for selecting entities to place
   */
  private createEntityPalette(): void {
    // To be implemented - create a palette of available entities
  }
  
  /**
   * Create the properties panel for editing entity properties
   */
  private createPropertiesPanel(): void {
    // To be implemented - create a panel for editing entity properties
  }
  
  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Back button (to Setup step)
    const backButton = this.scene.add.text(
      this.scene.scale.width - 200, 
      this.scene.scale.height - 40,
      '< Back to Setup',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    backButton.setInteractive({ useHandCursor: true });
    
    // Navigate to Setup step
    backButton.on('pointerdown', () => {
      // Save current progress
      this.saveProgress();
      
      // Change to Setup step
      this.scene.events.emit('step:change', 'setup', this.levelId);
    });
    
    // Next button (to Test step)
    const nextButton = this.scene.add.text(
      this.scene.scale.width - 80, 
      this.scene.scale.height - 40,
      'Test Level >',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    nextButton.setInteractive({ useHandCursor: true });
    
    // Navigate to Test step
    nextButton.on('pointerdown', () => {
      // Save current progress
      this.saveProgress();
      
      // Change to Test step
      this.scene.events.emit('step:change', 'test', this.levelId);
    });
    
    this.container.add([backButton, nextButton]);
  }
  
  /**
   * Set up event handlers
   */
  private setupEvents(): void {
    // Tool change event
    this.manager.events.on('tool:change', this.handleToolChange, this);
    
    // Entity type change event
    this.manager.events.on('entityType:change', this.handleEntityTypeChange, this);
  }
  
  /**
   * Clean up event handlers
   */
  private cleanupEvents(): void {
    // Tool change event
    this.manager.events.removeListener('tool:change', this.handleToolChange);
    
    // Entity type change event
    this.manager.events.removeListener('entityType:change', this.handleEntityTypeChange);
  }
  
  /**
   * Handle tool change event
   * @param tool The selected tool
   */
  private handleToolChange(tool: BuildModeTool): void {
    console.log(`[DesignStep] Tool changed to ${tool}`);
    // Update UI to reflect the selected tool
  }
  
  /**
   * Handle entity type change event
   * @param entityType The selected entity type
   */
  private handleEntityTypeChange(entityType: string): void {
    console.log(`[DesignStep] Entity type changed to ${entityType}`);
    // Update UI to reflect the selected entity type
  }
  
  /**
   * Load a level by ID
   * @param levelId The level ID to load
   */
  private loadLevel(levelId: string): void {
    console.log(`[DesignStep] Loading level ${levelId}`);
    
    // Get level data from service
    const levelData = this.service.loadLevel(levelId);
    
    if (!levelData) {
      console.error(`[DesignStep] Failed to load level ${levelId}`);
      return;
    }
    
    // Clear existing entities
    this.clearEntities();
    
    // Create entities from level data
    levelData.entities.forEach(entity => {
      this.createEntityFromData(entity);
    });
  }
  
  /**
   * Create an entity from data
   * @param entityData The entity data
   */
  private createEntityFromData(entityData: BaseEntity): void {
    // To be implemented - create entity game objects from data
  }
  
  /**
   * Clear all entities from the level
   */
  private clearEntities(): void {
    // Destroy all entity game objects
    this.entities.forEach(entity => {
      entity.destroy();
    });
    
    // Clear entities array
    this.entities = [];
    
    // Clear selected entity
    this.selectedEntity = undefined;
  }
  
  /**
   * Save current progress
   */
  private saveProgress(): void {
    // To be implemented - save the current level state
  }
  
  /**
   * Update function called by the scene
   * @param time Current time
   * @param delta Time since last update
   */
  update(time: number, delta: number): void {
    // Update camera controls
    if (this.cameraControls) {
      this.cameraControls.update(delta);
    }
  }
}
