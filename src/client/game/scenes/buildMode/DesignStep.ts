/**
 * DesignStep.ts
 * Second step in the Build Mode workflow
 * Handles placing and editing entities in the level
 */

import * as Phaser from 'phaser';
import { BuildModeManager, BuildModeTool } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { BaseEntity, EntityType, EnemySpawnerType } from '../../../../shared/types/buildMode';

/**
 * Design step in the Build Mode workflow
 * Provides UI for placing, editing, and arranging entities in the level
 */
export class DesignStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;
  // Reduced top offset to give grid more vertical space
  private readonly topUiOffset: number = 0;
  // Camera state for scroll-only navigation
  private isPanning: boolean = false;
  private panStart: { x: number; y: number; scrollX: number; scrollY: number } | null = null;
  private lastCamScroll = { x: 0, y: 0 };
  // Padding inside the top sticky bar to push content down
  private readonly topBarPadding: number = 24;

  // UI elements
  private container!: Phaser.GameObjects.Container;
  private toolbarContainer!: Phaser.GameObjects.Container;
  private entityPaletteContainer!: Phaser.GameObjects.Container;
  private paletteRevealButton?: Phaser.GameObjects.Container;
  private bgRect!: Phaser.GameObjects.Rectangle;
  private backNavText!: Phaser.GameObjects.Text;
  private nextNavText!: Phaser.GameObjects.Text;
  // Save button
  private saveButtonContainer?: Phaser.GameObjects.Container;
  private headerTitleText!: Phaser.GameObjects.Text;
  private saveButtonWidth: number = 116;
  private paletteOpen: boolean = true;
  private paletteMask?: Phaser.Display.Masks.GeometryMask;
  private paletteMaskGraphics?: Phaser.GameObjects.Graphics;

  // Status bar
  private statusBarContainer!: Phaser.GameObjects.Container;
  private statusBg!: Phaser.GameObjects.Rectangle;
  private statusTextCoords!: Phaser.GameObjects.Text;
  private statusTextSelection!: Phaser.GameObjects.Text;
  private statusTextDirty!: Phaser.GameObjects.Text;
  private statusDivider1?: Phaser.GameObjects.Rectangle;
  private statusDivider2?: Phaser.GameObjects.Rectangle;
  private statusSelectionListener: ((...args: unknown[]) => void) | undefined;
  private statusDirtyListener: ((...args: unknown[]) => void) | undefined;
  // Top sticky bar background
  private topBarBg?: Phaser.GameObjects.Rectangle;
  private readonly paletteWidth: number = 220;
  private readonly paletteHeight: number = 460;
  private paletteAnimating: boolean = false;
  // Set when a UI element (reveal/collapse) handled the click so scene shouldn't place
  private uiClickConsumed: boolean = false;
  // Toolbar (left panel) animation + reveal state
  private toolbarOpen: boolean = true;
  private toolbarAnimating: boolean = false;
  private toolbarRevealButton?: Phaser.GameObjects.Container;

  // Grid and camera
  private cameraControls!: Phaser.Cameras.Controls.SmoothedKeyControl;

  // Entity management
  private entities: Phaser.GameObjects.Container[] = [];

  // Level ID
  private levelId: string | undefined;

  // Resize handler
  private resizeHandler: (() => void) | undefined;
  private headerHeightHandler: ((height: number) => void) | undefined;

  // Keeps origin near bottom to maximize upward grid space
  private adjustCameraForUpwardSpace(): void {
    const cam = this.scene.cameras.main;
    const viewportHeight = this.scene.scale.height - (this.container ? this.container.y : 0);
    const margin = this.manager.getGridSize() * 2;
    const desiredScrollY = -viewportHeight + margin;
    cam.setScroll(cam.scrollX, desiredScrollY);
  }

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

    // Remove status bar listeners
    if (this.statusSelectionListener) {
      this.manager.off('selection:change', this.statusSelectionListener);
      this.statusSelectionListener = undefined;
    }
    if (this.statusDirtyListener) {
      this.manager.off('level:dirtyChange', this.statusDirtyListener);
      this.statusDirtyListener = undefined;
    }

    // Destroy sticky status bar if present
    if (this.statusBarContainer) {
      this.statusBarContainer.destroy(true);
      // Clear references
      // @ts-expect-error allow clearing
      this.statusBarContainer = undefined;
      // @ts-expect-error allow clearing
      this.statusBg = undefined;
      // @ts-expect-error allow clearing
      this.statusTextCoords = undefined;
      // @ts-expect-error allow clearing
      this.statusTextSelection = undefined;
      // @ts-expect-error allow clearing
      this.statusTextDirty = undefined;
    }

    // Remove resize listener
    if (this.resizeHandler) {
      this.scene.scale.off('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }

    // Remove header height listener
    if (this.headerHeightHandler) {
      this.scene.events.off('ui:header:heightChanged', this.headerHeightHandler);
      this.headerHeightHandler = undefined;
    }

    // Remove any active tool listeners
    this.removeDeleteListener();

    // Remove placement events
    this.scene.input.removeAllListeners('pointermove');
    this.scene.input.removeAllListeners('pointerdown');
    this.scene.input.removeAllListeners('pointerup');
    this.scene.input.removeAllListeners('wheel');
    this.scene.events.off('update', this.updateOnCameraMove, this);
  }

  /**
   * Create the UI for this step
   */
  private createUI(): void {
    // Determine header height from the parent scene if available
    const headerHeight =
      (this.scene.data && this.scene.data.get('headerHeight')) || this.topUiOffset;

    // Main container sits below header
    this.container = this.scene.add.container(0, headerHeight);

    // Background
    this.bgRect = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height - this.topUiOffset,
      0x222222
    );
    this.bgRect.setOrigin(0, 0);
    this.container.add(this.bgRect);

    // Create grid
    this.createGrid();

    // Grid controls removed (grid is fixed-size and always toggleable via code)

    // Create toolbar
    this.createToolbar();

    // Create entity palette (sticky on the right)
    this.createEntityPalette();

    // Initialize palette visibility from persisted state
    try {
      const persisted = window?.localStorage?.getItem('design.palette.open');
      if (persisted === 'false') {
        this.togglePalette(false, true);
      }
    } catch {
      // ignore storage issues
    }

    // Add step navigation buttons
    this.createStepNavigation();

    // Add save button
    this.createSaveButton();

    // Create top sticky bar background to match bottom status bar
    const initialHeaderHeight = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarHeight = Math.max(48, initialHeaderHeight);
    this.topBarBg = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      topBarHeight,
      0x1f2937,
      1
    );
    this.topBarBg.setOrigin(0, 0);
    this.topBarBg.setScrollFactor(0);
    this.topBarBg.setStrokeStyle(1, 0x374151, 1);
    this.topBarBg.setDepth(80); // Below title/save (100), above grid

    // Create bottom status bar
    this.createStatusBar();

    // Handle viewport resize to keep UI anchored and fill screen
    this.resizeHandler = () => {
      // Background fills available space
      this.bgRect.width = this.scene.scale.width;
      this.bgRect.height = this.scene.scale.height - this.container.y;

      // Reposition right-side UI panels (sticky palette)
      if (this.entityPaletteContainer) {
        this.entityPaletteContainer.x = this.scene.scale.width - this.paletteWidth / 2;
        const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        const topBarH = Math.max(48, headerH);
        this.entityPaletteContainer.y = topBarH + 20 + this.paletteHeight / 2;
      }
      // Reposition toolbar (sticky)
      if (this.toolbarContainer) {
        const headerHtb = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        const topBarHtb = Math.max(48, headerHtb);
        this.toolbarContainer.y = topBarHtb + 20;
        this.toolbarContainer.x = this.toolbarOpen ? 0 : -64;
      }
      // Reposition toolbar reveal button if visible
      if (this.toolbarRevealButton && this.toolbarRevealButton.visible) {
        const headerHtb = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        const topBarHtb = Math.max(48, headerHtb);
        this.toolbarRevealButton.x = 12;
        this.toolbarRevealButton.y = topBarHtb + 20 + 150;
      }
      if (this.paletteRevealButton && this.paletteRevealButton.visible) {
        this.paletteRevealButton.x = this.scene.scale.width - 12;
        const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        const topBarH = Math.max(48, headerH);
        this.paletteRevealButton.y = topBarH + 20 + this.paletteHeight / 2;
      }
      // update palette mask position
      if (this.paletteMaskGraphics && this.entityPaletteContainer) {
        this.paletteMaskGraphics.clear();
        this.paletteMaskGraphics.fillStyle(0xffffff);
        const maskWidth = this.paletteWidth - 40;
        const maskX2 = this.entityPaletteContainer.x - maskWidth / 2;
        const maskY2 = this.entityPaletteContainer.y - 140;
        this.paletteMaskGraphics.fillRect(maskX2, maskY2, maskWidth, 320);
      }

      // Navigation buttons are laid out inside the status bar now

      // Anchor status bar at bottom (sticky)
      if (this.statusBarContainer && this.statusBg) {
        const barHeight = 28;
        this.statusBarContainer.x = 0;
        this.statusBarContainer.y = this.scene.scale.height - barHeight;
        this.statusBg.width = this.scene.scale.width;
        this.statusBg.height = barHeight;
        this.layoutStatusBarText();
      }

      // Resize top sticky bar background
      if (this.topBarBg) {
        const h = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        this.topBarBg.width = this.scene.scale.width;
        this.topBarBg.height = Math.max(48, h);
        this.topBarBg.y = 0;
      }

      // Reposition save button in top-right (mirror title left padding)
      if (this.saveButtonContainer) {
        const currentHeader = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
        const leftPad = this.headerTitleText ? this.headerTitleText.x : 20;
        this.saveButtonContainer.x = this.scene.scale.width - (leftPad + this.saveButtonWidth / 2);
        this.saveButtonContainer.y = Math.max(
          16,
          Math.floor(currentHeader / 2) + this.topBarPadding
        );
      }

      // Redraw grid for new viewport size
      const gridGraphics = this.container.getData('gridGraphics') as
        | Phaser.GameObjects.Graphics
        | undefined;
      if (gridGraphics && this.manager.isGridVisible()) {
        this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), true);
      }
    };
    this.scene.scale.on('resize', this.resizeHandler);

    // Listen for header height changes to adjust our layout
    this.headerHeightHandler = (newHeight: number) => {
      this.container.y = newHeight;
      this.bgRect.height = this.scene.scale.height - this.container.y;

      // Nudge save button to stay aligned with header and mirror title padding
      if (this.saveButtonContainer) {
        this.saveButtonContainer.y = Math.max(16, Math.floor(newHeight / 2) + this.topBarPadding);
        const leftPad = this.headerTitleText ? this.headerTitleText.x : 20;
        this.saveButtonContainer.x = this.scene.scale.width - (leftPad + this.saveButtonWidth / 2);
      }

      // Reposition header title as well
      if (this.headerTitleText) {
        this.headerTitleText.y = Math.max(20, Math.floor(newHeight / 2) + this.topBarPadding);
      }

      // Update top sticky bar background height to reflect header changes
      if (this.topBarBg) {
        this.topBarBg.height = Math.max(48, newHeight || 0);
        this.topBarBg.width = this.scene.scale.width;
      }

      // Reposition toolbar under updated top bar height
      if (this.toolbarContainer) {
        const topBarHtb2 = Math.max(48, newHeight || 0);
        this.toolbarContainer.y = topBarHtb2 + 20;
        this.toolbarContainer.x = this.toolbarOpen ? 0 : -64;
      }
      if (this.toolbarRevealButton && this.toolbarRevealButton.visible) {
        const topBarHtb2 = Math.max(48, newHeight || 0);
        this.toolbarRevealButton.y = topBarHtb2 + 20 + 150;
      }

      // Redraw grid for new viewport
      const gridGraphics = this.container.getData('gridGraphics') as
        | Phaser.GameObjects.Graphics
        | undefined;
      if (gridGraphics && this.manager.isGridVisible()) {
        this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), true);
      }

      // Keep origin near bottom so we gain upward space
      this.adjustCameraForUpwardSpace();

      // Update status bar position after header change (sticky)
      if (this.statusBarContainer && this.statusBg) {
        const barHeight = 28;
        this.statusBarContainer.y = this.scene.scale.height - barHeight;
        this.statusBg.width = this.scene.scale.width;
        this.layoutStatusBarText();
      }
    };
    this.scene.events.on('ui:header:heightChanged', this.headerHeightHandler);
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

    const cam = this.scene.cameras.main;

    // Lock zoom: fixed scale, disable zoom inputs
    cam.setZoom(1);

    // Large world bounds to allow extensive panning range
    const WORLD_SIZE = 100000; // 100k px square world
    cam.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);

    // Key-based panning only (no zoom bindings)
    const controlConfig = {
      camera: cam,
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      acceleration: 0.08,
      drag: 0.003,
      maxSpeed: 1.2,
    } as Phaser.Types.Cameras.Controls.SmoothedKeyControlConfig;

    // Create camera controls
    this.cameraControls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

    // Start with more upward space visible
    this.adjustCameraForUpwardSpace();
    this.lastCamScroll = { x: cam.scrollX, y: cam.scrollY };

    // Mouse wheel pans instead of zooms (supports trackpads: horizontal + vertical)
    this.scene.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _gameObjects: unknown[], dx: number, dy: number) => {
        if (this.entityPaletteContainer?.visible && this.isPointerOverPalette(pointer)) {
          this.scrollPaletteContent(dy);
          return;
        }
        cam.setScroll(cam.scrollX + dx * 0.5, cam.scrollY + dy * 0.5);
      }
    );

    // Drag-to-pan (middle mouse, or PAN tool with left mouse)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Do not start panning when clicking over sticky UI
      if (this.isPointerOverAnyUi(pointer)) return;
      const panToolActive = this.manager.getCurrentTool() === BuildModeTool.PAN;
      if (pointer.middleButtonDown() || (panToolActive && pointer.leftButtonDown())) {
        this.isPanning = true;
        this.panStart = { x: pointer.x, y: pointer.y, scrollX: cam.scrollX, scrollY: cam.scrollY };
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPanning || !this.panStart) return;
      const dx = pointer.x - this.panStart.x;
      const dy = pointer.y - this.panStart.y;
      cam.setScroll(this.panStart.scrollX - dx, this.panStart.scrollY - dy);
    });

    this.scene.input.on('pointerup', () => {
      this.isPanning = false;
      this.panStart = null;
    });

    // Redraw grid only when camera moved
    this.scene.events.on('update', this.updateOnCameraMove, this);
  }

  // Redraw grid if camera scroll changes
  private updateOnCameraMove(): void {
    const cam = this.scene.cameras.main;
    const moved =
      (cam.scrollX | 0) !== (this.lastCamScroll.x | 0) ||
      (cam.scrollY | 0) !== (this.lastCamScroll.y | 0);
    if (!moved) return;
    this.lastCamScroll = { x: cam.scrollX, y: cam.scrollY };
    const gridGraphics = this.container?.getData('gridGraphics') as
      | Phaser.GameObjects.Graphics
      | undefined;
    if (gridGraphics && this.manager.isGridVisible()) {
      this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), true);
    }
    // Update coordinates in status bar as camera moves
    this.updateStatusBarCoords();
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
    // Offset grid upward so it fills behind the header/offset area
    gridGraphics.y = -this.container.y;
    gridGraphics.setDepth(0); // Ensure grid is below entities

    // Draw the grid
    this.updateGridDisplay(gridGraphics, gridSize, isGridVisible);

    // Store reference to the grid graphics
    this.container.add(gridGraphics);
    this.container.setData('gridGraphics', gridGraphics);

    // Set up event listeners for grid changes
    this.manager.on('grid:visibilityChange', (...args: unknown[]) => {
      const visible = Boolean(args[0]);
      this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), visible);
    });

    this.manager.on('grid:sizeChange', (...args: unknown[]) => {
      const size = Number(args[0]);
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
      height: this.scene.scale.height, // Draw across full scene height
    };

    // Calculate grid boundaries based on camera position
    const startX = Math.floor(camera.scrollX / gridSize) * gridSize - gridSize;
    const startY = Math.floor(camera.scrollY / gridSize) * gridSize - gridSize;
    const endX = startX + viewport.width + gridSize * 2;
    const endY = startY + viewport.height + gridSize * 2;

    // Subtle minor grid lines
    graphics.lineStyle(1, 0x3b4756, 0.5);

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

    // Subtle major grid lines (every 5 cells)
    const majorGridSize = gridSize * 5;
    const majorStartX = Math.floor(camera.scrollX / majorGridSize) * majorGridSize;
    const majorStartY = Math.floor(camera.scrollY / majorGridSize) * majorGridSize;

    graphics.lineStyle(1, 0x4a5568, 0.6);

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

    // No axes/origin for cleaner look matching mockup
  }

  // Grid control UI removed

  /**
   * Create the toolbar with editing tools
   */
  private createToolbar(): void {
    // Create toolbar container
    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    const toolbarWidth = 56;
    const toolbarHeight = 300;
    this.toolbarContainer = this.scene.add.container(0, topBarH + 20);
    this.toolbarContainer.setScrollFactor(0);
    this.toolbarContainer.setDepth(85);

    // Create toolbar background
    const toolbarBg = this.scene.add.rectangle(0, 0, toolbarWidth, toolbarHeight, 0x333333);
    toolbarBg.setOrigin(0, 0);
    toolbarBg.setStrokeStyle(1, 0x555555);
    this.toolbarContainer.add(toolbarBg);

    // Collapse handle, centered just outside the toolbar's right edge
    const collapse = this.scene.add.container(toolbarWidth + 9, toolbarHeight / 2);
    collapse.setScrollFactor(0);
    const collapseBg = this.scene.add.rectangle(0, 0, 18, 44, 0x111827, 0.9).setOrigin(0.5);
    collapseBg.setStrokeStyle(1, 0x2b3a4a, 1);
    const collapseIcon = this.scene.add
      .text(0, 0, '<', { fontSize: '16px', color: '#9ca3af' })
      .setOrigin(0.5);
    collapse.add([collapseBg, collapseIcon]);
    collapse.setInteractive(
      new Phaser.Geom.Rectangle(-9, -22, 18, 44),
      Phaser.Geom.Rectangle.Contains
    );
    collapse.on('pointerover', () => collapseBg.setFillStyle(0x1f2937, 1));
    collapse.on('pointerout', () => collapseBg.setFillStyle(0x111827, 0.9));
    collapse.on('pointerdown', () => this.toggleToolbar(false));
    this.toolbarContainer.add(collapse);

    // Create tool buttons
    const tools = [
      { tool: BuildModeTool.SELECT, icon: '👆', label: 'Select' },
      { tool: BuildModeTool.PLACE, icon: '➕', label: 'Place' },
      { tool: BuildModeTool.MOVE, icon: '✋', label: 'Move' },
      { tool: BuildModeTool.DELETE, icon: '❌', label: 'Delete' },
      { tool: BuildModeTool.PAN, icon: '👁️', label: 'Pan' },
    ];

    // Keep track of tool button backgrounds
    const toolButtonBackgrounds: { [key: string]: Phaser.GameObjects.Rectangle } = {};

    tools.forEach((toolInfo, index) => {
      const y = 20 + index * 50;

      // Button background for selection indicator
      const buttonBg = this.scene.add.rectangle(28, y, 44, 44, 0x333333);
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
        .text(28, y, toolInfo.icon, {
          fontSize: '24px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      // Make button interactive
      toolButton.setInteractive({ useHandCursor: true });

      // Add hover effects with delayed tooltip (~1s)
      toolButton.on('pointerover', () => {
        toolButton.setTint(0x00ffff);
        buttonBg.setStrokeStyle(2, 0x00ffff, 1);
        // Add a subtle hover background to improve affordance if not selected
        if (this.manager.getCurrentTool() !== toolInfo.tool) {
          buttonBg.setFillStyle(0x3a3a3a);
        }

        // Schedule tooltip after a delay
        const timer = this.scene.time.delayedCall(1000, () => {
          // Create tooltip as a child of the toolbar container so it aligns to the icon
          const tooltip = this.scene.add
            .text(60, y, toolInfo.label, {
              fontSize: '12px',
              backgroundColor: '#1f2937',
              padding: { x: 6, y: 4 },
              color: '#e5e7eb',
            })
            .setOrigin(0, 0.5);
          // Keep tooltip in the same (sticky) coordinate space
          this.toolbarContainer.add(tooltip);
          toolButton.setData('tooltip', tooltip);
        });
        toolButton.setData('tooltipTimer', timer);
      });

      toolButton.on('pointerout', () => {
        toolButton.clearTint();

        // Only clear stroke if not selected
        if (this.manager.getCurrentTool() !== toolInfo.tool) {
          buttonBg.setStrokeStyle(2, 0x555555, 0);
          // Restore base background when not hovered and not selected
          buttonBg.setFillStyle(0x333333);
        }

        // Cancel delayed tooltip and remove if shown
        const t: Phaser.Time.TimerEvent | undefined = toolButton.getData('tooltipTimer');
        if (t && !t.hasDispatched) t.remove(false);
        toolButton.setData('tooltipTimer', undefined);
        const tooltip = toolButton.getData('tooltip') as Phaser.GameObjects.Text | undefined;
        if (tooltip) tooltip.destroy();
      });

      // Set tool on click
      toolButton.on('pointerdown', () => {
        // Update the tool
        this.manager.setCurrentTool(toolInfo.tool);

        // Dismiss tooltip immediately on click
        const t: Phaser.Time.TimerEvent | undefined = toolButton.getData('tooltipTimer');
        if (t && !t.hasDispatched) t.remove(false);
        toolButton.setData('tooltipTimer', undefined);
        const tooltip = toolButton.getData('tooltip') as Phaser.GameObjects.Text | undefined;
        if (tooltip) tooltip.destroy();

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
    this.manager.on('tool:change', (...args: unknown[]) => {
      const tool = args[0] as BuildModeTool;
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

    // Ensure entire toolbar and its children are non-scrolling for correct input mapping
    this.setScrollFactorDeep(this.toolbarContainer, 0);

    // Restore persisted toolbar open state
    try {
      const persisted = window?.localStorage?.getItem('design.toolbar.open');
      if (persisted === 'false') {
        this.toggleToolbar(false, true);
      }
    } catch {
      // ignore
    }
  }

  // Toggle left toolbar (hugging left), mirroring palette animation
  private toggleToolbar(forceOpen?: boolean, immediate: boolean = false): void {
    if (this.toolbarAnimating) return;
    const newState = forceOpen !== undefined ? forceOpen : !this.toolbarOpen;
    this.toolbarOpen = newState;

    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    const openX = 0; // hugs left edge
    const closedX = -64; // hide to the left beyond its width (~56) plus margin
    const targetY = topBarH + 20;
    if (!this.toolbarContainer) return;
    this.toolbarContainer.y = targetY;

    const ensureReveal = () => {
      if (!this.toolbarRevealButton) {
        const btn = this.scene.add.container(12, targetY + 150);
        btn.setScrollFactor(0);
        const bg = this.scene.add.rectangle(0, 0, 18, 44, 0x111827, 0.9).setOrigin(0.5);
        bg.setStrokeStyle(1, 0x2b3a4a, 1);
        const icon = this.scene.add
          .text(0, 0, '>', { fontSize: '16px', color: '#9ca3af' })
          .setOrigin(0.5);
        btn.add([bg, icon]);
        btn.setInteractive(
          new Phaser.Geom.Rectangle(-9, -22, 18, 44),
          Phaser.Geom.Rectangle.Contains
        );
        btn.on('pointerover', () => bg.setFillStyle(0x1f2937, 1));
        btn.on('pointerout', () => bg.setFillStyle(0x111827, 0.9));
        btn.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _lx: number,
            _ly: number,
            event: Phaser.Types.Input.EventData
          ) => {
            this.uiClickConsumed = true;
            if (event && (event as unknown as { stopPropagation?: () => void }).stopPropagation) {
              (event as unknown as { stopPropagation?: () => void }).stopPropagation!();
            }
            this.toggleToolbar(true);
          }
        );
        this.toolbarRevealButton = btn;
      }
      this.toolbarRevealButton!.x = 12;
      this.toolbarRevealButton!.y = targetY + 150;
    };

    if (immediate) {
      if (newState) {
        this.toolbarContainer.setVisible(true);
        this.toolbarContainer.x = openX;
        this.toolbarContainer.y = targetY;
      } else {
        this.toolbarContainer.x = closedX;
        this.toolbarContainer.setVisible(false);
        ensureReveal();
      }
      try {
        window?.localStorage?.setItem('design.toolbar.open', String(newState));
      } catch {
        /* ignore */
      }
      return;
    }

    this.toolbarAnimating = true;
    if (newState) {
      this.toolbarContainer.setVisible(true);
      this.toolbarRevealButton?.setVisible(false);
      this.scene.tweens.add({
        targets: this.toolbarContainer,
        x: openX,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.toolbarAnimating = false;
        },
      });
    } else {
      ensureReveal();
      this.scene.tweens.add({
        targets: this.toolbarContainer,
        x: closedX,
        duration: 180,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.toolbarContainer.setVisible(false);
          this.toolbarRevealButton!.setVisible(true);
          this.toolbarAnimating = false;
        },
      });
    }
    try {
      window?.localStorage?.setItem('design.toolbar.open', String(newState));
    } catch {
      /* ignore */
    }
  }

  /**
   * Create the entity palette for selecting entities to place
   */
  private createEntityPalette(): void {
    // Create entity palette container - right drawer sticky to viewport
    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    this.entityPaletteContainer = this.scene.add.container(
      this.scene.scale.width - this.paletteWidth / 2,
      topBarH + 20 + this.paletteHeight / 2
    );
    this.entityPaletteContainer.setScrollFactor(0);
    this.entityPaletteContainer.setDepth(90);

    // Create palette background with clean contrast
    const paletteBg = this.scene.add.rectangle(
      0,
      0,
      this.paletteWidth,
      this.paletteHeight,
      0x1f2937,
      0.98
    );
    paletteBg.setOrigin(0.5);
    paletteBg.setStrokeStyle(1, 0x2b3a4a);
    this.entityPaletteContainer.add(paletteBg);

    // Left divider between canvas and drawer
    const divider = this.scene.add.rectangle(
      -this.paletteWidth / 2,
      0,
      1,
      this.paletteHeight,
      0x2b3a4a,
      0.8
    );
    divider.setOrigin(0.5);
    this.entityPaletteContainer.add(divider);

    // Add a header bar
    const headerBg = this.scene.add.rectangle(
      0,
      -this.paletteHeight / 2 + 40,
      this.paletteWidth,
      40,
      0x111827,
      1
    );
    headerBg.setOrigin(0.5);
    this.entityPaletteContainer.add(headerBg);

    // Title with better visibility
    const title = this.scene.add
      .text(0, -this.paletteHeight / 2 + 40, 'ENTITY PALETTE', {
        fontSize: '16px',
        color: '#e5e7eb',
        fontStyle: 'bold',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#00000088',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5);
    this.entityPaletteContainer.add(title);

    // Keep a single list layout for simplicity like the mockup
    this.createEnemyButtons(true);

    // Create a simple geometry mask for scrollable content area
    this.paletteMaskGraphics = this.scene.add.graphics();
    this.paletteMaskGraphics.fillStyle(0xffffff);
    // Mask area below tabs: 300x320
    const maskWidth = this.paletteWidth - 40;
    const maskX = this.entityPaletteContainer.x - maskWidth / 2;
    const maskY = this.entityPaletteContainer.y - 140;
    this.paletteMaskGraphics.fillRect(maskX, maskY, maskWidth, 320);
    this.paletteMask = this.paletteMaskGraphics.createGeometryMask();
    this.paletteMaskGraphics.setVisible(false);
    this.paletteMaskGraphics.setScrollFactor(0);
    // Apply mask to known category containers
    ['enemies', 'obstacles', 'powerups', 'decorations'].forEach((id) => {
      const c = this.entityPaletteContainer.getByName(id) as Phaser.GameObjects.Container;
      if (c && this.paletteMask) c.setMask(this.paletteMask);
    });

    // Collapse button on the palette edge
    const collapse = this.scene.add.container(-this.paletteWidth / 2, 0);
    collapse.setScrollFactor(0);
    const collapseBg = this.scene.add.rectangle(0, 0, 18, 44, 0x111827, 0.9).setOrigin(0.5);
    collapseBg.setStrokeStyle(1, 0x2b3a4a, 1);
    const collapseIcon = this.scene.add
      .text(0, 0, '>', { fontSize: '16px', color: '#9ca3af' })
      .setOrigin(0.5);
    collapse.add([collapseBg, collapseIcon]);
    collapse.setInteractive(
      new Phaser.Geom.Rectangle(-9, -22, 18, 44),
      Phaser.Geom.Rectangle.Contains
    );
    collapse.on('pointerover', () => collapseBg.setFillStyle(0x1f2937, 1));
    collapse.on('pointerout', () => collapseBg.setFillStyle(0x111827, 0.9));
    collapse.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData
      ) => {
        this.uiClickConsumed = true;
        if (event && (event as unknown as { stopPropagation?: () => void }).stopPropagation) {
          (event as unknown as { stopPropagation?: () => void }).stopPropagation!();
        }
        this.togglePalette(false);
      }
    );
    this.entityPaletteContainer.add(collapse);

    // Ensure the entire palette (and children) are non-scrolling for correct input mapping
    this.setScrollFactorDeep(this.entityPaletteContainer, 0);
  }

  // Utility to set scrollFactor on a container and all descendants
  private setScrollFactorDeep(container: Phaser.GameObjects.Container, factor: number): void {
    container.setScrollFactor(factor);
    const list = container.list as Phaser.GameObjects.GameObject[];
    for (const child of list) {
      if (child instanceof Phaser.GameObjects.Container) {
        this.setScrollFactorDeep(child, factor);
      } else if (
        child instanceof Phaser.GameObjects.Text ||
        child instanceof Phaser.GameObjects.Image ||
        child instanceof Phaser.GameObjects.Rectangle ||
        child instanceof Phaser.GameObjects.Graphics ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child as any).setScrollFactor
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child as any).setScrollFactor(factor);
      }
    }
  }

  /**
   * Create enemy entity buttons
   */
  private createEnemyButtons(simpleList: boolean = false): void {
    // Create container for enemy buttons with consistent positioning
    const enemiesContainer = this.scene.add.container(0, -120);
    enemiesContainer.setName('enemies');
    this.entityPaletteContainer.add(enemiesContainer);

    if (!simpleList) {
      const subtitle = this.scene.add
        .text(0, -50, 'SELECT ENEMY TYPE', {
          fontSize: '14px',
          color: '#aaaaaa',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      enemiesContainer.add(subtitle);
      const separatorLine = this.scene.add.graphics();
      separatorLine.lineStyle(1, 0x666666, 0.8);
      separatorLine.lineBetween(-100, -35, 100, -35);
      enemiesContainer.add(separatorLine);
    }

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

    // Create a simple, list-style UI for enemy selection
    enemies.forEach((enemy, index) => {
      const y = -120 + index * 60;
      const row = this.scene.add.container(0, y);
      enemiesContainer.add(row);

      const rowBg = this.scene.add.rectangle(0, 0, this.paletteWidth - 40, 44, 0x111827, 0.0001);
      rowBg.setOrigin(0.5);
      rowBg.setInteractive({ useHandCursor: true });

      // Sleek icon: smaller circle with subtle stroke for a modern look
      const iconCircle = this.scene.add.circle(-this.paletteWidth / 2 + 36, 0, 10, enemy.color, 1);

      const label = this.scene.add
        .text(-this.paletteWidth / 2 + 56, 0, enemy.name, { fontSize: '14px', color: '#e5e7eb' })
        .setOrigin(0, 0.5);

      rowBg.on('pointerover', () => {
        rowBg.setFillStyle(0x374151, 0.25);
      });
      rowBg.on('pointerout', () => {
        rowBg.setFillStyle(0x111827, 0.0001);
      });
      rowBg.on('pointerdown', () => {
        this.manager.setCurrentEntityType(enemy.type);
        this.manager.setCurrentTool(BuildModeTool.PLACE);
        console.log(`[DesignStep] Selected enemy type: ${enemy.type}`);
      });

      row.add([rowBg, iconCircle, label]);
    });

    // Set initial selection to first enemy type
    if (enemies.length > 0 && enemies[0]) {
      this.manager.setCurrentEntityType(enemies[0].type);
    }
  }

  // Placeholder textures are now created in the BuildModeScene

  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Back button (to Setup step)
    const backButton = this.scene.add
      .text(this.scene.scale.width - 200, this.scene.scale.height - 40, '< Back', {
        fontSize: '14px',
        color: '#e5e7eb',
      })
      .setOrigin(0, 0.5);
    this.backNavText = backButton;
    backButton.setScrollFactor(0);

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
      .text(this.scene.scale.width - 80, this.scene.scale.height - 40, 'Test ▶', {
        fontSize: '14px',
        color: '#93c5fd',
      })
      .setOrigin(0, 0.5);
    this.nextNavText = nextButton;
    nextButton.setScrollFactor(0);

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

    // Add header title similar to mockup (top-left)
    if (!this.headerTitleText) {
      const headerHeight = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
      this.headerTitleText = this.scene.add
        .text(
          20,
          Math.max(20, Math.floor(headerHeight / 2) + this.topBarPadding),
          'Build your level',
          {
            fontSize: '22px',
            color: '#e5e7eb',
            fontStyle: 'bold',
          }
        )
        .setOrigin(0, 0.5);
      this.headerTitleText.setDepth(100);
      // Keep the header sticky relative to camera
      this.headerTitleText.setScrollFactor(0);
    }
  }

  /**
   * Set up event handlers
   */
  private setupEvents(): void {
    // Tool change event
    this.manager.events.on('tool:change', this.handleToolChange, this);

    // Entity type change event
    this.manager.events.on('entityType:change', this.handleEntityTypeChange, this);

    // Selection change no longer toggles a properties drawer

    // Set up input events for entity placement
    this.setupPlacementEvents();

    // Toggle minimal UI with 'H' key to maximize grid space
    const kb = this.scene.input.keyboard;
    if (kb) {
      const hKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.H);
      hKey.on('down', () => {
        const newVisible = !(this.toolbarContainer?.visible ?? true);
        this.toolbarContainer?.setVisible(newVisible);
        this.entityPaletteContainer?.setVisible(newVisible);
        // No properties panel to toggle
        this.saveButtonContainer?.setVisible(newVisible);
        this.statusBarContainer?.setVisible(newVisible);

        // Redraw grid (not strictly necessary but keeps UX consistent)
        const gridGraphics = this.container.getData('gridGraphics') as
          | Phaser.GameObjects.Graphics
          | undefined;
        if (gridGraphics && this.manager.isGridVisible()) {
          this.updateGridDisplay(gridGraphics, this.manager.getGridSize(), true);
        }
      });

      // Tool shortcuts 1–6
      const keyMap: Array<{ code: number; tool: BuildModeTool }> = [
        { code: Phaser.Input.Keyboard.KeyCodes.ONE, tool: BuildModeTool.SELECT },
        { code: Phaser.Input.Keyboard.KeyCodes.TWO, tool: BuildModeTool.PLACE },
        { code: Phaser.Input.Keyboard.KeyCodes.THREE, tool: BuildModeTool.MOVE },
        { code: Phaser.Input.Keyboard.KeyCodes.FIVE, tool: BuildModeTool.DELETE },
        { code: Phaser.Input.Keyboard.KeyCodes.SIX, tool: BuildModeTool.PAN },
      ];
      keyMap.forEach(({ code, tool }) => {
        const k = kb.addKey(code);
        k.on('down', () => this.manager.setCurrentTool(tool));
      });

      // Toggle palette with T
      const tKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T);
      tKey.on('down', () => this.togglePalette());

      // Center camera on origin with F
      const fKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
      fKey.on('down', () => {
        const cam = this.scene.cameras.main;
        cam.centerOn(0, 0);
      });

      // Keyboard shortcuts: Ctrl+S save, G toggle grid, C center selection
      if (this.scene.input.keyboard)
        this.scene.input.keyboard.on('keydown', (ev: KeyboardEvent) => {
          const key = ev.key.toLowerCase();
          if ((ev.ctrlKey || ev.metaKey) && key === 's') {
            ev.preventDefault();
            this.saveProgress();
            this.updateStatusBarDirty();
          } else if (!ev.ctrlKey && !ev.metaKey && key === 'g') {
            this.manager.setGridVisible(!this.manager.isGridVisible());
          } else if (!ev.ctrlKey && !ev.metaKey && key === 'c') {
            this.centerCameraOnSelection();
          }
        });

      // Shortcut P previously toggled properties panel; now unused
    }
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
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiClickConsumed) {
        this.uiClickConsumed = false;
        return;
      }
      // Update status bar world coordinates
      this.updateStatusBarCoords(pointer);
      // Only show preview when PLACE tool is active and not over UI
      if (
        this.manager.getCurrentTool() !== BuildModeTool.PLACE ||
        this.isPointerOverAnyUi(pointer)
      ) {
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
      if (this.uiClickConsumed) {
        this.uiClickConsumed = false;
        return;
      }
      // Only place when using PLACE tool with left click
      if (
        this.manager.getCurrentTool() !== BuildModeTool.PLACE ||
        pointer.button !== 0 ||
        pointer.middleButtonDown() ||
        pointer.rightButtonDown()
      ) {
        return;
      }
      // Do not place if clicking over any sticky UI (palette, toolbar, bars, reveal handles)
      if (this.isPointerOverAnyUi(pointer)) {
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

      // After placement, mark dirty text and selection count
      this.updateStatusBarDirty();
    });
  }

  // Returns true if pointer is over any non-grid UI element
  private isPointerOverAnyUi(pointer: Phaser.Input.Pointer): boolean {
    // Right palette body
    if (this.entityPaletteContainer?.visible && this.isPointerOverPalette(pointer)) return true;
    // Right palette reveal handle
    if (this.isPointerOverRevealButton(this.paletteRevealButton, pointer, 9, 22)) return true;
    // Left toolbar body
    if (this.isPointerOverToolbar(pointer)) return true;
    // Left toolbar reveal handle
    if (this.isPointerOverRevealButton(this.toolbarRevealButton, pointer, 9, 22)) return true;
    // Top bar and status bar
    if (this.isPointerOverTopBar(pointer)) return true;
    if (this.isPointerOverStatusBar(pointer)) return true;
    return false;
  }

  private isPointerOverToolbar(pointer: Phaser.Input.Pointer): boolean {
    if (!this.toolbarContainer?.visible) return false;
    const b = this.toolbarContainer.getBounds();
    return pointer.x >= b.x && pointer.x <= b.right && pointer.y >= b.y && pointer.y <= b.bottom;
  }

  private isPointerOverTopBar(pointer: Phaser.Input.Pointer): boolean {
    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    return pointer.y <= topBarH;
  }

  private isPointerOverStatusBar(pointer: Phaser.Input.Pointer): boolean {
    if (!this.statusBarContainer || !this.statusBg) return false;
    const barTop = this.statusBarContainer.y;
    const barBottom = barTop + this.statusBg.height;
    return pointer.y >= barTop && pointer.y <= barBottom;
  }

  private isPointerOverRevealButton(
    btn: Phaser.GameObjects.Container | undefined,
    pointer: Phaser.Input.Pointer,
    halfW: number,
    halfH: number
  ): boolean {
    if (!btn || !btn.visible) return false;
    const cx = btn.x;
    const cy = btn.y;
    return (
      pointer.x >= cx - halfW &&
      pointer.x <= cx + halfW &&
      pointer.y >= cy - halfH &&
      pointer.y <= cy + halfH
    );
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

  // Create bottom status bar (sticky, non-scrolling)
  private createStatusBar(): void {
    const barHeight = 28;
    // Place on the scene root so it doesn't scroll with the camera/container
    this.statusBarContainer = this.scene.add.container(0, this.scene.scale.height - barHeight);
    // Ensure the status bar remains fixed relative to the camera
    this.statusBarContainer.setScrollFactor(0);

    this.statusBg = this.scene.add.rectangle(0, 0, this.scene.scale.width, barHeight, 0x1f2937);
    this.statusBg.setOrigin(0, 0);
    this.statusBg.setStrokeStyle(1, 0x374151, 1);
    // Prevent status bar background from parallaxing
    this.statusBg.setScrollFactor(0);
    this.statusBarContainer.add(this.statusBg);

    this.statusTextCoords = this.scene.add
      .text(10, Math.floor(barHeight / 2), '(0, 0)', {
        fontSize: '12px',
        color: '#e5e7eb',
      })
      .setOrigin(0, 0.5);
    this.statusTextCoords.setScrollFactor(0);

    this.statusTextSelection = this.scene.add
      .text(180, Math.floor(barHeight / 2), 'Sel: 0', {
        fontSize: '12px',
        color: '#e5e7eb',
      })
      .setOrigin(0, 0.5);
    this.statusTextSelection.setScrollFactor(0);

    this.statusTextDirty = this.scene.add
      .text(260, Math.floor(barHeight / 2), 'Saved', {
        fontSize: '12px',
        color: '#10b981',
      })
      .setOrigin(0, 0.5);
    this.statusTextDirty.setScrollFactor(0);

    this.statusBarContainer.add([
      this.statusTextCoords,
      this.statusTextSelection,
      this.statusTextDirty,
    ]);

    // Create subtle vertical dividers (initially off-screen; laid out later)
    this.statusDivider1 = this.scene.add
      .rectangle(0, 0, 1, barHeight - 8, 0x374151, 0.9)
      .setOrigin(0.5);
    this.statusDivider1.setScrollFactor(0);
    this.statusDivider2 = this.scene.add
      .rectangle(0, 0, 1, barHeight - 8, 0x374151, 0.9)
      .setOrigin(0.5);
    this.statusDivider2.setScrollFactor(0);
    this.statusBarContainer.add([this.statusDivider1, this.statusDivider2]);

    // If navigation buttons were created earlier, move them into the status bar
    if (this.backNavText) {
      // Remove from previous parent if necessary and add to status bar
      const parent = (
        this.backNavText as Phaser.GameObjects.GameObject & {
          parentContainer?: Phaser.GameObjects.Container;
        }
      ).parentContainer;
      if (parent) parent.remove(this.backNavText, false);
      this.backNavText.setScrollFactor(0);
      this.backNavText.setOrigin(1, 0.5);
      this.backNavText.setStyle({ fontSize: '14px' });
      this.statusBarContainer.add(this.backNavText);
    }
    if (this.nextNavText) {
      const parent = (
        this.nextNavText as Phaser.GameObjects.GameObject & {
          parentContainer?: Phaser.GameObjects.Container;
        }
      ).parentContainer;
      if (parent) parent.remove(this.nextNavText, false);
      this.nextNavText.setScrollFactor(0);
      this.nextNavText.setOrigin(1, 0.5);
      this.nextNavText.setStyle({ fontSize: '14px' });
      this.statusBarContainer.add(this.nextNavText);
    }

    // Listen for selection changes and dirty state
    this.statusSelectionListener = (...args: unknown[]) => {
      const ids = (args[0] as string[]) || [];
      this.statusTextSelection.setText(`Sel: ${ids.length}`);
    };
    this.manager.on('selection:change', this.statusSelectionListener);
    this.statusDirtyListener = (..._args: unknown[]) => {
      this.updateStatusBarDirty();
    };
    this.manager.on('level:dirtyChange', this.statusDirtyListener);

    // Initialize
    this.updateStatusBarCoords();
    this.updateStatusBarDirty();
    this.layoutStatusBarText();
  }

  private layoutStatusBarText(): void {
    const padding = 10;
    const barHeight = this.statusBg ? this.statusBg.height : 28;
    const centerY = Math.floor(barHeight / 2);

    // Left side text
    this.statusTextCoords.x = padding;
    this.statusTextCoords.y = centerY;
    this.statusTextSelection.x = this.statusTextCoords.x + this.statusTextCoords.width + 24;
    this.statusTextSelection.y = centerY;

    // Right side items: Next (far right), Back to its left, Dirty left of those
    const rightEdge = this.scene.scale.width - padding;

    if (this.nextNavText) {
      this.nextNavText.x = rightEdge; // right-anchored (origin 1,0.5)
      this.nextNavText.y = centerY;
    }

    if (this.backNavText) {
      const nextLeft = this.nextNavText
        ? this.nextNavText.x - this.nextNavText.width - 12
        : rightEdge;
      this.backNavText.x = nextLeft; // right-anchored
      this.backNavText.y = centerY;
    }

    const anchorRightForDirty = this.backNavText
      ? this.backNavText.x - this.backNavText.width - 16
      : this.nextNavText
        ? this.nextNavText.x - this.nextNavText.width - 16
        : rightEdge;
    this.statusTextDirty.x = anchorRightForDirty - this.statusTextDirty.width; // left-anchored
    this.statusTextDirty.y = centerY;

    // Dividers: between Dirty|Back and Back|Next
    if (this.statusDivider1) {
      const dirtyRight = this.statusTextDirty.x + this.statusTextDirty.width;
      const backLeft = this.backNavText
        ? this.backNavText.x - this.backNavText.width
        : this.nextNavText
          ? this.nextNavText.x - this.nextNavText.width
          : rightEdge;
      this.statusDivider1.x = (dirtyRight + backLeft) / 2;
      this.statusDivider1.y = centerY;
    }
    if (this.statusDivider2) {
      if (this.backNavText && this.nextNavText) {
        const backRight = this.backNavText.x; // right-anchored
        const nextLeft = this.nextNavText.x - this.nextNavText.width;
        this.statusDivider2.x = (backRight + nextLeft) / 2;
        this.statusDivider2.y = centerY;
        this.statusDivider2.setVisible(true);
      } else {
        this.statusDivider2.setVisible(false);
      }
    }
  }

  private updateStatusBarCoords(pointer?: Phaser.Input.Pointer): void {
    const cam = this.scene.cameras.main;
    const p = pointer
      ? cam.getWorldPoint(pointer.x, pointer.y)
      : cam.getWorldPoint(this.scene.input.activePointer.x, this.scene.input.activePointer.y);
    const gx = this.manager.getGridSize();
    const snappedX = Math.round(p.x / gx) * gx;
    const snappedY = Math.round(p.y / gx) * gx;
    this.statusTextCoords.setText(`(${snappedX}, ${snappedY})`);
    this.layoutStatusBarText();
  }

  private updateStatusBarDirty(): void {
    const dirty = this.manager.isDirty();
    if (dirty) {
      this.statusTextDirty.setText('Unsaved');
      this.statusTextDirty.setColor('#f59e0b');
    } else {
      this.statusTextDirty.setText('Saved');
      this.statusTextDirty.setColor('#10b981');
    }
    this.layoutStatusBarText();
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
    // Only process left clicks with DELETE tool and ignore UI clicks
    if (
      this.manager.getCurrentTool() !== BuildModeTool.DELETE ||
      pointer.button !== 0 ||
      pointer.middleButtonDown() ||
      pointer.rightButtonDown() ||
      this.isPointerOverAnyUi(pointer)
    ) {
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

    // Set rotation if specified (allow 0)
    if (typeof entityData.rotation === 'number') {
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

    // Properties panel removed; selection only updates status bar
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
      // No properties panel; nothing to hide
    }
  }

  // All properties-related UI methods removed

  // Dropdowns and entity-type labels were for the properties panel; removed

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
    const scene = this.scene as Phaser.Scene;
    const headerHeight = (scene.data && scene.data.get('headerHeight')) || 0;

    const y = Math.max(16, Math.floor(headerHeight / 2) + this.topBarPadding);

    // Create label first to measure width
    const label = scene.add
      .text(0, 0, 'Save Level', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    label.setScrollFactor(0);
    const horizontalPadding = 24; // 12px left/right
    const computedWidth = Math.ceil(label.width + horizontalPadding);
    this.saveButtonWidth = computedWidth;

    const leftPad = this.headerTitleText ? this.headerTitleText.x : 20;
    const x = scene.scale.width - (leftPad + this.saveButtonWidth / 2);

    // Button group: rounded rect + label
    const btnContainer = scene.add.container(x, y);
    btnContainer.setScrollFactor(0);
    const bg = scene.add.rectangle(0, 0, this.saveButtonWidth, 34, 0x3b82f6, 1);
    bg.setScrollFactor(0);
    bg.setStrokeStyle(1, 0x1f2937, 1);
    bg.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true, pixelPerfect: false });

    // Add to container (bg behind label)
    btnContainer.add([bg, label]);
    btnContainer.setDepth(100);

    // Hover/press states
    bg.on('pointerover', () => bg.setFillStyle(0x60a5fa, 1));
    bg.on('pointerout', () => bg.setFillStyle(0x3b82f6, 1));
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x2563eb, 1);
      this.saveProgress();
      this.updateStatusBarDirty();
    });
    bg.on('pointerup', () => bg.setFillStyle(0x60a5fa, 1));

    // Keep references for later layout
    this.saveButtonContainer = btnContainer;
  }

  // Center camera on the average position of current selection (fallback to origin)
  private centerCameraOnSelection(): void {
    const ids = this.manager.getSelectedEntityIds();
    if (!ids.length) {
      this.scene.cameras.main.centerOn(0, 0);
      return;
    }
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    this.entities.forEach((e) => {
      const id = e.getData('id');
      if (ids.includes(id)) {
        sumX += e.x;
        sumY += e.y;
        count += 1;
      }
    });
    if (count === 0) {
      this.scene.cameras.main.centerOn(0, 0);
      return;
    }
    const cx = sumX / count;
    const cy = sumY / count;
    this.scene.cameras.main.centerOn(cx, cy);
  }

  // === Phase 2: Properties drawer helpers ===
  // No properties helpers (panel removed)

  // === Phase 1 helpers: palette drawer behavior ===
  private togglePalette(forceOpen?: boolean, immediate: boolean = false): void {
    if (this.paletteAnimating) return;
    const newState = forceOpen !== undefined ? forceOpen : !this.paletteOpen;
    this.paletteOpen = newState;
    // Palette visibility must be independent of the left toolbar visibility

    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    const openX = this.scene.scale.width - this.paletteWidth / 2;
    const closedX = this.scene.scale.width + this.paletteWidth / 2 + 8;
    const targetY = topBarH + 20 + this.paletteHeight / 2;

    if (!this.entityPaletteContainer) return;
    this.entityPaletteContainer.y = targetY;

    const updateMask = () => {
      if (this.paletteMaskGraphics) {
        const maskWidth = this.paletteWidth - 40;
        const maskX = this.entityPaletteContainer.x - maskWidth / 2;
        const maskY = this.entityPaletteContainer.y - 140;
        this.paletteMaskGraphics.clear();
        this.paletteMaskGraphics.fillStyle(0xffffff);
        this.paletteMaskGraphics.fillRect(maskX, maskY, maskWidth, 320);
      }
    };

    const ensureReveal = () => {
      if (!this.paletteRevealButton) {
        const btn = this.scene.add.container(this.scene.scale.width - 12, targetY);
        btn.setScrollFactor(0);
        const bg = this.scene.add.rectangle(0, 0, 18, 44, 0x111827, 0.9).setOrigin(0.5);
        bg.setStrokeStyle(1, 0x2b3a4a, 1);
        const icon = this.scene.add
          .text(0, 0, '<', { fontSize: '16px', color: '#9ca3af' })
          .setOrigin(0.5);
        btn.add([bg, icon]);
        btn.setInteractive(
          new Phaser.Geom.Rectangle(-9, -22, 18, 44),
          Phaser.Geom.Rectangle.Contains
        );
        btn.on('pointerover', () => bg.setFillStyle(0x1f2937, 1));
        btn.on('pointerout', () => bg.setFillStyle(0x111827, 0.9));
        btn.on('pointerdown', () => this.togglePalette(true));
        this.paletteRevealButton = btn;
      }
      this.paletteRevealButton!.x = this.scene.scale.width - 12;
      this.paletteRevealButton!.y = targetY;
    };

    if (immediate) {
      if (newState) {
        this.entityPaletteContainer.setVisible(true);
        this.entityPaletteContainer.x = openX;
        updateMask();
        this.paletteRevealButton?.setVisible(false);
      } else {
        this.entityPaletteContainer.x = closedX;
        this.entityPaletteContainer.setVisible(false);
        ensureReveal();
        this.paletteRevealButton!.setVisible(true);
      }
      try {
        window?.localStorage?.setItem('design.palette.open', String(newState));
      } catch {
        // ignore persistence errors
      }
      return;
    }

    this.paletteAnimating = true;
    if (newState) {
      // Opening animation
      this.entityPaletteContainer.setVisible(true);
      this.paletteRevealButton?.setVisible(false);
      this.scene.tweens.add({
        targets: this.entityPaletteContainer,
        x: openX,
        duration: 200,
        ease: 'Cubic.easeOut',
        onUpdate: updateMask,
        onComplete: () => {
          this.paletteAnimating = false;
        },
      });
    } else {
      // Closing animation
      ensureReveal();
      this.scene.tweens.add({
        targets: this.entityPaletteContainer,
        x: closedX,
        duration: 180,
        ease: 'Cubic.easeIn',
        onUpdate: updateMask,
        onComplete: () => {
          this.entityPaletteContainer.setVisible(false);
          this.paletteRevealButton!.setVisible(true);
          this.paletteAnimating = false;
        },
      });
    }
    try {
      window?.localStorage?.setItem('design.palette.open', String(newState));
    } catch {
      // ignore
    }
  }

  private isPointerOverPalette(pointer: Phaser.Input.Pointer): boolean {
    if (!this.entityPaletteContainer?.visible) return false;
    // Palette is sticky (screen-space), so compare against pointer screen coords directly
    const cx = this.entityPaletteContainer.x;
    const cy = this.entityPaletteContainer.y;
    const halfW = this.paletteWidth / 2;
    const halfH = this.paletteHeight / 2;
    return (
      pointer.x >= cx - halfW &&
      pointer.x <= cx + halfW &&
      pointer.y >= cy - halfH &&
      pointer.y <= cy + halfH
    );
  }

  private scrollPaletteContent(dy: number): void {
    if (!this.entityPaletteContainer?.visible) return;
    const ids = ['enemies', 'obstacles', 'powerups', 'decorations'];
    const active = ids
      .map((id) => this.entityPaletteContainer.getByName(id) as Phaser.GameObjects.Container | null)
      .find((c) => c && c.visible);
    if (!active) return;

    const step = Math.sign(dy) * 20;
    const targetY = active.y - step;

    // Estimate content height from bounds
    const b = active.getBounds();
    const contentHeight = b.height || 400;
    const viewportHeight = 320;
    const maxY = -120; // top anchor baseline
    const minY = Math.min(maxY, maxY - (contentHeight - viewportHeight));
    active.y = Phaser.Math.Clamp(targetY, minY, maxY);
  }
}
