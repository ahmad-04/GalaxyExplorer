/**
 * Block system type definitions for devvit block components
 */

// Core block configuration interface
export interface BlockConfig {
  type: 'level-preview' | 'weekly-challenge' | 'landing' | 'community-showcase';
  postId: string;
  data: BlockData;
  actions: BlockAction[];
}

// Block data union type
export type BlockData = LevelBlockData | ChallengeBlockData | LandingBlockData | CommunityBlockData;

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
  userId?: string;
  blockType: BlockConfig['type'];
  actionId: string;
  actionData?: Record<string, unknown>;
}

// Block render context for devvit components
export interface BlockRenderContext {
  config: BlockConfig;
  state: BlockState;
  onAction: (actionId: string, data?: Record<string, unknown>) => Promise<void>;
  onError: (error: BlockError) => void;
}
