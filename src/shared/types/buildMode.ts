/**
 * Type definitions for the Galaxy Explorer Build Mode
 * These types define the structure for saving and loading custom game levels
 */

export interface Position {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER_START = 'PLAYER_START',
  ENEMY_SPAWNER = 'ENEMY_SPAWNER',
  OBSTACLE = 'OBSTACLE',
  POWERUP_SPAWNER = 'POWERUP_SPAWNER',
  DECORATION = 'DECORATION',
  TRIGGER = 'TRIGGER',
}

export enum EnemySpawnerType {
  RANDOM = 'RANDOM', // Random enemies based on difficulty
  FIGHTER = 'FIGHTER',
  SCOUT = 'SCOUT',
  CRUISER = 'CRUISER',
  SEEKER = 'SEEKER',
  GUNSHIP = 'GUNSHIP',
}

export enum PowerUpType {
  RANDOM = 'RANDOM',
  SCORE_MULTIPLIER = 'SCORE_MULTIPLIER',
  SHIELD = 'SHIELD',
  RAPID_FIRE = 'RAPID_FIRE',
}

export enum TriggerType {
  DIFFICULTY_CHANGE = 'DIFFICULTY_CHANGE',
  SPAWN_WAVE = 'SPAWN_WAVE',
  BOSS_ENTRY = 'BOSS_ENTRY',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
}

export enum ObstacleType {
  ASTEROID = 'ASTEROID',
  SPACE_MINE = 'SPACE_MINE',
  DEBRIS = 'DEBRIS',
}

export enum DecorationType {
  STAR_CLUSTER = 'STAR_CLUSTER',
  NEBULA = 'NEBULA',
  PLANET = 'PLANET',
  SPACE_STATION = 'SPACE_STATION',
}

// Base entity interface with common properties
export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Position;
  rotation: number;
  scale: number;
}

export interface PlayerStart extends BaseEntity {
  type: EntityType.PLAYER_START;
}

export interface EnemySpawner extends BaseEntity {
  type: EntityType.ENEMY_SPAWNER;
  enemyType: EnemySpawnerType;
  spawnRate: number; // in seconds
  maxEnemies: number; // maximum number of enemies to spawn
  activationDistance: number; // distance from player to activate spawner
}

export interface Obstacle extends BaseEntity {
  type: EntityType.OBSTACLE;
  obstacleType: ObstacleType;
  health: number;
  damage: number;
  isDestructible: boolean;
}

export interface PowerUpSpawner extends BaseEntity {
  type: EntityType.POWERUP_SPAWNER;
  powerUpType: PowerUpType;
  spawnChance: number; // 0-1 probability
  respawnTime: number; // in seconds
}

export interface Decoration extends BaseEntity {
  type: EntityType.DECORATION;
  decorationType: DecorationType;
  depth: number; // rendering layer
  parallaxFactor: number; // for background movement effect
}

export interface Trigger extends BaseEntity {
  type: EntityType.TRIGGER;
  triggerType: TriggerType;
  triggerRadius: number;
  oneTime: boolean;
  actions: TriggerAction[];
}

export interface TriggerAction {
  type: string;
  params: Record<string, unknown>;
}

// Level settings interface
export interface LevelSettings {
  name: string;
  author: string;
  difficulty: number;
  backgroundSpeed: number;
  backgroundTexture: string;
  musicTrack: string;
  description?: string;
  version: string;
}

// The main level structure
export interface LevelData {
  id: string;
  settings: LevelSettings;
  entities: BaseEntity[];
  metadata: {
    createdAt: number;
    lastModified: number;
    version: string;
  };
}

/**
 * Level metadata for displaying in the level browser
 */
export interface LevelMetadata {
  id: string;
  name: string;
  author: string;
  difficulty: number;
  description?: string;
  createdAt: number;
  lastModified: number;
  isPublished: boolean;
  publishId?: string;
  permalink?: string;
}

// Build mode user settings
export interface BuildModeSettings {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in minutes
}
