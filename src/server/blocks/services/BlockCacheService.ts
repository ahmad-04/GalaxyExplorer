import { redis } from '@devvit/web/server';
import { BlockConfig, BlockData, BLOCK_CACHE_KEYS } from '../../../shared/types/blocks.js';

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIG = {
  // Block data TTLs
  LEVEL_METADATA: { ttl: 60 * 60, warmThreshold: 10 }, // 1 hour, warm if 10+ plays
  CHALLENGE_DATA: { ttl: 5 * 60, warmThreshold: 5 }, // 5 minutes, warm if 5+ participants
  COMMUNITY_STATS: { ttl: 15 * 60, warmThreshold: 1 }, // 15 minutes, always warm
  LANDING_DATA: { ttl: 30 * 60, warmThreshold: 1 }, // 30 minutes, always warm

  // Performance monitoring
  CACHE_STATS: { ttl: 24 * 60 * 60 }, // 24 hours for stats

  // Cache warming
  WARM_BATCH_SIZE: 10,
  WARM_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Cache performance metrics
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  lastUpdated: number;
}

/**
 * Cache warming strategy
 */
interface CacheWarmingStrategy {
  enabled: boolean;
  patterns: string[];
  batchSize: number;
  intervalMs: number;
}

/**
 * Service for managing Redis caching with performance optimization
 */
export class BlockCacheService {
  private static warmingInterval: NodeJS.Timeout | null = null;
  private static isWarming = false;

  /**
   * Get cached block data with performance tracking
   */
  static async get<T extends BlockData>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      const cached = await redis.get(key);
      const duration = Date.now() - startTime;

      if (cached) {
        await this.recordCacheHit(key, duration);
        console.log(`[BlockCacheService] Cache HIT for ${key} (${duration}ms)`);
        return JSON.parse(cached) as T;
      } else {
        await this.recordCacheMiss(key);
        console.log(`[BlockCacheService] Cache MISS for ${key}`);
        return null;
      }
    } catch (error) {
      await this.recordCacheError(key, error);
      console.error(`[BlockCacheService] Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached block data with TTL and performance tracking
   */
  static async set<T extends BlockData>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    try {
      const startTime = Date.now();
      await redis.set(key, JSON.stringify(data));

      if (ttlSeconds) {
        await redis.expire(key, ttlSeconds);
      }

      const duration = Date.now() - startTime;
      await this.recordCacheSet(key, duration);

      console.log(
        `[BlockCacheService] Cache SET for ${key} with TTL ${ttlSeconds}s (${duration}ms)`
      );
    } catch (error) {
      await this.recordCacheError(key, error);
      console.error(`[BlockCacheService] Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete cached data with performance tracking
   */
  static async delete(key: string): Promise<void> {
    try {
      const startTime = Date.now();
      await redis.del(key);
      const duration = Date.now() - startTime;

      await this.recordCacheDelete(key, duration);
      console.log(`[BlockCacheService] Cache DELETE for ${key} (${duration}ms)`);
    } catch (error) {
      await this.recordCacheError(key, error);
      console.error(`[BlockCacheService] Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache for a specific block type and identifier
   */
  static async invalidateBlockCache(
    blockType: BlockConfig['type'],
    identifier?: string
  ): Promise<void> {
    try {
      console.log(
        `[BlockCacheService] Invalidating cache for ${blockType}${identifier ? ` (${identifier})` : ''}`
      );

      const keysToDelete: string[] = [];

      switch (blockType) {
        case 'level-preview':
          if (identifier) {
            keysToDelete.push(
              BLOCK_CACHE_KEYS.LEVEL_METADATA(identifier),
              BLOCK_CACHE_KEYS.BLOCK_CONFIG(identifier)
            );
          }
          break;

        case 'weekly-challenge':
          if (identifier) {
            keysToDelete.push(BLOCK_CACHE_KEYS.CHALLENGE_DATA(identifier));
          }
          break;

        case 'landing':
          keysToDelete.push('block:landing:data');
          break;

        case 'community-showcase':
          keysToDelete.push(BLOCK_CACHE_KEYS.COMMUNITY_STATS);
          break;
      }

      // Delete all identified keys
      for (const key of keysToDelete) {
        await this.delete(key);
      }

      // Also invalidate related caches
      await this.invalidateRelatedCaches(blockType);

      console.log(
        `[BlockCacheService] Invalidated ${keysToDelete.length} cache keys for ${blockType}`
      );
    } catch (error) {
      console.error(`[BlockCacheService] Error invalidating cache for ${blockType}:`, error);
    }
  }

  /**
   * Invalidate related caches when data changes
   */
  static async invalidateRelatedCaches(
    blockType: BlockConfig['type'],
    identifier?: string
  ): Promise<void> {
    try {
      // When level data changes, also invalidate community stats
      if (blockType === 'level-preview') {
        await this.delete(BLOCK_CACHE_KEYS.COMMUNITY_STATS);
        await this.delete('block:landing:data');
      }

      // When challenge data changes, invalidate community stats
      if (blockType === 'weekly-challenge') {
        await this.delete(BLOCK_CACHE_KEYS.COMMUNITY_STATS);
      }

      console.log(`[BlockCacheService] Invalidated related caches for ${blockType}`);
    } catch (error) {
      console.error(`[BlockCacheService] Error invalidating related caches:`, error);
    }
  }

  /**
   * Batch invalidate multiple cache keys
   */
  static async batchInvalidate(keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;

      console.log(`[BlockCacheService] Batch invalidating ${keys.length} cache keys`);

      // Delete keys individually (Redis client doesn't support pipeline)
      for (const key of keys) {
        await redis.del(key);
      }

      console.log(`[BlockCacheService] Batch invalidation completed`);
    } catch (error) {
      console.error(`[BlockCacheService] Error in batch invalidation:`, error);
    }
  }

  /**
   * Warm cache for popular content
   */
  static async warmPopularContent(): Promise<void> {
    if (this.isWarming) {
      console.log(`[BlockCacheService] Cache warming already in progress, skipping`);
      return;
    }

    try {
      this.isWarming = true;
      console.log(`[BlockCacheService] Starting cache warming for popular content`);

      // Warm community stats (always needed)
      await this.warmCommunityData();

      // Warm landing data (always needed)
      await this.warmLandingData();

      // Warm popular levels
      await this.warmPopularLevels();

      // Warm active challenges
      await this.warmActiveChallenges();

      console.log(`[BlockCacheService] Cache warming completed`);
    } catch (error) {
      console.error(`[BlockCacheService] Error during cache warming:`, error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Start automatic cache warming
   */
  static startCacheWarming(strategy?: Partial<CacheWarmingStrategy>): void {
    const config = {
      enabled: true,
      patterns: ['level:*', 'leaderboard_json:*'],
      batchSize: CACHE_CONFIG.WARM_BATCH_SIZE,
      intervalMs: CACHE_CONFIG.WARM_INTERVAL,
      ...strategy,
    };

    if (!config.enabled) {
      console.log(`[BlockCacheService] Cache warming disabled`);
      return;
    }

    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }

    this.warmingInterval = setInterval(async () => {
      await this.warmPopularContent();
    }, config.intervalMs);

    console.log(`[BlockCacheService] Cache warming started with ${config.intervalMs}ms interval`);
  }

  /**
   * Stop automatic cache warming
   */
  static stopCacheWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      console.log(`[BlockCacheService] Cache warming stopped`);
    }
  }

  /**
   * Get cache performance metrics
   */
  static async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      const metricsKey = 'cache:metrics:blocks';
      const metricsStr = await redis.get(metricsKey);

      if (metricsStr) {
        return JSON.parse(metricsStr) as CacheMetrics;
      }

      // Return default metrics if none exist
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error(`[BlockCacheService] Error getting cache metrics:`, error);
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Reset cache performance metrics
   */
  static async resetCacheMetrics(): Promise<void> {
    try {
      const metricsKey = 'cache:metrics:blocks';
      const resetMetrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        lastUpdated: Date.now(),
      };

      await redis.set(metricsKey, JSON.stringify(resetMetrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);

      console.log(`[BlockCacheService] Cache metrics reset`);
    } catch (error) {
      console.error(`[BlockCacheService] Error resetting cache metrics:`, error);
    }
  }

  /**
   * Get cache hit ratio
   */
  static async getCacheHitRatio(): Promise<number> {
    try {
      const metrics = await this.getCacheMetrics();
      const total = metrics.hits + metrics.misses;

      if (total === 0) return 0;

      return metrics.hits / total;
    } catch (error) {
      console.error(`[BlockCacheService] Error calculating cache hit ratio:`, error);
      return 0;
    }
  }

  // Private helper methods

  /**
   * Record cache hit with performance tracking
   */
  private static async recordCacheHit(_key: string, duration: number): Promise<void> {
    try {
      const metrics = await this.getCacheMetrics();
      metrics.hits += 1;
      metrics.lastUpdated = Date.now();

      const metricsKey = 'cache:metrics:blocks';
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);

      // Record performance data
      await this.recordPerformanceMetric('hit', duration);
    } catch (error) {
      // Don't throw errors for metrics recording
      console.error(`[BlockCacheService] Error recording cache hit:`, error);
    }
  }

  /**
   * Record cache miss
   */
  private static async recordCacheMiss(_key: string): Promise<void> {
    try {
      const metrics = await this.getCacheMetrics();
      metrics.misses += 1;
      metrics.lastUpdated = Date.now();

      const metricsKey = 'cache:metrics:blocks';
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);
    } catch (error) {
      console.error(`[BlockCacheService] Error recording cache miss:`, error);
    }
  }

  /**
   * Record cache set operation
   */
  private static async recordCacheSet(_key: string, duration: number): Promise<void> {
    try {
      const metrics = await this.getCacheMetrics();
      metrics.sets += 1;
      metrics.lastUpdated = Date.now();

      const metricsKey = 'cache:metrics:blocks';
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);

      await this.recordPerformanceMetric('set', duration);
    } catch (error) {
      console.error(`[BlockCacheService] Error recording cache set:`, error);
    }
  }

  /**
   * Record cache delete operation
   */
  private static async recordCacheDelete(_key: string, duration: number): Promise<void> {
    try {
      const metrics = await this.getCacheMetrics();
      metrics.deletes += 1;
      metrics.lastUpdated = Date.now();

      const metricsKey = 'cache:metrics:blocks';
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);

      await this.recordPerformanceMetric('delete', duration);
    } catch (error) {
      console.error(`[BlockCacheService] Error recording cache delete:`, error);
    }
  }

  /**
   * Record cache error
   */
  private static async recordCacheError(_key: string, _error: unknown): Promise<void> {
    try {
      const metrics = await this.getCacheMetrics();
      metrics.errors += 1;
      metrics.lastUpdated = Date.now();

      const metricsKey = 'cache:metrics:blocks';
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, CACHE_CONFIG.CACHE_STATS.ttl);
    } catch (metricsError) {
      console.error(`[BlockCacheService] Error recording cache error:`, metricsError);
    }
  }

  /**
   * Record performance metrics
   */
  private static async recordPerformanceMetric(operation: string, duration: number): Promise<void> {
    try {
      const perfKey = `cache:perf:${operation}`;

      // Store performance data as a simple counter for now
      const countKey = `${perfKey}:count`;
      const currentCount = await redis.get(countKey);
      const newCount = (currentCount ? parseInt(currentCount, 10) : 0) + 1;
      await redis.set(countKey, newCount.toString());
      await redis.expire(perfKey, CACHE_CONFIG.CACHE_STATS.ttl);
    } catch (error) {
      // Don't throw errors for performance recording
      console.error(`[BlockCacheService] Error recording performance metric:`, error);
    }
  }

  /**
   * Warm community data cache
   */
  private static async warmCommunityData(): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { BlockDataService } = await import('./BlockDataService.js');

      await BlockDataService.getCommunityBlockData(true);
      console.log(`[BlockCacheService] Warmed community data cache`);
    } catch (error) {
      console.error(`[BlockCacheService] Error warming community data:`, error);
    }
  }

  /**
   * Warm landing data cache
   */
  private static async warmLandingData(): Promise<void> {
    try {
      const { BlockDataService } = await import('./BlockDataService.js');

      await BlockDataService.getLandingBlockData(true);
      console.log(`[BlockCacheService] Warmed landing data cache`);
    } catch (error) {
      console.error(`[BlockCacheService] Error warming landing data:`, error);
    }
  }

  /**
   * Warm popular levels cache
   */
  private static async warmPopularLevels(): Promise<void> {
    try {
      // Get popular level posts based on leaderboard activity
      // Note: Using scan pattern for better performance in production
      const leaderboardKeys: string[] = [];
      // For now, we'll use a simpler approach without keys() method

      // Sort by activity and warm top levels
      const levelActivity: { postId: string; activity: number }[] = [];

      for (const key of leaderboardKeys.slice(0, CACHE_CONFIG.WARM_BATCH_SIZE)) {
        const postId = key.replace('leaderboard_json:', '');
        const leaderboardStr = await redis.get(key);

        if (leaderboardStr) {
          try {
            const scores = JSON.parse(leaderboardStr) as { username: string; score: number }[];
            levelActivity.push({ postId, activity: scores.length });
          } catch (parseError) {
            // Skip invalid data
          }
        }
      }

      // Sort by activity and warm top levels
      levelActivity.sort((a, b) => b.activity - a.activity);

      const { BlockDataService } = await import('./BlockDataService.js');

      for (const { postId } of levelActivity.slice(0, 5)) {
        await BlockDataService.getLevelBlockData(postId, true);
      }

      console.log(
        `[BlockCacheService] Warmed ${Math.min(5, levelActivity.length)} popular level caches`
      );
    } catch (error) {
      console.error(`[BlockCacheService] Error warming popular levels:`, error);
    }
  }

  /**
   * Warm active challenges cache
   */
  private static async warmActiveChallenges(): Promise<void> {
    try {
      // Find challenge posts (would need to be identified by post data)
      // For now, warm current week's challenge
      const now = new Date();
      const year = now.getUTCFullYear();
      const firstThursday = new Date(Date.UTC(year, 0, 1));
      const day = firstThursday.getUTCDay();
      const offset = day <= 4 ? 4 - day : 11 - day;
      firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
      const week =
        Math.floor((now.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
      const weekId = `${year}-W${String(week).padStart(2, '0')}`;

      const { BlockDataService } = await import('./BlockDataService.js');

      // This would need the actual challenge post ID
      // For now, just warm the challenge data structure
      const challengeKey = BLOCK_CACHE_KEYS.CHALLENGE_DATA(weekId);
      const cached = await this.get(challengeKey);

      if (!cached) {
        // Would warm with actual challenge post ID when available
        console.log(`[BlockCacheService] No active challenge cache to warm for ${weekId}`);
      }

      console.log(`[BlockCacheService] Warmed active challenge cache`);
    } catch (error) {
      console.error(`[BlockCacheService] Error warming active challenges:`, error);
    }
  }
}
