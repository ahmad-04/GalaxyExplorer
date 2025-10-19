import { redis } from '@devvit/web/server';
import { BLOCK_CACHE_KEYS, } from '../../../shared/types/blocks.js';
/**
 * Service for managing block data and caching
 */
export class BlockService {
    /**
     * Store block configuration for a post
     */
    static async storeBlockConfig(postId, config) {
        const key = BLOCK_CACHE_KEYS.BLOCK_CONFIG(postId);
        await redis.set(key, JSON.stringify(config));
        // Set TTL for 90 days
        const TTL_SECONDS = 90 * 24 * 60 * 60;
        await redis.expire(key, TTL_SECONDS);
    }
    /**
     * Retrieve block configuration for a post
     */
    static async getBlockConfig(postId) {
        const key = BLOCK_CACHE_KEYS.BLOCK_CONFIG(postId);
        const configStr = await redis.get(key);
        if (!configStr) {
            return null;
        }
        try {
            return JSON.parse(configStr);
        }
        catch (error) {
            console.error(`Failed to parse block config for post ${postId}:`, error);
            return null;
        }
    }
    /**
     * Create level block data from level metadata
     */
    static createLevelBlockData(args) {
        return {
            levelId: args.levelId,
            title: args.title,
            creator: args.creator,
            difficulty: args.difficulty || 1,
            playCount: 0, // Will be updated by analytics
            ...(args.description && { description: args.description }),
        };
    }
    /**
     * Create challenge block data for weekly challenges
     */
    static createChallengeBlockData(weekId) {
        return {
            challengeId: `challenge-${weekId}`,
            weekId,
            title: `Weekly Challenge ${weekId}`,
            description: 'Play the seeded mission and try to top the leaderboard!',
            seedLevel: {
                levelId: `seed-${weekId}`,
                title: `Challenge Level ${weekId}`,
                difficulty: 3, // Default challenge difficulty
            },
            leaderboard: [], // Will be populated by leaderboard service
            timeRemaining: this.getTimeRemainingForWeek(weekId),
            participantCount: 0, // Will be updated by analytics
        };
    }
    /**
     * Create landing block data
     */
    static createLandingBlockData() {
        return {
            appTitle: 'Galaxy Explorer',
            description: 'Build epic space levels and share them with the community',
            features: [
                'Create custom space missions',
                'Share with the community',
                'Play levels by other creators',
                'Compete in weekly challenges',
            ],
            communityHighlights: [], // Will be populated by community service
            statistics: {
                totalLevels: 0,
                activePlayers: 0,
                totalPlays: 0,
            },
        };
    }
    /**
     * Create community showcase block data
     */
    static createCommunityBlockData() {
        return {
            statistics: {
                totalLevels: 0,
                activePlayers: 0,
                totalCreators: 0,
                weeklyPlays: 0,
            },
            featuredCreators: [], // Will be populated by community service
            popularLevels: [], // Will be populated by community service
            communityEvents: [], // Will be populated by events service
        };
    }
    /**
     * Store block metadata for tracking
     */
    static async storeBlockMetadata(metadata) {
        const key = `block:metadata:${metadata.postId}`;
        await redis.set(key, JSON.stringify(metadata));
        // Set TTL for 90 days
        const TTL_SECONDS = 90 * 24 * 60 * 60;
        await redis.expire(key, TTL_SECONDS);
    }
    /**
     * Update block configuration
     */
    static async updateBlockConfig(postId, config) {
        await this.storeBlockConfig(postId, config);
    }
    /**
     * Update block metadata
     */
    static async updateBlockMetadata(postId, updates) {
        const key = `block:metadata:${postId}`;
        const existingStr = await redis.get(key);
        let metadata;
        if (existingStr) {
            metadata = { ...JSON.parse(existingStr), ...updates };
        }
        else {
            metadata = {
                postId,
                blockType: 'level-preview', // Default, should be overridden
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                viewCount: 0,
                interactionCount: 0,
                ...updates,
            };
        }
        await redis.set(key, JSON.stringify(metadata));
        // Set TTL for 90 days
        const TTL_SECONDS = 90 * 24 * 60 * 60;
        await redis.expire(key, TTL_SECONDS);
    }
    /**
     * Update user progress for a specific post/block
     */
    static async updateUserProgress(postId, progress) {
        // This would typically store user-specific progress
        // For now, we'll store it as a simple key-value pair
        const key = `block:progress:${postId}`;
        const existingStr = await redis.get(key);
        let existingProgress = {};
        if (existingStr) {
            try {
                existingProgress = JSON.parse(existingStr);
            }
            catch (error) {
                console.error('Error parsing existing progress:', error);
            }
        }
        const updatedProgress = { ...existingProgress, ...progress, updatedAt: Date.now() };
        await redis.set(key, JSON.stringify(updatedProgress));
        // Set TTL for 30 days
        const TTL_SECONDS = 30 * 24 * 60 * 60;
        await redis.expire(key, TTL_SECONDS);
    }
    /**
     * Get user progress for a specific post/block
     */
    static async getUserProgress(postId) {
        const key = `block:progress:${postId}`;
        const progressStr = await redis.get(key);
        if (!progressStr) {
            return null;
        }
        try {
            return JSON.parse(progressStr);
        }
        catch (error) {
            console.error('Error parsing user progress:', error);
            return null;
        }
    }
    /**
     * Calculate time remaining for a weekly challenge
     */
    static getTimeRemainingForWeek(weekId) {
        // Parse weekId format: YYYY-WNN
        const parts = weekId.split('-W');
        if (parts.length !== 2) {
            return 0; // Invalid format
        }
        const yearStr = parts[0];
        const weekStr = parts[1];
        if (!yearStr || !weekStr) {
            return 0; // Missing parts
        }
        const year = parseInt(yearStr, 10);
        const weekNum = parseInt(weekStr, 10);
        if (isNaN(year) || isNaN(weekNum)) {
            return 0; // Invalid numbers
        }
        // Calculate end of week (Sunday 23:59:59 UTC)
        const firstThursday = new Date(Date.UTC(year, 0, 1));
        const day = firstThursday.getUTCDay();
        const offset = day <= 4 ? 4 - day : 11 - day;
        firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
        const weekStart = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 24 * 3600 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000 - 1);
        return Math.max(0, weekEnd.getTime() - Date.now());
    }
}
