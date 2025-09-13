/**
 * DesignStep.ts
 * Second step in the Build Mode workflow
 * Handles placing and editing entities in the level
 */

import * as Phaser from 'phaser';
import { BuildModeManager, BuildModeTool } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import {
  BaseEntity,
  EntityType,
  EnemySpawnerType,
  EnemySpawner,
} from '../../../../shared/types/buildMode';

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
  // private grid!: Phaser.GameObjects.Grid; // Keeping for future use
  private cameraControls!: Phaser.Cameras.Controls.SmoothedKeyControl;

  // Entity management
  private entities: Phaser.GameObjects.Container[] = [];

  // Level ID
  private levelId: string | undefined;

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

    // Clean up entities
    this.entities.forEach((entity) => {
      if (entity) {
        entity.destroy();
      }
    });
    this.entities = [];

    // Clean up events
    this.cleanupEvents();

    // Remove any active tool listeners
    this.removeDeleteListener();

    // Remove placement events
    this.scene.input.removeAllListeners('pointermove');
    this.scene.input.removeAllListeners('pointerdown');
  }

  /**
   * Create the UI for this step
   */
  private createUI(): void {
    // Main container
    this.container = this.scene.add.container(0, 60);

    // Background
    const bg = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x222222
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);

    // Create grid
    this.createGrid();

    // Create grid controls
    this.createGridControls();

    // Create toolbar
    this.createToolbar();

    // Create entity palette
    this.createEntityPalette();

    // Create properties panel
    this.createPropertiesPanel();

    // Add step navigation buttons
    this.createStepNavigation();

    // Add save button
    this.createSaveButton();
  }

  /**
   * Set up camera controls
   */
  private setupCameraControls(): void {
    // Create camera control configuration
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      console.error('[DesignStep] Keyboard input is not available');
      return;
    }

    const controlConfig = {
      camera: this.scene.cameras.main,
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      zoomIn: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 0.06,
      drag: 0.003,
      maxSpeed: 1.0,
    };

    // Create camera controls
    this.cameraControls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

    // Enable zoom with mouse wheel
    this.scene.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
        const camera = this.scene.cameras.main;
        const zoom = camera.zoom;

        // Adjust zoom based on wheel direction
        if (deltaY > 0) {
          camera.setZoom(Math.max(0.5, zoom - 0.1));
        } else {
          camera.setZoom(Math.min(2, zoom + 0.1));
        }
      }
    );
  }

  /**
   * Create the grid for entity placement
   */
  private createGrid(): void {
    // Get grid settings from manager
    const gridSize = this.manager.getGridSize();
    const isGridVisible = this.manager.isGridVisible();

    // Create a graphics object for the grid
    const gridGraphics = this.scene.add.graphics();
    gridGraphics.setDepth(0); // Ensure grid is below entities

    // Draw the grid
    this.updateGridDisplay(gridGraphics, gridSize, isGridVisible);

    // Store reference to the grid graphics
    this.container.add(gridGraphics);
    this.container.setData('gridGraphics', gridGraphics);

    // Set up event listeners for grid changes
    this.manager.on('grid:visibilityChange', (visible: boolean) => {
      this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), visible);
    });

    this.manager.on('grid:sizeChange', (size: number) => {
      this.updateGridDisplay(gridGraphics, size, this.manager.isGridVisible());
    });
  }

  /**
   * Update the grid display
   * @param graphics The graphics object to draw on
   * @param gridSize The size of grid cells
   * @param visible Whether the grid should be visible
   */
  private updateGridDisplay(
    graphics: Phaser.GameObjects.Graphics,
    gridSize: number,
    visible: boolean
  ): void {
    // Clear existing grid
    graphics.clear();

    if (!visible) {
      return;
    }

    // Get viewport dimensions and camera position
    const camera = this.scene.cameras.main;
    const viewport = {
      width: this.scene.scale.width,
      height: this.scene.scale.height - 60, // Account for header height
    };

    // Calculate grid boundaries based on camera position
    const startX = Math.floor(camera.scrollX / gridSize) * gridSize - gridSize;
    const startY = Math.floor(camera.scrollY / gridSize) * gridSize - gridSize;
    const endX = startX + viewport.width + gridSize * 2;
    const endY = startY + viewport.height + gridSize * 2;

    // Draw minor grid lines (standard grid)
    graphics.lineStyle(1, 0x555555, 0.6);

    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      graphics.beginPath();
      graphics.moveTo(x, startY);
      graphics.lineTo(x, endY);
      graphics.strokePath();
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(endX, y);
      graphics.strokePath();
    }

    // Draw major grid lines (every 5 cells)
    const majorGridSize = gridSize * 5;
    const majorStartX = Math.floor(camera.scrollX / majorGridSize) * majorGridSize;
    const majorStartY = Math.floor(camera.scrollY / majorGridSize) * majorGridSize;

    graphics.lineStyle(1.5, 0x777777, 0.8);

    // Draw major vertical lines
    for (let x = majorStartX; x <= endX; x += majorGridSize) {
      graphics.beginPath();
      graphics.moveTo(x, startY);
      graphics.lineTo(x, endY);
      graphics.strokePath();
    }

    // Draw major horizontal lines
    for (let y = majorStartY; y <= endY; y += majorGridSize) {
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(endX, y);
      graphics.strokePath();
    }

    // Draw axes with different color
    graphics.lineStyle(2.5, 0x00aaff, 0.9);

    // X axis (horizontal line at y=0)
    graphics.beginPath();
    graphics.moveTo(startX, 0);
    graphics.lineTo(endX, 0);
    graphics.strokePath();

    // Y axis (vertical line at x=0)
    graphics.beginPath();
    graphics.moveTo(0, startY);
    graphics.lineTo(0, endY);
    graphics.strokePath();

    // Draw origin point
    graphics.fillStyle(0xff9900, 1);
    graphics.fillCircle(0, 0, 4);
  }

  /**
   * Create grid control UI
   */
  private createGridControls(): void {
    // Create a container for grid controls
    const controlsContainer = this.scene.add.container(this.scene.scale.width - 140, 120);
    this.container.add(controlsContainer);

    // Controls background
    const controlsBg = this.scene.add.rectangle(0, 0, 120, 150, 0x333333, 0.8);
    controlsBg.setOrigin(0.5);
    controlsBg.setStrokeStyle(1, 0x555555);
    controlsContainer.add(controlsBg);

    // Title
    const title = this.scene.add
      .text(0, -60, 'Grid Controls', {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    controlsContainer.add(title);

    // Grid visibility toggle
    const toggleBg = this.scene.add.rectangle(-40, -20, 24, 24, 0x555555);
    toggleBg.setOrigin(0.5);
    toggleBg.setStrokeStyle(2, 0xaaaaaa);

    // Checkmark (shown when grid is visible)
    const checkmark = this.scene.add
      .text(-40, -20, '✓', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Initial state from manager
    const isVisible = this.manager.isGridVisible();
    checkmark.setVisible(isVisible);
    if (isVisible) {
      toggleBg.setFillStyle(0x00aaff);
      toggleBg.setStrokeStyle(2, 0x00ffff);
    }

    // Label
    const toggleLabel = this.scene.add
      .text(-25, -20, 'Show Grid', {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    // Make toggle interactive
    toggleBg.setInteractive({ useHandCursor: true });
    toggleBg.on('pointerdown', () => {
      const newVisible = !this.manager.isGridVisible();
      this.manager.setGridVisible(newVisible);
      checkmark.setVisible(newVisible);

      if (newVisible) {
        toggleBg.setFillStyle(0x00aaff);
        toggleBg.setStrokeStyle(2, 0x00ffff);
      } else {
        toggleBg.setFillStyle(0x555555);
        toggleBg.setStrokeStyle(2, 0xaaaaaa);
      }
    });

    // Grid size controls
    const sizeLabel = this.scene.add
      .text(0, 10, 'Grid Size', {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Size value display
    const sizeValue = this.scene.add
      .text(0, 30, this.manager.getGridSize().toString(), {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Decrease button
    const decButton = this.scene.add
      .text(-30, 30, '-', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    decButton.setInteractive({ useHandCursor: true });
    decButton.on('pointerdown', () => {
      const currentSize = this.manager.getGridSize();
      if (currentSize > 8) {
        // Minimum size
        this.manager.setGridSize(currentSize - 8);
        sizeValue.setText(this.manager.getGridSize().toString());
      }
    });

    // Increase button
    const incButton = this.scene.add
      .text(30, 30, '+', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    incButton.setInteractive({ useHandCursor: true });
    incButton.on('pointerdown', () => {
      const currentSize = this.manager.getGridSize();
      if (currentSize < 64) {
        // Maximum size
        this.manager.setGridSize(currentSize + 8);
        sizeValue.setText(this.manager.getGridSize().toString());
      }
    });

    // Add all controls to container
    controlsContainer.add([
      title,
      toggleBg,
      checkmark,
      toggleLabel,
      sizeLabel,
      sizeValue,
      decButton,
      incButton,
    ]);
  }

  /**
   * Create the toolbar with editing tools
   */
  private createToolbar(): void {
    // Create toolbar container
    this.toolbarContainer = this.scene.add.container(10, 10);
    this.container.add(this.toolbarContainer);

    // Create toolbar background
    const toolbarBg = this.scene.add.rectangle(0, 0, 50, 300, 0x333333);
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
      { tool: BuildModeTool.PAN, icon: '👁️', label: 'Pan' },
    ];

    // Keep track of tool button backgrounds
    const toolButtonBackgrounds: { [key: string]: Phaser.GameObjects.Rectangle } = {};

    tools.forEach((toolInfo, index) => {
      const y = 20 + index * 50;

      // Button background for selection indicator
      const buttonBg = this.scene.add.rectangle(25, y, 40, 40, 0x333333);
      buttonBg.setOrigin(0.5);
      buttonBg.setStrokeStyle(2, 0x555555, 0);
      this.toolbarContainer.add(buttonBg);

      // Store background reference by tool name
      toolButtonBackgrounds[toolInfo.tool] = buttonBg;

      // If this is the current tool, highlight it
      if (this.manager.getCurrentTool() === toolInfo.tool) {
        buttonBg.setFillStyle(0x0066aa);
        buttonBg.setStrokeStyle(2, 0x00ffff, 1);
      }

      // Tool button
      const toolButton = this.scene.add
        .text(25, y, toolInfo.icon, {
          fontSize: '24px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      // Make button interactive
      toolButton.setInteractive({ useHandCursor: true });

      // Add hover effects
      toolButton.on('pointerover', () => {
        toolButton.setTint(0x00ffff);
        buttonBg.setStrokeStyle(2, 0x00ffff, 1);

        // Show tooltip
        const tooltip = this.scene.add
          .text(60, y, toolInfo.label, {
            fontSize: '14px',
            backgroundColor: '#444444',
            padding: { x: 5, y: 3 },
            color: '#ffffff',
          })
          .setOrigin(0, 0.5);

        toolButton.setData('tooltip', tooltip);
      });

      toolButton.on('pointerout', () => {
        toolButton.clearTint();

        // Only clear stroke if not selected
        if (this.manager.getCurrentTool() !== toolInfo.tool) {
          buttonBg.setStrokeStyle(2, 0x555555, 0);
        }

        // Remove tooltip
        const tooltip = toolButton.getData('tooltip');
        if (tooltip) {
          tooltip.destroy();
        }
      });

      // Set tool on click
      toolButton.on('pointerdown', () => {
        // Update the tool
        this.manager.setCurrentTool(toolInfo.tool);

        // Reset all button backgrounds
        Object.values(toolButtonBackgrounds).forEach((bg) => {
          bg.setFillStyle(0x333333);
          bg.setStrokeStyle(2, 0x555555, 0);
        });

        // Highlight selected tool
        buttonBg.setFillStyle(0x0066aa);
        buttonBg.setStrokeStyle(2, 0x00ffff, 1);
      });

      this.toolbarContainer.add(toolButton);
    });

    // Listen for tool changes from the manager
    this.manager.on('tool:change', (tool: BuildModeTool) => {
      // Reset all button backgrounds
      Object.values(toolButtonBackgrounds).forEach((bg) => {
        bg.setFillStyle(0x333333);
        bg.setStrokeStyle(2, 0x555555, 0);
      });

      // Highlight the selected tool
      const selectedBg = toolButtonBackgrounds[tool];
      if (selectedBg) {
        selectedBg.setFillStyle(0x0066aa);
        selectedBg.setStrokeStyle(2, 0x00ffff, 1);
      }
    });
  }

  /**
   * Create the entity palette for selecting entities to place
   */
  private createEntityPalette(): void {
    // Create entity palette container - adjusted position for better centering
    this.entityPaletteContainer = this.scene.add.container(this.scene.scale.width - 150, 200);
    this.container.add(this.entityPaletteContainer);

    // Create palette background with more contrast
    const paletteBg = this.scene.add.rectangle(0, 0, 240, 460, 0x222222, 0.95);
    paletteBg.setOrigin(0.5);
    paletteBg.setStrokeStyle(2, 0x3399ff);
    this.entityPaletteContainer.add(paletteBg);

    // Add a header bar
    const headerBg = this.scene.add.rectangle(0, -200, 240, 40, 0x3366cc, 1);
    headerBg.setOrigin(0.5);
    this.entityPaletteContainer.add(headerBg);

    // Title with better visibility
    const title = this.scene.add
      .text(0, -200, 'ENTITY PALETTE', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5);
    this.entityPaletteContainer.add(title);

    // Create tabs for entity categories
    this.createEntityTabs();

    // Create entity buttons
    this.createEnemyButtons();
  } /**
   * Create tabs for different entity categories
   */
  private createEntityTabs(): void {
    // Entity type categories
    const categories = [
      { id: 'enemies', label: 'Enemies', active: true },
      { id: 'obstacles', label: 'Obstacles', active: false },
      { id: 'powerups', label: 'Power-Ups', active: false },
      { id: 'decorations', label: 'Decorations', active: false },
    ];

    // Tab container - moved down for better spacing
    const tabsContainer = this.scene.add.container(0, -160);
    this.entityPaletteContainer.add(tabsContainer);

    // Tab separator line
    const separatorLine = this.scene.add.graphics();
    separatorLine.lineStyle(2, 0x3399ff, 0.8);
    separatorLine.lineBetween(-115, 31, 115, 31);
    tabsContainer.add(separatorLine);

    // Create tabs with better visibility and spacing
    const tabWidth = 300 / categories.length;
    categories.forEach((category, index) => {
      // Tab background with improved colors
      const tabBg = this.scene.add.rectangle(
        -110 + tabWidth * index + tabWidth / 2,
        15,
        tabWidth - 2, // Small gap between tabs
        30,
        category.active ? 0x3399ff : 0x444444
      );

      // Add top border to active tab
      if (category.active) {
        const topBorder = this.scene.add.rectangle(
          -110 + tabWidth * index + tabWidth / 2,
          0,
          tabWidth - 2,
          3,
          0x00ffff
        );
        topBorder.setOrigin(0.5, 0);
        tabsContainer.add(topBorder);
      }

      tabBg.setOrigin(0.5, 0.5);
      tabBg.setStrokeStyle(1, category.active ? 0x66ccff : 0x666666);
      tabBg.setData('category', category.id);
      tabBg.setInteractive({ useHandCursor: true });

      // Tab label with improved visibility
      const tabLabel = this.scene.add
        .text(-110 + tabWidth * index + tabWidth / 2, 15, category.label, {
          fontSize: '13px',
          color: category.active ? '#ffffff' : '#cccccc',
          fontStyle: category.active ? 'bold' : 'normal',
        })
        .setOrigin(0.5, 0.5);

      // Store active state
      tabBg.setData('active', category.active);

      // Click handler with improved visual feedback
      tabBg.on('pointerdown', () => {
        // Remove top borders from all tabs
        tabsContainer.list.forEach((child) => {
          if (child instanceof Phaser.GameObjects.Rectangle && child.height === 3) {
            child.destroy();
          }
        });

        // Deactivate all tabs
        tabsContainer.list.forEach((child) => {
          if (
            child instanceof Phaser.GameObjects.Rectangle &&
            child.height !== 3 && // Not a top border
            !(child instanceof Phaser.GameObjects.Graphics)
          ) {
            // Not the separator line

            child.setFillStyle(0x444444);
            child.setStrokeStyle(1, 0x666666);
            child.setData('active', false);

            // Find and update the label
            const idx = tabsContainer.list.indexOf(child);
            if (idx >= 0 && idx + 1 < tabsContainer.list.length) {
              const label = tabsContainer.list[idx + 1];
              if (label instanceof Phaser.GameObjects.Text) {
                label.setColor('#cccccc');
                label.setFontStyle('normal');
              }
            }
          }
        });

        // Activate this tab
        tabBg.setFillStyle(0x3399ff);
        tabBg.setStrokeStyle(1, 0x66ccff);
        tabBg.setData('active', true);

        // Add top border to active tab
        const topBorder = this.scene.add.rectangle(tabBg.x, 0, tabWidth - 2, 3, 0x00ffff);
        topBorder.setOrigin(0.5, 0);
        tabsContainer.add(topBorder);

        // Update the label
        tabLabel.setColor('#ffffff');
        tabLabel.setFontStyle('bold');

        // Show the corresponding entity category
        this.showEntityCategory(category.id);
      });

      tabsContainer.add([tabBg, tabLabel]);
    });

    // Store reference to tab container
    this.entityPaletteContainer.setData('tabs', tabsContainer);
  }

  /**
   * Show a specific entity category
   * @param categoryId The category ID to show
   */
  private showEntityCategory(categoryId: string): void {
    // Hide all category containers
    const containers = ['enemies', 'obstacles', 'powerups', 'decorations'];
    containers.forEach((id) => {
      const container = this.entityPaletteContainer.getByName(id) as Phaser.GameObjects.Container;
      if (container) {
        container.setVisible(false);
      }
    });

    // Show the selected category
    const selectedContainer = this.entityPaletteContainer.getByName(
      categoryId
    ) as Phaser.GameObjects.Container;
    if (selectedContainer) {
      selectedContainer.setVisible(true);
    }

    console.log(`[DesignStep] Showing entity category: ${categoryId}`);
  }

  /**
   * Create enemy entity buttons
   */
  private createEnemyButtons(): void {
    // Create container for enemy buttons with consistent positioning
    const enemiesContainer = this.scene.add.container(0, -120);
    enemiesContainer.setName('enemies');
    this.entityPaletteContainer.add(enemiesContainer);

    // Add subtitle
    const subtitle = this.scene.add
      .text(0, -50, 'SELECT ENEMY TYPE', {
        fontSize: '14px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    enemiesContainer.add(subtitle);

    // Add a separator line below the subtitle
    const separatorLine = this.scene.add.graphics();
    separatorLine.lineStyle(1, 0x666666, 0.8);
    separatorLine.lineBetween(-100, -35, 100, -35);
    enemiesContainer.add(separatorLine);

    // Add a scroll hint at the bottom
    const scrollHint = this.scene.add
      .text(0, 340, '⬍ Scroll for more options ⬍', {
        fontSize: '12px',
        color: '#aaaaaa',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    enemiesContainer.add(scrollHint);

    // Enemy types to display with colors for visual distinction
    const enemies = [
      {
        type: EnemySpawnerType.FIGHTER,
        name: 'Fighter',
        texture: 'enemy_fighter',
        color: 0xff3333,
        description: 'Basic fighter with moderate speed and health.',
      },
      {
        type: EnemySpawnerType.SCOUT,
        name: 'Scout',
        texture: 'enemy_scout',
        color: 0x33ddff,
        description: 'Fast scout with low health but high evasion.',
      },
      {
        type: EnemySpawnerType.CRUISER,
        name: 'Cruiser',
        texture: 'enemy_cruiser',
        color: 0xff9933,
        description: 'Heavy cruiser with high health but slow speed.',
      },
      {
        type: EnemySpawnerType.SEEKER,
        name: 'Seeker',
        texture: 'enemy_seeker',
        color: 0xff3399,
        description: 'Seeker drone that tracks the player.',
      },
      {
        type: EnemySpawnerType.GUNSHIP,
        name: 'Gunship',
        texture: 'enemy_gunship',
        color: 0x9933ff,
        description: 'Elite gunship that fires projectiles.',
      },
    ];

    // Create a clean, card-based UI for enemy selection
    enemies.forEach((enemy, index) => {
      const y = -20 + index * 70; // Consistent spacing between cards

      // Button container
      const buttonContainer = this.scene.add.container(0, y);
      enemiesContainer.add(buttonContainer);

      // Card background
      const buttonBg = this.scene.add.rectangle(0, 0, 200, 60, 0x222222);
      buttonBg.setOrigin(0.5);
      buttonBg.setStrokeStyle(1, 0x444444);
      buttonBg.setInteractive({ useHandCursor: true });

      // Create an accent bar on the left side
      const accentBar = this.scene.add.rectangle(-95, 0, 10, 60, enemy.color, 0.8);
      accentBar.setOrigin(0.5);

      // Create a glow graphic for hover and selection effects
      const glowGraphic = this.scene.add.graphics();
      glowGraphic.fillStyle(enemy.color, 0.3);
      glowGraphic.fillCircle(-80, 0, 25);

      // Create a color indicator circle behind the sprite
      const spriteBg = this.scene.add.circle(-80, 0, 20, enemy.color, 0.9);

      // Enemy sprite in the circle
      const sprite = this.scene.add.image(-80, 0, enemy.texture);
      sprite.setScale(1.7);

      // Dark overlay to make sprite more visible
      const darkOverlay = this.scene.add.circle(-80, 0, 18, 0x000000, 0.3);

      // Enemy name with clean typography
      const nameText = this.scene.add
        .text(-50, -12, enemy.name.toUpperCase(), {
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);

      // Shorter description text
      const typeDescription = this.scene.add
        .text(-50, 10, enemy.description, {
          fontSize: '11px',
          color: '#aaaaaa',
          wordWrap: { width: 130 },
        })
        .setOrigin(0, 0.5);

      // Button hover effects with enhanced visuals
      buttonBg.on('pointerover', () => {
        // Enhanced hover state
        buttonBg.setFillStyle(0x444444);
        accentBar.setFillStyle(enemy.color, 1);
        glowGraphic.clear();
        glowGraphic.fillStyle(enemy.color, 0.4);
        glowGraphic.fillCircle(-80, 0, 30);

        // Scale up the sprite slightly for emphasis
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.9,
          scaleY: 1.9,
          duration: 100,
        });

        // Highlight the text
        nameText.setColor('#ffffff');
        typeDescription.setColor('#ffffff');
      });

      buttonBg.on('pointerout', () => {
        // Return to normal state if not selected
        if (this.manager.getCurrentEntityType() !== enemy.type) {
          buttonBg.setFillStyle(0x222222);
          accentBar.setFillStyle(enemy.color, 0.8);
          glowGraphic.clear();
          glowGraphic.fillStyle(enemy.color, 0.3);
          glowGraphic.fillCircle(-80, 0, 25);
        }

        // Scale down the sprite
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.7,
          scaleY: 1.7,
          duration: 100,
        });

        // Return text to normal
        nameText.setColor('#ffffff');
        typeDescription.setColor('#aaaaaa');
      });

      // Set enemy type on click with enhanced feedback
      buttonBg.on('pointerdown', () => {
        this.manager.setCurrentEntityType(enemy.type);
        this.manager.setCurrentTool(BuildModeTool.PLACE);

        console.log(`[DesignStep] Selected enemy type: ${enemy.type}`);

        // Reset all buttons first
        enemiesContainer.list.forEach((child) => {
          if (child instanceof Phaser.GameObjects.Container && child !== enemiesContainer) {
            // Find button components in the container
            child.list.forEach((item) => {
              if (item instanceof Phaser.GameObjects.Rectangle && item.width === 200) {
                // This is a button background
                item.setFillStyle(0x222222);
                item.setStrokeStyle(1, 0x444444);
              } else if (item instanceof Phaser.GameObjects.Rectangle && item.width === 10) {
                // This is an accent bar
                if (item.fillColor) {
                  item.setFillStyle(item.fillColor, 0.8);
                }
              }
            });
          }
        });

        // Enhanced selection state
        buttonBg.setFillStyle(0x333333);
        buttonBg.setStrokeStyle(2, enemy.color, 1);
        accentBar.setFillStyle(enemy.color, 1);

        // Visual pulse effect on selection
        this.scene.tweens.add({
          targets: glowGraphic,
          alpha: { from: 0.8, to: 0.3 },
          duration: 500,
          yoyo: true,
          repeat: 0,
        });
      });

      // Add elements to button container in the correct order
      buttonContainer.add([
        buttonBg,
        accentBar,
        glowGraphic,
        spriteBg,
        darkOverlay,
        sprite,
        nameText,
        typeDescription,
      ]);
    });

    // Set initial selection to first enemy type
    if (enemies.length > 0 && enemies[0]) {
      this.manager.setCurrentEntityType(enemies[0].type);
    }
  }

  // Placeholder textures are now created in the BuildModeScene

  /**
   * Create the properties panel for editing entity properties
   */
  private createPropertiesPanel(): void {
    // Create properties panel container
    this.propertiesContainer = this.scene.add.container(
      this.scene.scale.width - 160,
      this.scene.scale.height - 220
    );
    this.container.add(this.propertiesContainer);

    // Create panel background
    const panelBg = this.scene.add.rectangle(0, 0, 300, 180, 0x333333, 0.8);
    panelBg.setOrigin(0.5);
    panelBg.setStrokeStyle(1, 0x555555);
    this.propertiesContainer.add(panelBg);

    // Title
    const title = this.scene.add
      .text(0, -75, 'Properties', {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.propertiesContainer.add(title);

    // No selection text
    const noSelectionText = this.scene.add
      .text(0, 0, 'No entity selected', {
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);
    this.propertiesContainer.add(noSelectionText);

    // Initially hide the panel until an entity is selected
    this.propertiesContainer.setVisible(false);
  }

  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Back button (to Setup step)
    const backButton = this.scene.add
      .text(this.scene.scale.width - 200, this.scene.scale.height - 40, '< Back to Setup', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 0.5);

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
    const nextButton = this.scene.add
      .text(this.scene.scale.width - 80, this.scene.scale.height - 40, 'Test Level >', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 0.5);

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

    // Set up input events for entity placement
    this.setupPlacementEvents();
  }

  /**
   * Set up events for entity placement
   */
  private setupPlacementEvents(): void {
    // Create a placement preview that follows the cursor
    const placementPreview = this.scene.add.container(0, 0);
    placementPreview.setVisible(false);
    this.container.add(placementPreview);

    // Store reference to placement preview
    this.container.setData('placementPreview', placementPreview);

    // Handle pointer move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Only show preview when PLACE tool is active
      if (this.manager.getCurrentTool() !== BuildModeTool.PLACE) {
        placementPreview.setVisible(false);
        return;
      }

      // Get current entity type
      const entityType = this.manager.getCurrentEntityType();
      if (!entityType) {
        placementPreview.setVisible(false);
        return;
      }

      // Convert screen position to world position
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Snap to grid if enabled
      const snappedPosition = this.manager.snapToGridIfEnabled({
        x: worldPoint.x,
        y: worldPoint.y,
      });

      // Update preview position
      placementPreview.setPosition(snappedPosition.x, snappedPosition.y);

      // If preview content doesn't match current entity type, recreate it
      if (placementPreview.getData('entityType') !== entityType) {
        this.updatePlacementPreview(placementPreview, entityType);
      }

      // Show the preview
      placementPreview.setVisible(true);
    });

    // Handle pointer down for placement
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only place when using PLACE tool and left click
      if (this.manager.getCurrentTool() !== BuildModeTool.PLACE || pointer.rightButtonDown()) {
        return;
      }

      // Get current entity type
      const entityType = this.manager.getCurrentEntityType();
      if (!entityType) {
        return;
      }

      // Convert screen position to world position
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Snap to grid if enabled
      const snappedPosition = this.manager.snapToGridIfEnabled({
        x: worldPoint.x,
        y: worldPoint.y,
      });

      // Create the entity
      this.placeEntity(entityType, snappedPosition.x, snappedPosition.y);
    });
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
    if (tool === BuildModeTool.DELETE) {
      // If DELETE tool is selected, set up delete event listener
      this.setupDeleteListener();
    } else {
      // Remove delete listener for other tools
      this.removeDeleteListener();
    }
  }

  /**
   * Set up event listener for delete tool
   */
  private setupDeleteListener(): void {
    // Add listener for pointer down on scene
    this.scene.input.on('pointerdown', this.handleDeleteToolClick, this);
  }

  /**
   * Remove delete event listener
   */
  private removeDeleteListener(): void {
    this.scene.input.removeListener('pointerdown', this.handleDeleteToolClick, this);
  }

  /**
   * Handle clicks when using the delete tool
   */
  private handleDeleteToolClick(pointer: Phaser.Input.Pointer): void {
    // Only process left clicks with DELETE tool
    if (this.manager.getCurrentTool() !== BuildModeTool.DELETE || pointer.rightButtonDown()) {
      return;
    }

    // Check if we clicked on an entity
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Find entity under pointer
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (!entity) continue; // Skip undefined entities

      const sprite = entity.list[0] as Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
      if (!sprite) continue; // Skip if no sprite

      // Calculate bounds
      const bounds = new Phaser.Geom.Rectangle(
        entity.x - (sprite.width / 2) * entity.scaleX,
        entity.y - (sprite.height / 2) * entity.scaleY,
        sprite.width * entity.scaleX,
        sprite.height * entity.scaleY
      );

      // Check if point is within bounds
      if (Phaser.Geom.Rectangle.Contains(bounds, worldX, worldY)) {
        // Delete the entity
        this.deleteEntity(entity);
        break;
      }
    }
  }

  /**
   * Delete an entity
   * @param entity The entity to delete
   */
  private deleteEntity(entity: Phaser.GameObjects.Container): void {
    // Get entity ID
    const entityId = entity.getData('id');
    console.log(`[DesignStep] Deleting entity with ID: ${entityId}`);

    // Remove from selection if selected
    this.manager.deselectEntity(entityId);

    // Remove from entities array
    this.entities = this.entities.filter((e) => e !== entity);

    // Destroy the game object
    entity.destroy();

    // Mark the level as dirty
    this.manager.setDirty(true);
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
    levelData.entities.forEach((entity) => {
      this.createEntityFromData(entity);
    });
  }

  /**
   * Create an entity from data
   * @param entityData The entity data
   * @returns The created entity container
   */
  private createEntityFromData(entityData: BaseEntity): Phaser.GameObjects.Container {
    console.log(
      `[DesignStep] Creating entity with ID ${entityData.id} at position (${entityData.position.x}, ${entityData.position.y})`
    );

    // Create a container for the entity
    const entityContainer = this.scene.add.container(entityData.position.x, entityData.position.y);

    // Store entity data with the container
    entityContainer.setData('entityData', entityData);
    entityContainer.setData('id', entityData.id);

    // Create visual representation based on entity type
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    switch (entityData.type) {
      case EntityType.ENEMY_SPAWNER: {
        // Get enemy spawner data
        const enemySpawner = entityData as unknown as { enemyType?: string };
        const enemyType = enemySpawner.enemyType || EnemySpawnerType.FIGHTER;

        // Determine texture based on enemy type
        let texture = 'enemy_fighter'; // Default texture

        if (enemyType === EnemySpawnerType.SCOUT) {
          texture = 'enemy_scout';
        } else if (enemyType === EnemySpawnerType.CRUISER) {
          texture = 'enemy_cruiser';
        } else if (enemyType === EnemySpawnerType.SEEKER) {
          texture = 'enemy_seeker';
        } else if (enemyType === EnemySpawnerType.GUNSHIP) {
          texture = 'enemy_gunship';
        }

        // Create sprite using the appropriate texture
        sprite = this.scene.add.image(0, 0, texture);
        break;
      }

      case EntityType.PLAYER_START: {
        // Player start position (green rectangle)
        sprite = this.scene.add.rectangle(0, 0, 32, 32, 0x00ff00, 0.7);
        sprite.setStrokeStyle(2, 0xffffff);
        break;
      }

      case EntityType.OBSTACLE: {
        // Obstacle (gray shape)
        sprite = this.scene.add.rectangle(0, 0, 40, 40, 0x888888, 0.8);
        sprite.setStrokeStyle(2, 0xffffff);
        break;
      }

      case EntityType.POWERUP_SPAWNER: {
        // PowerUp spawner (yellow star)
        if (this.scene.textures.exists('powerup')) {
          sprite = this.scene.add.image(0, 0, 'powerup');
        } else {
          // Create a yellow star shape if texture doesn't exist
          sprite = this.scene.add.rectangle(0, 0, 30, 30, 0xffcc00, 0.8);
          sprite.setStrokeStyle(2, 0xffffff);
        }
        break;
      }

      case EntityType.DECORATION: {
        // Decoration (light blue square)
        sprite = this.scene.add.rectangle(0, 0, 30, 30, 0x88ccff, 0.5);
        break;
      }

      case EntityType.TRIGGER: {
        // Trigger (purple circle)
        sprite = this.scene.add.rectangle(0, 0, 32, 32, 0xaa00aa, 0.4);
        sprite.setStrokeStyle(1, 0xff00ff, 0.8);
        break;
      }

      default: {
        // Default visual (red square)
        sprite = this.scene.add.rectangle(0, 0, 32, 32, 0xff0000, 0.7);
        break;
      }
    }

    // Add the sprite to the container
    entityContainer.add(sprite);

    // Add label with entity type
    const label = this.scene.add
      .text(0, sprite.height / 2 + 10, this.getEntityLabel(entityData), {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5, 0);

    entityContainer.add(label);

    // Make entity interactive
    sprite.setInteractive({ useHandCursor: true, draggable: true });

    // Entity selection
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only handle selection if using the SELECT tool or holding SHIFT
      if (this.manager.getCurrentTool() === BuildModeTool.SELECT || pointer.event.shiftKey) {
        // Determine if this should be added to selection or replace it
        const addToSelection = pointer.event.shiftKey;

        // Select the entity
        this.selectEntity(entityContainer, addToSelection);

        // Mark the level as dirty
        this.manager.setDirty(true);
      }

      // Handle movement with the MOVE tool
      if (this.manager.getCurrentTool() === BuildModeTool.MOVE) {
        // Store the initial offset between pointer and entity
        entityContainer.setData('dragOffsetX', entityContainer.x - pointer.worldX);
        entityContainer.setData('dragOffsetY', entityContainer.y - pointer.worldY);
      }
    });

    // Drag start
    sprite.on('dragstart', () => {
      // Only allow dragging with MOVE tool
      if (this.manager.getCurrentTool() !== BuildModeTool.MOVE) {
        return;
      }

      // Select the entity if not already selected
      if (!this.manager.getSelectedEntityIds().includes(entityContainer.getData('id'))) {
        this.selectEntity(entityContainer);
      }
    });

    // Drag movement
    sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
      // Only allow dragging with MOVE tool
      if (this.manager.getCurrentTool() !== BuildModeTool.MOVE) {
        return;
      }

      // Get the drag offset
      const offsetX = entityContainer.getData('dragOffsetX') || 0;
      const offsetY = entityContainer.getData('dragOffsetY') || 0;

      // Calculate new position
      const newX = pointer.worldX + offsetX;
      const newY = pointer.worldY + offsetY;

      // Snap to grid if enabled
      const snappedPosition = this.manager.snapToGridIfEnabled({
        x: newX,
        y: newY,
      });

      // Update entity position
      entityContainer.setPosition(snappedPosition.x, snappedPosition.y);

      // Mark the level as dirty
      this.manager.setDirty(true);
    });

    // Drag end
    sprite.on('dragend', () => {
      // Only process if using MOVE tool
      if (this.manager.getCurrentTool() !== BuildModeTool.MOVE) {
        return;
      }

      // Update the entity data with the new position
      const entityData = entityContainer.getData('entityData');
      if (entityData) {
        entityData.position = {
          x: entityContainer.x,
          y: entityContainer.y,
        };
      }
    });

    // Set rotation if specified
    if (entityData.rotation) {
      entityContainer.setRotation(entityData.rotation);
    }

    // Set scale if specified
    if (entityData.scale && entityData.scale !== 1) {
      entityContainer.setScale(entityData.scale);
    }

    // Add to the entities array
    this.entities.push(entityContainer);

    return entityContainer;
  }

  /**
   * Get a display label for an entity
   * @param entityData The entity data
   * @returns A display label
   */
  private getEntityLabel(entityData: BaseEntity): string {
    switch (entityData.type) {
      case EntityType.ENEMY_SPAWNER: {
        const enemySpawner = entityData as unknown as { enemyType?: string };
        return `Enemy: ${enemySpawner.enemyType || 'Unknown'}`;
      }

      case EntityType.PLAYER_START: {
        return 'Player Start';
      }

      case EntityType.OBSTACLE: {
        const obstacle = entityData as unknown as { obstacleType?: string };
        return `Obstacle: ${obstacle.obstacleType || 'Generic'}`;
      }

      case EntityType.POWERUP_SPAWNER: {
        const powerupSpawner = entityData as unknown as { powerUpType?: string };
        return `PowerUp: ${powerupSpawner.powerUpType || 'Random'}`;
      }

      case EntityType.DECORATION: {
        const decoration = entityData as unknown as { decorationType?: string };
        return `Decoration: ${decoration.decorationType || 'Generic'}`;
      }

      case EntityType.TRIGGER: {
        const trigger = entityData as unknown as { triggerType?: string };
        return `Trigger: ${trigger.triggerType || 'Generic'}`;
      }

      default: {
        return 'Unknown';
      }
    }
  }

  /**
   * Select an entity
   * @param entity The entity to select
   * @param addToSelection Whether to add to the current selection
   */
  private selectEntity(
    entity: Phaser.GameObjects.Container,
    addToSelection: boolean = false
  ): void {
    // Get entity ID
    const entityId = entity.getData('id');

    // Update selection in the manager
    if (addToSelection) {
      // Add to selection if not already selected
      if (!this.manager.getSelectedEntityIds().includes(entityId)) {
        this.manager.selectEntity(entityId, true);
      } else {
        // If already selected and SHIFT is pressed, deselect it
        this.manager.deselectEntity(entityId);
      }
    } else {
      // Replace current selection
      this.manager.selectEntity(entityId, false);
    }

    // Update visual selection state for all entities
    this.updateEntitySelectionVisuals();

    // Show properties panel for the selected entity
    this.showPropertiesForEntity(entity);
  }

  /**
   * Update the visual representation of selected entities
   */
  private updateEntitySelectionVisuals(): void {
    // Get the current selection from the manager
    const selectedIds = this.manager.getSelectedEntityIds();

    // Update all entities
    this.entities.forEach((entity) => {
      const entityId = entity.getData('id');
      const isSelected = selectedIds.includes(entityId);

      // Get the main sprite (first child)
      const sprite = entity.list[0] as Phaser.GameObjects.Shape | Phaser.GameObjects.Image;

      if (isSelected) {
        // Visual indicator for selection
        if (sprite instanceof Phaser.GameObjects.Shape) {
          sprite.setStrokeStyle(3, 0xffff00);
        } else {
          // For images, add a selection rectangle if not already present
          if (!entity.getData('selectionRect')) {
            const bounds = sprite.getBounds();
            const selectionRect = this.scene.add.rectangle(
              0,
              0,
              bounds.width + 10,
              bounds.height + 10,
              0xffff00,
              0.1
            );
            selectionRect.setStrokeStyle(2, 0xffff00);

            // Add to the beginning of the container so it's behind the sprite
            entity.addAt(selectionRect, 0);
            entity.setData('selectionRect', selectionRect);
          }
        }

        // Store the reference to the currently selected entity
        // selection reference removed
      } else {
        // Remove selection visual
        if (sprite instanceof Phaser.GameObjects.Shape) {
          // Reset stroke to default
          const defaultStrokeColor = entity.getData('defaultStrokeColor') || 0xffffff;
          const defaultStrokeWidth = entity.getData('defaultStrokeWidth') || 1;
          sprite.setStrokeStyle(defaultStrokeWidth, defaultStrokeColor);
        } else {
          // Remove selection rectangle if present
          const selectionRect = entity.getData('selectionRect');
          if (selectionRect) {
            selectionRect.destroy();
            entity.setData('selectionRect', null);
          }
        }
      }
    });

    // If nothing is selected, clear the selected entity reference
    if (selectedIds.length === 0) {
      // selection reference removed

      // Hide properties panel when nothing is selected
      if (this.propertiesContainer) {
        this.propertiesContainer.setVisible(false);
      }
    }
  }

  /**
   * Show properties panel for an entity
   * @param entity The entity to show properties for
   */
  private showPropertiesForEntity(entity: Phaser.GameObjects.Container): void {
    // Ensure properties container exists
    if (!this.propertiesContainer) {
      return;
    }

    // Get entity data
    const entityData = entity.getData('entityData') as BaseEntity;

    if (!entityData) {
      return;
    }

    // Clear existing content
    this.propertiesContainer.each((child: Phaser.GameObjects.GameObject) => {
      // Keep the background and title
      if (
        child !== this.propertiesContainer.list[0] &&
        child !== this.propertiesContainer.list[1]
      ) {
        child.destroy();
      }
    });

    // Create properties UI based on entity type
    const commonY = -40; // Starting Y position
    let currentY = commonY;

    // Store property controls for later access
    const controls: { [key: string]: Phaser.GameObjects.GameObject } = {};

    // Add a title for the entity
    const entityTitle = this.scene.add
      .text(0, -100, this.getEntityTypeLabel(entityData.type), {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.propertiesContainer.add(entityTitle);

    // ID (read-only)
    this.addReadOnlyProperty('ID', entityData.id, currentY);
    currentY += 25;

    // Position (read-only - use Move tool to change)
    this.addReadOnlyProperty(
      'Position',
      `(${Math.round(entityData.position.x)}, ${Math.round(entityData.position.y)})`,
      currentY
    );
    currentY += 25;

    // Rotation (numeric input)
    const rotationControl = this.addNumericProperty(
      'Rotation',
      entityData.rotation,
      currentY,
      0,
      360,
      (value) => {
        // Update entity rotation
        entityData.rotation = value;
        entity.setRotation(Phaser.Math.DegToRad(value));
        this.manager.setDirty(true);
      }
    );
    controls['rotation'] = rotationControl;
    currentY += 25;

    // Scale (numeric input)
    const scaleControl = this.addNumericProperty(
      'Scale',
      entityData.scale || 1,
      currentY,
      0.1,
      3,
      (value) => {
        // Update entity scale
        entityData.scale = value;
        entity.setScale(value);
        this.manager.setDirty(true);
      },
      0.1
    );
    controls['scale'] = scaleControl;
    currentY += 25;

    // Add type-specific properties
    switch (entityData.type) {
      case EntityType.ENEMY_SPAWNER: {
        const enemySpawner = entityData as unknown as EnemySpawner;

        // Add a separator
        const separator = this.scene.add.graphics();
        separator.lineStyle(1, 0x555555, 1);
        separator.lineBetween(-120, currentY + 10, 120, currentY + 10);
        this.propertiesContainer.add(separator);
        currentY += 25;

        // Enemy Type (dropdown)
        const enemyTypeOptions = [
          { value: EnemySpawnerType.FIGHTER, label: 'Fighter' },
          { value: EnemySpawnerType.SCOUT, label: 'Scout' },
          { value: EnemySpawnerType.CRUISER, label: 'Cruiser' },
          { value: EnemySpawnerType.SEEKER, label: 'Seeker' },
          { value: EnemySpawnerType.GUNSHIP, label: 'Gunship' },
          { value: EnemySpawnerType.RANDOM, label: 'Random' },
        ];

        const enemyTypeControl = this.addDropdownProperty(
          'Enemy Type',
          enemySpawner.enemyType,
          enemyTypeOptions,
          currentY,
          (value) => {
            // Update enemy type
            enemySpawner.enemyType = value as EnemySpawnerType;

            // Update the entity visual
            const sprite = entity.list.find(
              (child) => child instanceof Phaser.GameObjects.Image
            ) as Phaser.GameObjects.Image;

            if (sprite) {
              // Determine texture based on enemy type
              let texture = 'enemy_fighter'; // Default texture

              if (value === EnemySpawnerType.SCOUT) {
                texture = 'enemy_scout';
              } else if (value === EnemySpawnerType.CRUISER) {
                texture = 'enemy_cruiser';
              } else if (value === EnemySpawnerType.SEEKER) {
                texture = 'enemy_seeker';
              } else if (value === EnemySpawnerType.GUNSHIP) {
                texture = 'enemy_gunship';
              }

              // Update texture
              sprite.setTexture(texture);
            }

            // Mark level as dirty
            this.manager.setDirty(true);
          }
        );
        controls['enemyType'] = enemyTypeControl;
        currentY += 25;

        // Spawn Rate (numeric input)
        const spawnRateControl = this.addNumericProperty(
          'Spawn Rate',
          enemySpawner.spawnRate || 2,
          currentY,
          0.5,
          10,
          (value) => {
            // Update spawn rate
            enemySpawner.spawnRate = value;
            this.manager.setDirty(true);
          },
          0.1
        );
        controls['spawnRate'] = spawnRateControl;
        currentY += 25;

        // Max Enemies (numeric input)
        const maxEnemiesControl = this.addNumericProperty(
          'Max Enemies',
          enemySpawner.maxEnemies || 5,
          currentY,
          1,
          20,
          (value) => {
            // Update max enemies
            enemySpawner.maxEnemies = Math.round(value);
            this.manager.setDirty(true);
          },
          1
        );
        controls['maxEnemies'] = maxEnemiesControl;
        currentY += 25;

        // Activation Distance (numeric input)
        const activationDistanceControl = this.addNumericProperty(
          'Activation Dist.',
          enemySpawner.activationDistance || 400,
          currentY,
          100,
          1000,
          (value) => {
            // Update activation distance
            enemySpawner.activationDistance = Math.round(value);
            this.manager.setDirty(true);
          },
          10
        );
        controls['activationDistance'] = activationDistanceControl;
        currentY += 25;
        break;
      }
    }

    // Add apply button
    currentY += 20;
    const applyButton = this.scene.add
      .text(0, currentY, 'Apply Changes', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);

    // Make button interactive
    applyButton.setInteractive({ useHandCursor: true });

    // Apply changes on click
    applyButton.on('pointerdown', () => {
      // All changes are applied immediately for now
      console.log('[DesignStep] Applied property changes');

      // Show confirmation message
      const message = this.scene.add
        .text(0, currentY + 30, 'Changes applied!', {
          fontSize: '12px',
          color: '#00ff00',
        })
        .setOrigin(0.5);

      this.propertiesContainer.add(message);

      // Hide message after 2 seconds
      this.scene.time.delayedCall(2000, () => {
        message.destroy();
      });
    });

    this.propertiesContainer.add(applyButton);

    // Store the entity reference
    this.propertiesContainer.setData('entity', entity);

    // Show the properties panel
    this.propertiesContainer.setVisible(true);
  }

  /**
   * Add a read-only property to the properties panel
   * @param label The property label
   * @param value The property value
   * @param y The y position
   */
  private addReadOnlyProperty(label: string, value: string, y: number): void {
    // Property label
    const labelText = this.scene.add
      .text(-120, y, label + ':', {
        fontSize: '12px',
        color: '#aaaaaa',
      })
      .setOrigin(0, 0.5);

    // Property value
    const valueText = this.scene.add
      .text(-30, y, value, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.propertiesContainer.add([labelText, valueText]);
  }

  /**
   * Add a numeric property with increment/decrement controls to the properties panel
   * @param label The property label
   * @param value The property value
   * @param y The y position
   * @param min The minimum value
   * @param max The maximum value
   * @param onChange The callback to call when the value changes
   * @param step The step value for increments/decrements
   * @returns The input container
   */
  private addNumericProperty(
    label: string,
    value: number,
    y: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
    step: number = 1
  ): Phaser.GameObjects.Container {
    // Property label
    const labelText = this.scene.add
      .text(-120, y, label + ':', {
        fontSize: '12px',
        color: '#aaaaaa',
      })
      .setOrigin(0, 0.5);

    // Input container
    const inputContainer = this.scene.add.container(-30, y);

    // Value background
    const valueBg = this.scene.add.rectangle(0, 0, 80, 20, 0x555555);
    valueBg.setOrigin(0, 0.5);

    // Value text
    const valueText = this.scene.add
      .text(40, 0, value.toString(), {
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Decrement button
    const decButton = this.scene.add
      .text(10, 0, '-', {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    decButton.setInteractive({ useHandCursor: true });
    decButton.on('pointerdown', () => {
      // Decrement value
      const newValue = Math.max(min, parseFloat((value - step).toFixed(2)));
      value = newValue;
      valueText.setText(value.toString());
      onChange(value);
    });

    // Increment button
    const incButton = this.scene.add
      .text(70, 0, '+', {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    incButton.setInteractive({ useHandCursor: true });
    incButton.on('pointerdown', () => {
      // Increment value
      const newValue = Math.min(max, parseFloat((value + step).toFixed(2)));
      value = newValue;
      valueText.setText(value.toString());
      onChange(value);
    });

    // Add to input container
    inputContainer.add([valueBg, valueText, decButton, incButton]);

    // Add to properties container
    this.propertiesContainer.add([labelText, inputContainer]);

    return inputContainer;
  }

  /**
   * Add a dropdown property to the properties panel
   * @param label The property label
   * @param value The current value
   * @param options The dropdown options
   * @param y The y position
   * @param onChange The callback to call when the value changes
   * @returns The dropdown container
   */
  private addDropdownProperty(
    label: string,
    value: string,
    options: Array<{ value: string; label: string }>,
    y: number,
    onChange: (value: string) => void
  ): Phaser.GameObjects.Container {
    // Property label
    const labelText = this.scene.add
      .text(-120, y, label + ':', {
        fontSize: '12px',
        color: '#aaaaaa',
      })
      .setOrigin(0, 0.5);

    // Dropdown container
    const dropdownContainer = this.scene.add.container(-30, y);

    // Ensure we have default options
    if (options.length === 0) {
      options.push({ value: 'default', label: 'Default' });
    }

    // Get the label to display in the dropdown
    let displayLabel = 'Select...';
    if (options.length > 0) {
      // Find the selected option or use the first one
      const selectedOption = options.find((option) => option.value === value);
      if (selectedOption) {
        displayLabel = selectedOption.label;
      } else if (options[0]) {
        displayLabel = options[0].label;
      }
    }

    // Dropdown background
    const dropdownBg = this.scene.add.rectangle(0, 0, 100, 20, 0x555555);
    dropdownBg.setOrigin(0, 0.5);
    dropdownBg.setInteractive({ useHandCursor: true });

    // Dropdown text
    const dropdownText = this.scene.add
      .text(50, 0, displayLabel, {
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Dropdown arrow
    const dropdownArrow = this.scene.add
      .text(90, 0, '▼', {
        fontSize: '10px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Add to dropdown container
    dropdownContainer.add([dropdownBg, dropdownText, dropdownArrow]);

    // Options popup
    let optionsContainer: Phaser.GameObjects.Container | null = null;

    // Toggle dropdown on click
    dropdownBg.on('pointerdown', () => {
      if (optionsContainer) {
        // Close dropdown
        optionsContainer.destroy();
        optionsContainer = null;
      } else {
        // Open dropdown
        optionsContainer = this.scene.add.container(0, 15);

        // Create options
        options.forEach((option, index) => {
          const optionY = index * 20;

          // Option background
          const optionBg = this.scene.add.rectangle(0, optionY, 100, 20, 0x333333);
          optionBg.setOrigin(0, 0.5);
          optionBg.setInteractive({ useHandCursor: true });

          // Highlight on hover
          optionBg.on('pointerover', () => {
            optionBg.setFillStyle(0x666666);
          });

          optionBg.on('pointerout', () => {
            optionBg.setFillStyle(0x333333);
          });

          // Select option on click
          optionBg.on('pointerdown', () => {
            dropdownText.setText(option.label);
            onChange(option.value);

            // Close dropdown
            if (optionsContainer) {
              optionsContainer.destroy();
              optionsContainer = null;
            }
          });

          // Option text
          const optionText = this.scene.add
            .text(50, optionY, option.label, {
              fontSize: '12px',
              color: '#ffffff',
            })
            .setOrigin(0.5);

          if (optionsContainer) {
            optionsContainer.add([optionBg, optionText]);
          }
        });

        dropdownContainer.add(optionsContainer);
      }
    });

    // Add to properties container
    this.propertiesContainer.add([labelText, dropdownContainer]);

    return dropdownContainer;
  }

  /**
   * Get a display label for an entity type
   * @param type The entity type
   * @returns A display label
   */
  private getEntityTypeLabel(type: EntityType): string {
    switch (type) {
      case EntityType.ENEMY_SPAWNER:
        return 'Enemy Spawner';
      case EntityType.PLAYER_START:
        return 'Player Start Position';
      case EntityType.OBSTACLE:
        return 'Obstacle';
      case EntityType.POWERUP_SPAWNER:
        return 'Power-Up Spawner';
      case EntityType.DECORATION:
        return 'Decoration';
      case EntityType.TRIGGER:
        return 'Trigger';
      default:
        return 'Unknown Entity';
    }
  }

  /**
   * Clear all entities from the level
   */
  private clearEntities(): void {
    // Destroy all entity game objects
    this.entities.forEach((entity) => {
      entity.destroy();
    });

    // Clear entities array
    this.entities = [];

    // Clear selected entity
    // selection reference removed
  }

  /**
   * Update the placement preview with the current entity type
   * @param previewContainer The preview container to update
   * @param entityType The type of entity to preview
   */
  private updatePlacementPreview(
    previewContainer: Phaser.GameObjects.Container,
    entityType: string
  ): void {
    // Clear existing preview
    previewContainer.removeAll(true);

    // Store the current entity type
    previewContainer.setData('entityType', entityType);

    // Create a preview based on entity type
    let previewSprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    // Create a semi-transparent preview sprite
    if (entityType === EnemySpawnerType.FIGHTER) {
      previewSprite = this.scene.add.image(0, 0, 'enemy_fighter');
      previewSprite.setAlpha(0.7);
    } else if (entityType === EnemySpawnerType.SCOUT) {
      previewSprite = this.scene.add.image(0, 0, 'enemy_scout');
      previewSprite.setAlpha(0.7);
    } else if (entityType === EnemySpawnerType.CRUISER) {
      previewSprite = this.scene.add.image(0, 0, 'enemy_cruiser');
      previewSprite.setAlpha(0.7);
    } else if (entityType === EnemySpawnerType.SEEKER) {
      previewSprite = this.scene.add.image(0, 0, 'enemy_seeker');
      previewSprite.setAlpha(0.7);
    } else if (entityType === EnemySpawnerType.GUNSHIP) {
      previewSprite = this.scene.add.image(0, 0, 'enemy_gunship');
      previewSprite.setAlpha(0.7);
    } else {
      // Default preview
      previewSprite = this.scene.add.rectangle(0, 0, 32, 32, 0xff0000, 0.5);
    }

    // Add the preview sprite to the container
    previewContainer.add(previewSprite);

    // Add grid cell highlight
    const gridSize = this.manager.getGridSize();
    const highlight = this.scene.add.rectangle(0, 0, gridSize, gridSize, 0xffffff, 0.2);
    highlight.setStrokeStyle(1, 0xffffff, 0.8);

    // Add highlight first so it's behind the sprite
    previewContainer.addAt(highlight, 0);
  }

  /**
   * Place an entity at the specified position
   * @param entityType The type of entity to place
   * @param x The x position
   * @param y The y position
   * @returns The created entity container
   */
  private placeEntity(
    entityType: string,
    x: number,
    y: number
  ): Phaser.GameObjects.Container | undefined {
    console.log(`[DesignStep] Placing ${entityType} at (${x}, ${y})`);

    // Generate a unique ID for the entity
    const entityId = `entity_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

    // Create entity data based on type
    let entityData: BaseEntity;

    // Create entity data based on the entity type
    switch (entityType) {
      case EnemySpawnerType.FIGHTER:
      case EnemySpawnerType.SCOUT:
      case EnemySpawnerType.CRUISER:
      case EnemySpawnerType.SEEKER:
      case EnemySpawnerType.GUNSHIP: {
        // Create enemy spawner data
        entityData = {
          id: entityId,
          type: EntityType.ENEMY_SPAWNER,
          position: { x, y },
          rotation: 0,
          scale: 1,
          enemyType: entityType,
          spawnRate: 2, // Default: spawn every 2 seconds
          maxEnemies: 5, // Default: max 5 enemies at once
          activationDistance: 400, // Default: activate when player is within 400 pixels
        } as unknown as BaseEntity;
        break;
      }

      default: {
        console.error(`[DesignStep] Unknown entity type: ${entityType}`);
        return undefined;
      }
    }

    // Create the entity from data
    const entity = this.createEntityFromData(entityData);

    // Mark the level as having unsaved changes
    this.manager.setDirty(true);

    return entity;
  }

  /**
   * Save current progress
   */
  private saveProgress(): void {
    // If we don't have a level ID, create a new one
    if (!this.levelId) {
      // Create a new level with default settings
      const newLevel = this.service.createEmptyLevel({
        name: 'My Custom Level',
        author: 'Player',
        difficulty: 1,
        backgroundSpeed: 1,
        backgroundTexture: 'stars',
        musicTrack: 'default',
        version: '1.0.0',
      });

      // Save the new level to get an ID
      this.levelId = this.service.saveLevel(newLevel);

      // Update the manager with the new level ID
      this.manager.setCurrentLevelId(this.levelId);

      console.log(`[DesignStep] Created new level with ID: ${this.levelId}`);
    }

    console.log(`[DesignStep] Saving level: ${this.levelId}`);

    // Collect entity data
    const entities: BaseEntity[] = [];
    this.entities.forEach((entity) => {
      const entityData = entity.getData('entityData');
      if (entityData) {
        // Update position to match the current position of the entity
        entityData.position = {
          x: entity.x,
          y: entity.y,
        };

        // Update rotation
        entityData.rotation = entity.rotation;

        // Add to entities array
        entities.push(entityData);
      }
    });

    // Get the current level data or create a new one
    let levelData = this.service.loadLevel(this.levelId);

    if (!levelData) {
      console.log(`[DesignStep] Creating new level data for ID: ${this.levelId}`);
      // Create new level data
      levelData = this.service.createEmptyLevel({
        name: 'My Custom Level',
        author: 'Player',
        difficulty: 1,
      });
      levelData.id = this.levelId;
    }

    // Update entities and metadata
    levelData.entities = entities;
    if (levelData.metadata) {
      levelData.metadata.lastModified = Date.now();
    } else {
      levelData.metadata = {
        lastModified: Date.now(),
        createdAt: Date.now(),
        version: '1.0.0',
      };
    }

    // Add a player start position if not present
    const hasPlayerStart = entities.some((entity) => entity.type === EntityType.PLAYER_START);
    if (!hasPlayerStart) {
      console.log('[DesignStep] Adding default player start position');
      // Add a default player start at the bottom center
      const playerStartEntity: BaseEntity = {
        id: `player_start_${Date.now().toString(36)}`,
        type: EntityType.PLAYER_START,
        position: { x: 400, y: 500 },
        rotation: 0,
        scale: 1,
      };
      levelData.entities.push(playerStartEntity);
    }

    // Save the level and capture the stable ID
    const savedId = this.service.saveLevel(levelData);

    // Sync IDs in case the service resolved/assigned a different one
    this.levelId = savedId;
    this.manager.setCurrentLevelId(savedId);

    // Reset dirty flag
    this.manager.setDirty(false);

    // Show a confirmation message to the user
    this.showSavedMessage();

    console.log(`[DesignStep] Level saved: ${this.levelId} with ${entities.length} entities`);
  }

  /**
   * Update function called by the scene
   * @param _time Current time
   * @param delta Time since last update
   */
  update(_time: number, delta: number): void {
    // Update camera controls
    if (this.cameraControls) {
      this.cameraControls.update(delta);

      // Update grid when camera moves
      const gridGraphics = this.container.getData('gridGraphics') as Phaser.GameObjects.Graphics;
      if (gridGraphics && this.manager.isGridVisible()) {
        this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), true);
      }
    }
  }

  /**
   * Shows a message to confirm the level was saved
   */
  private showSavedMessage(): void {
    // Get scene references
    const scene = this.scene as Phaser.Scene;

    // Create a text message
    const text = scene.add
      .text(scene.cameras.main.centerX, scene.cameras.main.centerY - 100, 'Level Saved!', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5);

    // Add a simple animation
    scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /**
   * Creates a save button in the top toolbar
   */
  private createSaveButton(): void {
    // Get scene reference
    const scene = this.scene as Phaser.Scene;

    // Create a save button in the top-right corner
    const saveButton = scene.add.text(scene.scale.width - 160, 20, 'Save Level', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#4c7edb',
      padding: { x: 12, y: 8 },
      align: 'center',
      stroke: '#000000',
      strokeThickness: 1,
    });

    // Make the button interactive
    saveButton.setInteractive({ useHandCursor: true });

    // Add hover effect
    saveButton.on('pointerover', () => {
      saveButton.setStyle({ backgroundColor: '#6497ff' });
    });

    saveButton.on('pointerout', () => {
      saveButton.setStyle({ backgroundColor: '#4c7edb' });
    });

    // Add click handler
    saveButton.on('pointerdown', () => {
      this.saveProgress();
    });

    // Button should be above the step UI
    saveButton.setDepth(100);
  }
}
