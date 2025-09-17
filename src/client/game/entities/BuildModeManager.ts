/**
 * BuildModeManager.ts
 * Core class that manages the state of the Build Mode editor
 */

import * as Phaser from 'phaser';
import BuildModeService from '../services/BuildModeService';

// Tool types for the editor
export enum BuildModeTool {
  SELECT = 'SELECT',
  PLACE = 'PLACE',
  MOVE = 'MOVE',
  ROTATE = 'ROTATE',
  DELETE = 'DELETE',
  PAN = 'PAN',
}

// Editor state interface
export interface BuildModeState {
  currentTool: BuildModeTool;
  selectedEntityIds: string[];
  currentEntityType?: string;
  isGridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  currentLevelId?: string;
  isDirty: boolean; // Whether the level has unsaved changes
  cameraZoom: number;
}

/**
 * Manager class for the Build Mode editor
 * Handles editor state, tool selection, and grid settings
 */
export class BuildModeManager {
  private service: BuildModeService;
  public events: Phaser.Events.EventEmitter;
  private static readonly FIXED_GRID_SIZE = 32;

  // Current state of the editor
  private state: BuildModeState = {
    currentTool: BuildModeTool.SELECT,
    selectedEntityIds: [],
    isGridVisible: true,
    gridSize: BuildModeManager.FIXED_GRID_SIZE,
    snapToGrid: true,
    isDirty: false,
    cameraZoom: 1,
  };

  constructor(scene: Phaser.Scene) {
    // Parameter kept for future use; mark as used to satisfy lints
    void scene;
    this.service = new BuildModeService();
    this.events = new Phaser.Events.EventEmitter();

    // Restore persisted tool selection if available
    try {
      const persistedTool = (window?.localStorage?.getItem('design.tool') || '') as string;
      const validTools = Object.values(BuildModeTool) as string[];
      if (persistedTool && validTools.includes(persistedTool)) {
        // Initialize state without double-emitting
        this.state.currentTool = persistedTool as BuildModeTool;
        // Inform listeners of initial tool for UI sync
        this.events.emit('tool:change', this.state.currentTool);
      }
    } catch {
      // ignore storage access issues
    }

    console.log('[BuildModeManager] Initialized');
  }

  /**
   * Set the current tool
   * @param tool The tool to set as current
   */
  setCurrentTool(tool: BuildModeTool): void {
    this.state.currentTool = tool;
    this.events.emit('tool:change', tool);
    // Persist selection for future sessions
    try {
      window?.localStorage?.setItem('design.tool', String(tool));
    } catch {
      // ignore storage access issues
    }
    console.log(`[BuildModeManager] Tool changed to ${tool}`);
  }

  /**
   * Get the current tool
   * @returns The current tool
   */
  getCurrentTool(): BuildModeTool {
    return this.state.currentTool;
  }

  /**
   * Set the current entity type for placement
   * @param entityType The entity type to set
   */
  setCurrentEntityType(entityType: string): void {
    this.state.currentEntityType = entityType;
    this.events.emit('entityType:change', entityType);
    console.log(`[BuildModeManager] Entity type changed to ${entityType}`);
  }

  /**
   * Get the current entity type
   * @returns The current entity type
   */
  getCurrentEntityType(): string | undefined {
    return this.state.currentEntityType;
  }

  /**
   * Set the grid visibility
   * @param visible Whether the grid should be visible
   */
  setGridVisible(visible: boolean): void {
    this.state.isGridVisible = visible;
    this.events.emit('grid:visibilityChange', visible);
    console.log(`[BuildModeManager] Grid visibility set to ${visible}`);
  }

  /**
   * Get the grid visibility
   * @returns Whether the grid is visible
   */
  isGridVisible(): boolean {
    return this.state.isGridVisible;
  }

  /**
   * Set the grid size
   * @param size The size of the grid cells
   */
  setGridSize(size: number): void {
    // Clamp to a reasonable pixel size and round to integer
    const clamped = Math.max(8, Math.min(96, Math.round(size)));
    const changed = this.state.gridSize !== clamped;
    this.state.gridSize = clamped;
    if (changed) {
      this.events.emit('grid:sizeChange', clamped);
    }
    console.log(`[BuildModeManager] Grid size set to ${clamped}`);
  }

  /**
   * Get the grid size
   * @returns The size of the grid cells
   */
  getGridSize(): number {
    return this.state.gridSize;
  }

  /**
   * Set whether to snap to grid
   * @param snap Whether to snap to grid
   */
  setSnapToGrid(snap: boolean): void {
    this.state.snapToGrid = snap;
    this.events.emit('grid:snapChange', snap);
    console.log(`[BuildModeManager] Snap to grid set to ${snap}`);
  }

  /**
   * Get whether to snap to grid
   * @returns Whether snapping to grid is enabled
   */
  isSnapToGrid(): boolean {
    return this.state.snapToGrid;
  }

  /**
   * Set the current level ID
   * @param id The ID of the current level
   */
  setCurrentLevelId(id: string): void {
    this.state.currentLevelId = id;
    this.state.isDirty = false; // Reset dirty flag when loading a new level
    this.events.emit('level:change', id);
    console.log(`[BuildModeManager] Current level ID set to ${id}`);

    // Verify the ID exists in the service
    if (id && this.service) {
      // Get all levels for comprehensive logging
      const allLevels = this.service.getLevelList();
      console.log(
        `[BuildModeManager] Available levels in service: ${allLevels.length}`,
        allLevels.map((level) => ({ id: level.id, name: level.name }))
      );

      // Check for ID format mismatches
      const levelIdsWithSamePrefix = allLevels.filter(
        (level) => level.id.includes(id.substring(0, 8)) || id.includes(level.id.substring(0, 8))
      );

      if (levelIdsWithSamePrefix.length > 0 && !allLevels.some((level) => level.id === id)) {
        console.warn(
          `[BuildModeManager] Warning: Found levels with similar prefix but not exact ID match:`,
          levelIdsWithSamePrefix.map((level) => ({ id: level.id, name: level.name }))
        );
      }

      // Verify direct match
      const metadata = this.service.getLevelMetadata(id);
      if (!metadata) {
        console.warn(`[BuildModeManager] Warning: Level ID ${id} not found in service metadata`);
      } else {
        console.log(
          `[BuildModeManager] Level ID ${id} verified in service (name: ${metadata.name})`
        );
      }
    }
  }

  /**
   * Get the current level ID
   * @returns The current level ID
   */
  getCurrentLevelId(): string | undefined {
    return this.state.currentLevelId;
  }

  /**
   * Mark the level as having unsaved changes
   * @param isDirty Whether the level has unsaved changes
   */
  setDirty(isDirty: boolean): void {
    this.state.isDirty = isDirty;
    this.events.emit('level:dirtyChange', isDirty);
    console.log(`[BuildModeManager] Level dirty state set to ${isDirty}`);
  }

  /**
   * Check if the level has unsaved changes
   * @returns Whether the level has unsaved changes
   */
  isDirty(): boolean {
    return this.state.isDirty;
  }

  /**
   * Set the camera zoom level
   * @param zoom The zoom level
   */
  setCameraZoom(zoom: number): void {
    this.state.cameraZoom = zoom;
    this.events.emit('camera:zoomChange', zoom);
    console.log(`[BuildModeManager] Camera zoom set to ${zoom}`);
  }

  /**
   * Get the camera zoom level
   * @returns The camera zoom level
   */
  getCameraZoom(): number {
    return this.state.cameraZoom;
  }

  /**
   * Select an entity
   * @param entityId The ID of the entity to select
   * @param addToSelection Whether to add to the current selection or replace it
   */
  selectEntity(entityId: string, addToSelection: boolean = false): void {
    if (addToSelection) {
      if (!this.state.selectedEntityIds.includes(entityId)) {
        this.state.selectedEntityIds.push(entityId);
      }
    } else {
      this.state.selectedEntityIds = [entityId];
    }

    this.events.emit('selection:change', this.state.selectedEntityIds);
    console.log(`[BuildModeManager] Selected entities: ${this.state.selectedEntityIds.join(', ')}`);
  }

  /**
   * Deselect an entity
   * @param entityId The ID of the entity to deselect
   */
  deselectEntity(entityId: string): void {
    this.state.selectedEntityIds = this.state.selectedEntityIds.filter((id) => id !== entityId);
    this.events.emit('selection:change', this.state.selectedEntityIds);
    console.log(`[BuildModeManager] Selected entities: ${this.state.selectedEntityIds.join(', ')}`);
  }

  /**
   * Deselect all entities
   */
  clearSelection(): void {
    this.state.selectedEntityIds = [];
    this.events.emit('selection:change', this.state.selectedEntityIds);
    console.log('[BuildModeManager] Selection cleared');
  }

  /**
   * Get the currently selected entity IDs
   * @returns The currently selected entity IDs
   */
  getSelectedEntityIds(): string[] {
    return [...this.state.selectedEntityIds];
  }

  /**
   * Subscribe to an event
   * @param event The event to subscribe to
   * @param callback The callback to call when the event is emitted
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    this.events.on(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param event The event to unsubscribe from
   * @param callback The callback to remove
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.events.off(event, callback);
  }

  /**
   * Get a reference to the service
   * @returns The BuildModeService instance
   */
  getService(): BuildModeService {
    return this.service;
  }

  /**
   * Snap a position to the grid if enabled
   * @param position The position to snap
   * @returns The snapped position
   */
  snapToGridIfEnabled(position: { x: number; y: number }): { x: number; y: number } {
    if (!this.state.snapToGrid) {
      return position;
    }

    const gridSize = this.state.gridSize;

    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }
}

export default BuildModeManager;
