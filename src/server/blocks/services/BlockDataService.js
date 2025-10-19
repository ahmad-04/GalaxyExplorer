import { redis } from '@devvit/web/server';
import { BLOCK_CACHE_KEYS, } from '../../../shared/types/blocks.js';
import { LevelMetadataService } from './LevelMetadataService.js';
import { BlockCacheService } from './BlockCacheService.js';
import { BlockErrorService, BlockErrorType } from './BlockErrorService.js';
/**
 * Configuration for cache TTL values
 */
const CACHE_TTL = {
    LEVEL_METADATA: 60 * 60, // 1 hour
    CHALLENGE_DATA: 5 * 60, // 5 minutes (more dynamic)
    COMMUNITY_STATS: 15 * 60, // 15 minutes
    LANDING_DATA: 30 * 60, // 30 minutes
};
/**
 * Service for fetching and caching block content data
 */
export class BlockDataService {
    /**
     * Fetch block data for a given post ID and block type with error handling
     */
    static async getBlockData(postId, blockType, forceRefresh = false) {
        return await BlockErrorService.withRetry(async () => {
            try {
                switch (blockType) {
                    case 'level-preview':
                        return await this.getLevelBlockData(postId, forceRefresh);
                    case 'weekly-challenge':
                        return await this.getChallengeBlockData(postId, forceRefresh);
                    case 'landing':
                        return await this.getLandingBlockData(forceRefresh);
                    case 'community-showcase':
                        return await this.getCommunityBlockData(forceRefresh);
                    default:
                        throw BlockErrorService.createError(BlockErrorType.VALIDATION_ERROR, `Unsupported block type: ${blockType}`, { blockType, postId });
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    throw BlockErrorService.createError(BlockErrorType.DATA_FETCH_ERROR, `Failed to fetch block data: ${error.message}`, { blockType, postId, originalError: error.message });
                }
                throw error;
            }
        });
    }
    /**
     * Fetch level block data with caching
     */
    static async getLevelBlockData(postId, forceRefresh = false) {
        const cacheKey = BLOCK_CACHE_KEYS.LEVEL_METADATA(postId);
        // Try cache first unless force refresh
        if (!forceRefresh) {
            const cached = await BlockCacheService.get(cacheKey);
            if (cached) {
                console.log(`[BlockDataService] Cache hit for level data: ${postId}`);
                return cached;
            }
        }
        try {
            // Fetch level data from existing Redis storage
            const levelStr = await redis.get(`level:${postId}`);
            const titleStr = await redis.get(`level:title:${postId}`);
            if (!levelStr || !titleStr) {
                console.warn(`[BlockDataService] No level data found for post: ${postId}`);
                return null;
            }
            // Parse level data to extract metadata
            let levelData;
            try {
                levelData = JSON.parse(levelStr);
            }
            catch (parseError) {
                console.error(`[BlockDataService] Failed to parse level data for ${postId}:`, parseError);
                return null;
            }
            // Extract creator from title (format: "u/username's LevelName")
            const creator = titleStr ? this.extractCreatorFromTitle(titleStr) : 'Anonymous';
            // Build base level block data
            const baseBlockData = {
                levelId: postId, // Use postId as levelId for published levels
                title: titleStr ? this.extractLevelNameFromTitle(titleStr) : 'Untitled Level',
                creator,
                difficulty: levelData.difficulty || 1,
                playCount: 0, // Will be enriched
                description: levelData.description ||
                    `Play ${titleStr ? this.extractLevelNameFromTitle(titleStr) : 'this level'} by u/${creator}`,
            };
            // Enrich with metadata
            const enrichedData = await LevelMetadataService.enrichLevelData(postId, baseBlockData);
            // Cache the enriched data
            await BlockCacheService.set(cacheKey, enrichedData, CACHE_TTL.LEVEL_METADATA);
            console.log(`[BlockDataService] Fetched and cached level data for: ${postId}`);
            return enrichedData;
        }
        catch (error) {
            console.error(`[BlockDataService] Error fetching level data for ${postId}:`, error);
            return null;
        }
    }
    /**
     * Fetch challenge block data with caching
     */
    static async getChallengeBlockData(postId, forceRefresh = false) {
        // Extract weekId from post data
        const weekId = await this.getWeekIdFromPost(postId);
        if (!weekId) {
            console.warn(`[BlockDataService] No weekId found for challenge post: ${postId}`);
            return null;
        }
        const cacheKey = BLOCK_CACHE_KEYS.CHALLENGE_DATA(weekId);
        // Try cache first unless force refresh
        if (!forceRefresh) {
            const cached = await BlockCacheService.get(cacheKey);
            if (cached) {
                console.log(`[BlockDataService] Cache hit for challenge data: ${weekId}`);
                return cached;
            }
        }
        try {
            // Get leaderboard data for this challenge
            const leaderboardKey = `leaderboard_json:${postId}`;
            const leaderboardStr = await redis.get(leaderboardKey);
            let leaderboard = [];
            if (leaderboardStr) {
                try {
                    const scores = JSON.parse(leaderboardStr);
                    leaderboard = scores.slice(0, 3).map((score, index) => ({
                        ...score,
                        rank: index + 1,
                    }));
                }
                catch (parseError) {
                    console.error(`[BlockDataService] Failed to parse leaderboard for ${weekId}:`, parseError);
                }
            }
            // Count participants
            const participantCount = await this.getParticipantCount(postId);
            // Calculate time remaining
            const timeRemaining = this.getTimeRemainingForWeek(weekId);
            const blockData = {
                challengeId: `challenge-${weekId}`,
                weekId,
                title: `Weekly Challenge ${weekId}`,
                description: 'Play the seeded mission and try to top the leaderboard!',
                seedLevel: {
                    levelId: `seed-${weekId}`,
                    title: `Challenge Level ${weekId}`,
                    difficulty: 3,
                },
                leaderboard,
                timeRemaining,
                participantCount,
            };
            // Cache with shorter TTL since leaderboard changes frequently
            await BlockCacheService.set(cacheKey, blockData, CACHE_TTL.CHALLENGE_DATA);
            console.log(`[BlockDataService] Fetched and cached challenge data for: ${weekId}`);
            return blockData;
        }
        catch (error) {
            console.error(`[BlockDataService] Error fetching challenge data for ${weekId}:`, error);
            return null;
        }
    }
    /**
     * Fetch landing block data with caching
     */
    static async getLandingBlockData(forceRefresh = false) {
        const cacheKey = 'block:landing:data';
        // Try cache first unless force refresh
        if (!forceRefresh) {
            const cached = await BlockCacheService.get(cacheKey);
            if (cached) {
                console.log(`[BlockDataService] Cache hit for landing data`);
                return cached;
            }
        }
        try {
            // Get community statistics
            const stats = await this.getCommunityStatistics();
            // Get recent community highlights (could be recent popular levels)
            const highlights = await this.getCommunityHighlights();
            const blockData = {
                appTitle: 'Galaxy Explorer',
                description: 'Build epic space levels and share them with the community',
                features: [
                    'Create custom space missions',
                    'Share with the community',
                    'Play levels by other creators',
                    'Compete in weekly challenges',
                ],
                communityHighlights: highlights,
                statistics: stats,
            };
            // Cache the data
            await BlockCacheService.set(cacheKey, blockData, CACHE_TTL.LANDING_DATA);
            console.log(`[BlockDataService] Fetched and cached landing data`);
            return blockData;
        }
        catch (error) {
            console.error(`[BlockDataService] Error fetching landing data:`, error);
            return null;
        }
    }
    /**
     * Fetch community showcase block data with caching
     */
    static async getCommunityBlockData(forceRefresh = false) {
        const cacheKey = BLOCK_CACHE_KEYS.COMMUNITY_STATS;
        // Try cache first unless force refresh
        if (!forceRefresh) {
            const cached = await BlockCacheService.get(cacheKey);
            if (cached) {
                console.log(`[BlockDataService] Cache hit for community data`);
                return cached;
            }
        }
        try {
            // Get comprehensive community statistics
            const stats = await this.getExtendedCommunityStatistics();
            // Get featured creators
            const featuredCreators = await this.getFeaturedCreators();
            // Get popular levels
            const popularLevels = await this.getPopularLevels();
            const blockData = {
                statistics: stats,
                featuredCreators,
                popularLevels,
                communityEvents: [], // Could be populated from a separate events system
            };
            // Cache the data
            await BlockCacheService.set(cacheKey, blockData, CACHE_TTL.COMMUNITY_STATS);
            console.log(`[BlockDataService] Fetched and cached community data`);
            return blockData;
        }
        catch (error) {
            console.error(`[BlockDataService] Error fetching community data:`, error);
            return null;
        }
    }
    /**
     * Invalidate cache for a specific block type and identifier
     */
    static async invalidateCache(blockType, identifier) {
        await BlockCacheService.invalidateBlockCache(blockType, identifier);
    }
    /**
     * Warm cache for popular content
     */
    static async warmCache() {
        await BlockCacheService.warmPopularContent();
    }
    // Helper methods
    /**
     * Extract creator username from post title
     */
    static extractCreatorFromTitle(title) {
        const match = title.match(/^u\/([^']+)'s/);
        return match && match[1] ? match[1] : 'Anonymous';
    }
    /**
     * Extract level name from post title
     */
    static extractLevelNameFromTitle(title) {
        const match = title.match(/^u\/[^']+['']s (.+)$/);
        return match && match[1] ? match[1] : title;
    }
    /**
     * Get play count for a level from leaderboard data
     */
    static async getPlayCountForLevel(postId) {
        try {
            const leaderboardKey = `leaderboard_json:${postId}`;
            const leaderboardStr = await redis.get(leaderboardKey);
            if (leaderboardStr) {
                const scores = JSON.parse(leaderboardStr);
                return scores.length;
            }
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting play count for ${postId}:`, error);
        }
        return 0;
    }
    /**
     * Get weekId from post data
     */
    static async getWeekIdFromPost(postId) {
        try {
            // This would typically come from the post's stored data
            // For now, we'll derive it from the current week
            const now = new Date();
            const year = now.getUTCFullYear();
            const firstThursday = new Date(Date.UTC(year, 0, 1));
            const day = firstThursday.getUTCDay();
            const offset = day <= 4 ? 4 - day : 11 - day;
            firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
            const week = Math.floor((now.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
            return `${year}-W${String(week).padStart(2, '0')}`;
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting weekId for post ${postId}:`, error);
            return null;
        }
    }
    /**
     * Get participant count for a challenge
     */
    static async getParticipantCount(postId) {
        try {
            const leaderboardKey = `leaderboard_json:${postId}`;
            const leaderboardStr = await redis.get(leaderboardKey);
            if (leaderboardStr) {
                const scores = JSON.parse(leaderboardStr);
                // Count unique usernames
                const uniqueUsers = new Set(scores.map((s) => s.username));
                return uniqueUsers.size;
            }
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting participant count for ${postId}:`, error);
        }
        return 0;
    }
    /**
     * Calculate time remaining for a weekly challenge
     */
    static getTimeRemainingForWeek(weekId) {
        try {
            const parts = weekId.split('-W');
            if (parts.length !== 2 || !parts[0] || !parts[1])
                return 0;
            const year = parseInt(parts[0], 10);
            const weekNum = parseInt(parts[1], 10);
            if (isNaN(year) || isNaN(weekNum))
                return 0;
            const firstThursday = new Date(Date.UTC(year, 0, 1));
            const day = firstThursday.getUTCDay();
            const offset = day <= 4 ? 4 - day : 11 - day;
            firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
            const weekStart = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 24 * 3600 * 1000);
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000 - 1);
            return Math.max(0, weekEnd.getTime() - Date.now());
        }
        catch (error) {
            console.error(`[BlockDataService] Error calculating time remaining for ${weekId}:`, error);
            return 0;
        }
    }
    /**
     * Get basic community statistics
     */
    static async getCommunityStatistics() {
        try {
            // Count total levels (simplified approach for now)
            // In production, this would use SCAN or maintained counters
            let totalLevels = 0;
            let activePlayers = 0;
            let totalPlays = 0;
            // For now, return estimated values based on available data
            // Try to get some actual data from known sources
            try {
                const globalLeaderboard = await redis.get('leaderboard_json');
                if (globalLeaderboard) {
                    const scores = JSON.parse(globalLeaderboard);
                    const uniqueUsers = new Set(scores.map((s) => s.username));
                    activePlayers = uniqueUsers.size;
                    totalPlays = scores.length;
                    totalLevels = Math.max(1, Math.floor(totalPlays / 10)); // Estimate levels
                }
            }
            catch (parseError) {
                // Use default values
                totalLevels = 5;
                activePlayers = 10;
                totalPlays = 50;
            }
            return { totalLevels, activePlayers, totalPlays };
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting community statistics:`, error);
            return { totalLevels: 0, activePlayers: 0, totalPlays: 0 };
        }
    }
    /**
     * Get community highlights (recent popular levels)
     */
    static async getCommunityHighlights() {
        try {
            const highlights = [];
            // For now, return empty highlights since we can't efficiently scan keys
            // In production, this would be maintained as a separate list
            return highlights;
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting community highlights:`, error);
            return [];
        }
    }
    /**
     * Get extended community statistics for showcase
     */
    static async getExtendedCommunityStatistics() {
        try {
            const basicStats = await this.getCommunityStatistics();
            // Estimate unique creators (simplified approach)
            const creatorSet = new Set();
            creatorSet.add('TestCreator1');
            creatorSet.add('TestCreator2');
            // Estimate weekly plays (could be more sophisticated with timestamps)
            const weeklyPlays = Math.floor(basicStats.totalPlays * 0.3); // Rough estimate
            return {
                totalLevels: basicStats.totalLevels,
                activePlayers: basicStats.activePlayers,
                totalCreators: creatorSet.size,
                weeklyPlays,
            };
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting extended community statistics:`, error);
            return { totalLevels: 0, activePlayers: 0, totalCreators: 0, weeklyPlays: 0 };
        }
    }
    /**
     * Get featured creators
     */
    static async getFeaturedCreators() {
        try {
            // For now, return sample featured creators
            // In production, this would be maintained as aggregated data
            const creatorMap = new Map();
            creatorMap.set('TestCreator1', { levelCount: 3, totalPlays: 25 });
            creatorMap.set('TestCreator2', { levelCount: 2, totalPlays: 18 });
            // Convert to array and sort by level count
            const featuredCreators = Array.from(creatorMap.entries())
                .map(([username, stats]) => ({
                username,
                levelCount: stats.levelCount,
                totalPlays: stats.totalPlays,
            }))
                .sort((a, b) => b.levelCount - a.levelCount)
                .slice(0, 5); // Top 5 creators
            return featuredCreators;
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting featured creators:`, error);
            return [];
        }
    }
    /**
     * Get popular levels
     */
    static async getPopularLevels() {
        try {
            // For now, return sample popular levels
            // In production, this would be maintained as aggregated data
            const levelPlayCounts = [
                { postId: 'sample1', title: 'Epic Space Battle', creator: 'TestCreator1', playCount: 25 },
                { postId: 'sample2', title: 'Asteroid Field', creator: 'TestCreator2', playCount: 18 },
            ];
            // Sort by play count and take top levels
            const popularLevels = levelPlayCounts
                .sort((a, b) => b.playCount - a.playCount)
                .slice(0, 5)
                .map((level) => ({
                levelId: level.postId,
                title: level.title,
                creator: level.creator,
                playCount: level.playCount,
            }));
            return popularLevels;
        }
        catch (error) {
            console.error(`[BlockDataService] Error getting popular levels:`, error);
            return [];
        }
    }
}
