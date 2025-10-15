/**
 * Block system type definitions for devvit block components
 */

// Core block configuration interface
export interface BlockConfig {
  type:
    | 'level-preview'
    | 'weekly-challenge'
    | 'landing'
    | 'community-showcase'
    | 'play-mode'
    | 'build-mode';
  postId: string;
  data: BlockData;
  actions: BlockAction[];
}

// Block data union type
export type BlockData =
  | LevelBlockData
  | ChallengeBlockData
  | LandingBlockData
  | CommunityBlockData
  | PlayModeBlockData
  | BuildModeBlockData;

// Level block specific data
export interface LevelBlockData {
  levelId: string;
  title: string;
  creator: string;
  difficulty: number;
  playCount: number;
  rating?: number;
  thumbnailUrl?: string;
  description?: string;
}

// Weekly challenge block data
export interface ChallengeBlockData {
  challengeId: string;
  weekId: string;
  title: string;
  description: string;
  seedLevel: {
    levelId: string;
    title: string;
    difficulty: number;
  };
  leaderboard: {
    username: string;
    score: number;
    rank: number;
  }[];
  timeRemaining: number; // milliseconds
  participantCount: number;
}

// Landing block data
export interface LandingBlockData {
  appTitle: string;
  description: string;
  features: string[];
  communityHighlights: {
    levelId: string;
    title: string;
    creator: string;
    thumbnailUrl?: string;
  }[];
  statistics: {
    totalLevels: number;
    activePlayers: number;
    totalPlays: number;
  };
}

// Community showcase block data
export interface CommunityBlockData {
  statistics: {
    totalLevels: number;
    activePlayers: number;
    totalCreators: number;
    weeklyPlays: number;
  };
  featuredCreators: {
    username: string;
    levelCount: number;
    totalPlays: number;
    avatarUrl?: string;
  }[];
  popularLevels: {
    levelId: string;
    title: string;
    creator: string;
    playCount: number;
    rating?: number;
    thumbnailUrl?: string;
  }[];
  communityEvents?: {
    title: string;
    description: string;
    startDate: number;
    endDate: number;
  }[];
}

// Play mode block data
export interface PlayModeBlockData {
  gameType: 'campaign' | 'community' | 'challenge';
  availableLevels?: {
    levelId: string;
    title: string;
    creator: string;
    difficulty: number;
    thumbnailUrl?: string;
  }[];
  userProgress?: {
    campaignProgress: number;
    unlockedLevels: string[];
    achievements: string[];
  };
}

// Build mode block data
export interface BuildModeBlockData {
  action: 'create' | 'edit' | 'tutorial';
  userLevels?: {
    levelId: string;
    title: string;
    lastModified: number;
    published: boolean;
    playCount: number;
  }[];
  tutorialProgress?: {
    completedSteps: string[];
    currentStep: number;
  };
}

// Block action interface
export interface BlockAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  handler: string; // Handler function name
  requiresAuth?: boolean;
  data?: Record<string, unknown>; // Additional data for the action
}

// Block state management
export interface BlockState {
  loading: boolean;
  error?: string;
  data?: BlockData;
  userInteracted: boolean;
  lastUpdated?: number;
}

// Block metadata for storage and tracking
export interface BlockMetadata {
  postId: string;
  blockType: BlockConfig['type'];
  createdAt: number;
  lastUpdated: number;
  viewCount: number;
  interactionCount: number;
  cacheKey?: string;
}

// Level block metadata extension
export interface LevelBlockMetadata extends LevelBlockData {
  // Block-specific additions
  shortDescription?: string;
  averageRating?: number;
  lastPlayedAt?: number;

  // Visual customization
  cardColor?: string;
  badgeText?: string;
  featured: boolean;
}

// Block-specific error types
export interface BlockError {
  code: 'FETCH_FAILED' | 'AUTH_REQUIRED' | 'INVALID_CONFIG' | 'NETWORK_ERROR' | 'CACHE_MISS';
  message: string;
  retryable: boolean;
  context?: Record<string, unknown>;
}

// Error handling strategy configuration
export interface ErrorHandlingStrategy {
  retryAttempts: number;
  retryDelay: number;
  fallbackContent?: BlockData;
  errorDisplay: 'toast' | 'inline' | 'modal';
}

// Redis cache keys for block data
export const BLOCK_CACHE_KEYS = {
  LEVEL_METADATA: (postId: string) => `block:level:${postId}`,
  CHALLENGE_DATA: (weekId: string) => `block:challenge:${weekId}`,
  COMMUNITY_STATS: 'block:community:stats',
  USER_INTERACTIONS: (userId: string, postId: string) => `block:interaction:${userId}:${postId}`,
  BLOCK_CONFIG: (postId: string) => `block:config:${postId}`,
} as const;

// Block action handler context
export interface BlockActionContext {
  postId: string;
  userId?: string | undefined;
  blockType: BlockConfig['type'];
  actionId: string;
  actionData?: Record<string, unknown> | undefined;
}

// Block render context for devvit components
export interface BlockRenderContext {
  config: BlockConfig;
  state: BlockState;
  onAction: (actionId: string, data?: Record<string, unknown>) => Promise<void>;
  onError: (error: BlockError) => void;
}

// Webview context preservation interfaces
export interface WebviewContext {
  postId: string;
  blockType: BlockConfig['type'];
  action: string;
  timestamp: number;
  data?: Record<string, unknown> | undefined;
}

// Level-specific webview context
export interface LevelWebviewContext extends WebviewContext {
  levelId: string;
  mode?: 'play' | 'edit' | 'preview' | undefined;
  difficulty?: number | undefined;
  creator?: string | undefined;
}

// Challenge-specific webview context
export interface ChallengeWebviewContext extends WebviewContext {
  weekId: string;
  challengeId: string;
  seedLevelId: string;
  challengeMode: boolean;
  userProgress?: {
    bestScore?: number;
    attempts?: number;
    lastPlayedAt?: number;
  };
}

// Landing/tutorial webview context
export interface LandingWebviewContext extends WebviewContext {
  mode: 'tutorial' | 'getting-started' | 'feature-tour';
  step?: number | undefined;
  completedSteps?: string[] | undefined;
}

// Community webview context
export interface CommunityWebviewContext extends WebviewContext {
  filter?: 'popular' | 'trending' | 'new' | 'creator' | undefined;
  creator?: string | undefined;
  tags?: string[] | undefined;
  sortBy?: 'plays' | 'rating' | 'date' | undefined;
}

// Play mode webview context
export interface PlayModeWebviewContext extends WebviewContext {
  gameType: 'campaign' | 'community' | 'challenge';
  levelId?: string | undefined;
  difficulty?: number | undefined;
  autoStart?: boolean | undefined;
}

// Build mode webview context
export interface BuildModeWebviewContext extends WebviewContext {
  action: 'create' | 'edit' | 'tutorial';
  levelId?: string | undefined;
  templateId?: string | undefined;
  tutorialStep?: number | undefined;
}

// Union type for all webview contexts
export type WebviewContextData =
  | LevelWebviewContext
  | ChallengeWebviewContext
  | LandingWebviewContext
  | CommunityWebviewContext
  | PlayModeWebviewContext
  | BuildModeWebviewContext;

// Webview launch configuration
export interface WebviewLaunchConfig {
  url: string;
  context: WebviewContextData;
  loading?: {
    message: string;
    timeout: number;
  };
  fallback?: {
    type: 'error' | 'retry';
    message: string;
    actions?: BlockAction[];
  };
}

// Context validation result
export interface ContextValidationResult {
  valid: boolean;
  errors?: string[] | undefined;
  sanitizedContext?: WebviewContextData | undefined;
}

// State synchronization interface
export interface StateSyncData {
  postId: string;
  blockType: BlockConfig['type'];
  updatedAt: number;
  changes: {
    playCount?: number;
    rating?: number;
    userProgress?: Record<string, unknown>;
    leaderboard?: unknown[];
    statistics?: Record<string, unknown>;
  };
}
