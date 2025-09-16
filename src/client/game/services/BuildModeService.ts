/**
 * BuildModeService.ts
 * Service layer for handling all Build Mode operations, inspired by Pixelary's Service class
 */

import * as Phaser from 'phaser';
import {
  LevelData,
  LevelSettings,
  EntityType,
  LevelMetadata,
} from '../../../shared/types/buildMode';

/**
 * Service that handles the backbone logic for Build Mode
 * This service is responsible for:
 * - Storing and fetching level data locally
 * - Managing the editor state
 * - Handling level validation
 * - Managing server integration (when enabled)
 */
export class BuildModeService {
  // Local storage keys
  private readonly KEYS = {
    LEVEL_DATA: (id: string) => `galaxy-explorer:level:${id}`,
    LEVEL_LIST: 'galaxy-explorer:levels',
    USER_SETTINGS: 'galaxy-explorer:build-mode-settings',
    AUTOSAVE: 'galaxy-explorer:autosave',
  };

  // Event emitter for service events
  private events: Phaser.Events.EventEmitter;

  constructor() {
    this.events = new Phaser.Events.EventEmitter();
    this.setupAutoSave();
  }

  /**
   * Set up autosave functionality
   */
  private setupAutoSave() {
    // Check for any crashed sessions with unsaved data
    const autosaveData = localStorage.getItem(this.KEYS.AUTOSAVE);
    if (autosaveData) {
      console.log('[BuildModeService] Found autosave data, recovery possible');
      // We don't automatically recover, but we let the UI know recovery is possible
      this.events.emit('autosave-found');
    }
  }

  /**
   * Get a list of all saved levels
   */
  getLevelList(): LevelMetadata[] {
    try {
      const levelsJson = localStorage.getItem(this.KEYS.LEVEL_LIST);
      if (!levelsJson) return [];
      return JSON.parse(levelsJson);
    } catch (error) {
      console.error('[BuildModeService] Error loading level list:', error);
      return [];
    }
  }

  /**
   * Load a level by ID
   * @param id The level ID
   */
  loadLevel(id: string): LevelData | null {
    try {
      const levelJson = localStorage.getItem(this.KEYS.LEVEL_DATA(id));
      if (!levelJson) return null;
      return JSON.parse(levelJson);
    } catch (error) {
      console.error(`[BuildModeService] Error loading level ${id}:`, error);
      return null;
    }
  }

  /**
   * Get metadata for a level by ID
   * @param id The level ID
   */
  getLevelMetadata(id: string): LevelMetadata | null {
    try {
      // Get the level list
      const levels = this.getLevelList();

      // Find the level with the given ID
      const level = levels.find((level) => level.id === id);

      if (!level) return null;
      return level;
    } catch (error) {
      console.error(`[BuildModeService] Error getting metadata for level ${id}:`, error);
      return null;
    }
  }

  /**
   * Save a level
   * @param levelData The level data to save
   * @param metadata Optional metadata overrides
   * @returns The ID of the saved level
   */
  saveLevel(levelData: LevelData, metadata?: Partial<LevelMetadata>): string {
    try {
      // Preserve existing IDs: prefer levelData.id, then metadata.id, else generate
      const id = levelData.id || metadata?.id || this.generateId();

      // Ensure the stored level object has the resolved id
      levelData.id = id;

      // Save level data
      localStorage.setItem(this.KEYS.LEVEL_DATA(id), JSON.stringify(levelData));

      // Update level list
      const levels = this.getLevelList();
      const now = Date.now();

      // Find existing metadata or create new
      const existingIndex = levels.findIndex((level) => level.id === id);
      const levelMeta: LevelMetadata =
        existingIndex >= 0
          ? (() => {
              const existing = levels[existingIndex]!;
              const description =
                levelData.settings.description !== undefined
                  ? levelData.settings.description
                  : existing.description !== undefined
                    ? existing.description
                    : '';
              const baseUpdated: LevelMetadata = {
                id: existing.id,
                name: levelData.settings.name || existing.name,
                author: levelData.settings.author || existing.author,
                difficulty: levelData.settings.difficulty ?? existing.difficulty,
                description,
                createdAt: existing.createdAt,
                lastModified: now,
                isPublished: existing.isPublished,
                publishId: existing.publishId ?? '',
              };
              return existing.permalink
                ? { ...baseUpdated, permalink: existing.permalink }
                : baseUpdated;
            })()
          : {
              id,
              name: levelData.settings.name,
              author: levelData.settings.author,
              difficulty: levelData.settings.difficulty,
              description: levelData.settings.description ?? '',
              createdAt: now,
              lastModified: now,
              isPublished: false,
              publishId: metadata?.publishId ?? '',
            };

      // Update level list
      if (existingIndex >= 0) {
        levels[existingIndex] = levelMeta;
      } else {
        levels.push(levelMeta);
      }

      localStorage.setItem(this.KEYS.LEVEL_LIST, JSON.stringify(levels));

      // Clear autosave if this was a proper save
      localStorage.removeItem(this.KEYS.AUTOSAVE);

      // Emit event
      this.events.emit('level-saved', id);

      return id;
    } catch (error) {
      console.error('[BuildModeService] Error saving level:', error);
      throw new Error('Failed to save level');
    }
  }

  /**
   * Delete a level
   * @param id The ID of the level to delete
   */
  deleteLevel(id: string): boolean {
    try {
      // Remove level data
      localStorage.removeItem(this.KEYS.LEVEL_DATA(id));

      // Update level list
      const levels = this.getLevelList().filter((level) => level.id !== id);
      localStorage.setItem(this.KEYS.LEVEL_LIST, JSON.stringify(levels));

      // Emit event
      this.events.emit('level-deleted', id);

      return true;
    } catch (error) {
      console.error(`[BuildModeService] Error deleting level ${id}:`, error);
      return false;
    }
  }

  /**
   * Autosave the current level
   * @param levelData The level data to autosave
   */
  autoSave(levelData: LevelData): void {
    try {
      localStorage.setItem(
        this.KEYS.AUTOSAVE,
        JSON.stringify({
          data: levelData,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('[BuildModeService] Error autosaving level:', error);
    }
  }

  /**
   * Recover autosaved level data
   * @returns The autosaved level data or null if none exists
   */
  recoverAutosave(): { data: LevelData; timestamp: number } | null {
    try {
      const autosaveJson = localStorage.getItem(this.KEYS.AUTOSAVE);
      if (!autosaveJson) return null;
      return JSON.parse(autosaveJson);
    } catch (error) {
      console.error('[BuildModeService] Error recovering autosave:', error);
      return null;
    }
  }

  /**
   * Export a level to a JSON file
   * @param id The ID of the level to export
   * @returns The level data as a JSON string
   */
  exportLevel(id: string): string {
    const level = this.loadLevel(id);
    if (!level) throw new Error(`Level with ID ${id} not found`);
    return JSON.stringify(level, null, 2);
  }

  /**
   * Import a level from a JSON string
   * @param jsonData The JSON string containing level data
   * @returns The ID of the imported level
   */
  importLevel(jsonData: string): string {
    try {
      const levelData = JSON.parse(jsonData) as LevelData;
      this.validateLevel(levelData);
      return this.saveLevel(levelData);
    } catch (error) {
      console.error('[BuildModeService] Error importing level:', error);
      throw new Error('Invalid level data');
    }
  }

  /**
   * Validate a level
   * @param levelData The level data to validate
   * @returns An array of validation issues, empty if valid
   */
  validateLevel(levelData: LevelData): string[] {
    const issues: string[] = [];

    // Check for required fields
    if (!levelData.settings) {
      issues.push('Missing level settings');
    } else {
      if (!levelData.settings.name) issues.push('Missing level name');
      if (!levelData.settings.author) issues.push('Missing level author');
    }

    // Check for player start position
    const hasPlayerStart = levelData.entities?.some(
      (entity) => entity.type === EntityType.PLAYER_START
    );

    if (!hasPlayerStart) {
      issues.push('Level must have a player start position');
    }

    // Check for entities outside of bounds
    const outOfBoundsEntities = levelData.entities?.filter(
      (entity) =>
        entity.position.x < 0 ||
        entity.position.x > 3000 ||
        entity.position.y < 0 ||
        entity.position.y > 3000
    );

    if (outOfBoundsEntities && outOfBoundsEntities.length > 0) {
      issues.push(`${outOfBoundsEntities.length} entities are outside the level bounds`);
    }

    return issues;
  }

  /**
   * Create a new empty level
   * @param settings Initial level settings
   * @returns A new level data object
   */
  createEmptyLevel(settings: Partial<LevelSettings> = {}): LevelData {
    const now = Date.now();
    const id = `level_${now.toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      id,
      settings: {
        name: 'Untitled Level',
        author: 'Anonymous',
        difficulty: 1,
        backgroundSpeed: 1,
        backgroundTexture: 'stars',
        musicTrack: 'default',
        version: '1.0.0',
        ...settings,
      },
      entities: [],
      metadata: {
        createdAt: now,
        lastModified: now,
        version: '1.0.0',
      },
    };
  }

  /**
   * Create a level from a template
   * @param templateName The name of the template to use
   * @param settings Settings overrides
   * @returns A new level data object based on the template
   */
  createLevelFromTemplate(templateName: string, settings: Partial<LevelSettings> = {}): LevelData {
    // In a real implementation, we would load templates from a predefined set
    // For now, just create an empty level with some entities
    const level = this.createEmptyLevel(settings);

    // Add some starter entities based on template
    if (templateName === 'basic') {
      level.entities.push({
        id: this.generateId(),
        type: EntityType.PLAYER_START,
        position: { x: 400, y: 500 },
        rotation: 0,
        scale: 1,
      });
    }

    return level;
  }

  /**
   * Generate a unique ID
   * @returns A unique string ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Subscribe to service events
   * @param event The event name
   * @param callback The callback function
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    this.events.on(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Unsubscribe from service events
   * @param event The event name
   * @param callback The callback function
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.events.off(event, callback as (...args: unknown[]) => void);
  }

  // Server-side methods (to be implemented when backend is ready)

  /**
   * Publish a level to the server
   * @param levelId The ID of the level to publish
   * @returns The server-side ID of the published level
   */
  async publishLevel(levelId: string): Promise<string> {
    console.log(`[BuildModeService] Publishing level ${levelId}`);

    // Mark the level as published in metadata
    const levels = this.getLevelList();
    const levelIndex = levels.findIndex((level) => level.id === levelId);

    if (levelIndex === -1) {
      throw new Error(`Level with ID ${levelId} not found`);
    }

    // Update the metadata
    const level = levels[levelIndex];
    if (!level) {
      throw new Error(`Level with ID ${levelId} not found`);
    }

    level.isPublished = true;

    // Generate a publish ID if one doesn't exist
    if (!level.publishId) {
      level.publishId = `pub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Save updated metadata
    localStorage.setItem(this.KEYS.LEVEL_LIST, JSON.stringify(levels));

    // Return the publish ID
    return level.publishId || '';
  }

  /**
   * Get published levels from the server
   * @returns An array of level metadata
   */
  async getPublishedLevels(): Promise<LevelMetadata[]> {
    // This would be implemented when server-side functionality is ready
    console.log('[BuildModeService] Getting published levels (not implemented yet)');
    return [];
  }
}

export default BuildModeService;
