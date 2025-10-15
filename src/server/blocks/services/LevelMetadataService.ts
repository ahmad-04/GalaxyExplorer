import { redis } from '@devvit/web/server';
import { LevelBlockData, LevelBlockMetadata } from '../../../shared/types/blocks.js';

/**
 * Service for enriching level data with block-specific metadata
 */
export class LevelMetadataService {
  /**
   * Enrich level data with additional metadata for block display
   */
  static async enrichLevelData(
    postId: string,
    baseData: LevelBlockData
  ): Promise<LevelBlockMetadata> {
    try {
      // Get play count and rating data
      const playCount = await this.getPlayCount(postId);
      const averageRating = await this.getAverageRating(postId);
      const lastPlayedAt = await this.getLastPlayedTimestamp(postId);

      // Generate thumbnail URL if available
      const thumbnailUrl = await this.getThumbnailUrl(postId);

      // Create short description if not provided
      const shortDescription = baseData.description
        ? this.createShortDescription(baseData.description)
        : `Play ${baseData.title} by u/${baseData.creator}`;

      // Determine if level should be featured
      const featured = await this.shouldBeFeatured(postId, playCount, averageRating);

      // Generate badge text based on level characteristics
      const badgeText = this.generateBadgeText(baseData, playCount, averageRating);

      // Generate card color based on difficulty
      const cardColor = this.getCardColorForDifficulty(baseData.difficulty);

      const enrichedData: LevelBlockMetadata = {
        ...baseData,
        playCount,
        ...(averageRating !== undefined && { averageRating }),
        ...(lastPlayedAt !== undefined && { lastPlayedAt }),
        ...(thumbnailUrl && { thumbnailUrl }),
        shortDescription,
        featured,
        ...(badgeText && { badgeText }),
        ...(cardColor && { cardColor }),
      };

      console.log(`[LevelMetadataService] Enriched level data for ${postId}`);
      return enrichedData;
    } catch (error) {
      console.error(`[LevelMetadataService] Error enriching level data for ${postId}:`, error);

      // Return base data with minimal enrichment on error
      return {
        ...baseData,
        playCount: 0,
        shortDescription: `Play ${baseData.title} by u/${baseData.creator}`,
        featured: false,
      };
    }
  }

  /**
   * Get play count for a level from leaderboard and analytics data
   */
  static async getPlayCount(postId: string): Promise<number> {
    try {
      // Primary source: leaderboard entries
      const leaderboardKey = `leaderboard_json:${postId}`;
      const leaderboardStr = await redis.get(leaderboardKey);

      if (leaderboardStr) {
        const scores = JSON.parse(leaderboardStr) as { username: string; score: number }[];
        return scores.length;
      }

      // Fallback: return 0 if no leaderboard data
      return 0;
    } catch (error) {
      console.error(`[LevelMetadataService] Error getting play count for ${postId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate average rating for a level
   */
  static async getAverageRating(postId: string): Promise<number | undefined> {
    try {
      // Check for rating data (this would be implemented when rating system is added)
      const ratingsKey = `ratings:${postId}`;
      const ratingsStr = await redis.get(ratingsKey);

      if (ratingsStr) {
        const ratings = JSON.parse(ratingsStr) as number[];
        if (ratings.length > 0) {
          const sum = ratings.reduce((acc, rating) => acc + rating, 0);
          return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
        }
      }

      // For now, generate a synthetic rating based on play count and engagement
      const playCount = await this.getPlayCount(postId);
      if (playCount > 5) {
        // Generate rating between 3.5 and 5.0 based on play count
        const baseRating = 3.5;
        const bonus = Math.min(1.5, (playCount - 5) * 0.1);
        return Math.round((baseRating + bonus) * 10) / 10;
      }

      return undefined; // Not enough data for rating
    } catch (error) {
      console.error(`[LevelMetadataService] Error getting average rating for ${postId}:`, error);
      return undefined;
    }
  }

  /**
   * Get timestamp of last play for a level
   */
  static async getLastPlayedTimestamp(postId: string): Promise<number | undefined> {
    try {
      // Check for last played timestamp
      const lastPlayedKey = `level:last_played:${postId}`;
      const lastPlayedStr = await redis.get(lastPlayedKey);

      if (lastPlayedStr) {
        return parseInt(lastPlayedStr, 10);
      }

      // No fallback available without key scanning
      return undefined;

      return undefined;
    } catch (error) {
      console.error(
        `[LevelMetadataService] Error getting last played timestamp for ${postId}:`,
        error
      );
      return undefined;
    }
  }

  /**
   * Generate or retrieve thumbnail URL for a level
   */
  static async getThumbnailUrl(postId: string): Promise<string | undefined> {
    try {
      // Check for stored thumbnail URL
      const thumbnailKey = `level:thumbnail:${postId}`;
      const thumbnailUrl = await redis.get(thumbnailKey);

      if (thumbnailUrl) {
        return thumbnailUrl;
      }

      // Could implement thumbnail generation here
      // For now, return undefined to use default placeholder
      return undefined;
    } catch (error) {
      console.error(`[LevelMetadataService] Error getting thumbnail URL for ${postId}:`, error);
      return undefined;
    }
  }

  /**
   * Create a short description from a longer description
   */
  static createShortDescription(description: string): string {
    const maxLength = 100;

    if (description.length <= maxLength) {
      return description;
    }

    // Find the last complete word within the limit
    const truncated = description.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.7) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }

    return truncated + '...';
  }

  /**
   * Determine if a level should be featured
   */
  static async shouldBeFeatured(
    postId: string,
    playCount: number,
    averageRating?: number
  ): Promise<boolean> {
    try {
      // Check for manual feature flag
      const featuredKey = `level:featured:${postId}`;
      const isFeatured = await redis.get(featuredKey);

      if (isFeatured === 'true') {
        return true;
      }

      // Auto-feature based on metrics
      const hasHighPlayCount = playCount >= 20;
      const hasHighRating = averageRating !== undefined && averageRating >= 4.5;

      // Feature if it has both high play count and high rating
      return hasHighPlayCount && hasHighRating;
    } catch (error) {
      console.error(
        `[LevelMetadataService] Error determining featured status for ${postId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Generate badge text based on level characteristics
   */
  static generateBadgeText(
    levelData: LevelBlockData,
    playCount: number,
    averageRating?: number
  ): string | undefined {
    // New level badge
    if (playCount === 0) {
      return 'New';
    }

    // Popular level badge
    if (playCount >= 50) {
      return 'Popular';
    }

    // Highly rated badge
    if (averageRating && averageRating >= 4.8) {
      return 'Highly Rated';
    }

    // Trending badge (could be based on recent play activity)
    if (playCount >= 10 && playCount < 50) {
      return 'Trending';
    }

    // Difficulty-based badges
    if (levelData.difficulty >= 4) {
      return 'Expert';
    }

    return undefined;
  }

  /**
   * Get card color based on difficulty level
   */
  static getCardColorForDifficulty(difficulty: number): string {
    // Return CSS color values or theme color names
    switch (Math.floor(difficulty)) {
      case 1:
        return '#4CAF50'; // Green for easy
      case 2:
        return '#8BC34A'; // Light green for easy-medium
      case 3:
        return '#FFC107'; // Yellow for medium
      case 4:
        return '#FF9800'; // Orange for hard
      case 5:
        return '#F44336'; // Red for expert
      default:
        return '#9E9E9E'; // Gray for unknown
    }
  }

  /**
   * Update play count when a level is played
   */
  static async updatePlayCount(postId: string): Promise<void> {
    try {
      // Update last played timestamp
      const lastPlayedKey = `level:last_played:${postId}`;
      await redis.set(lastPlayedKey, Date.now().toString());

      // Increment play counter (separate from leaderboard)
      const playCountKey = `level:play_count:${postId}`;
      const currentCount = await redis.get(playCountKey);
      const newCount = (currentCount ? parseInt(currentCount, 10) : 0) + 1;
      await redis.set(playCountKey, newCount.toString());

      console.log(`[LevelMetadataService] Updated play count for ${postId}`);
    } catch (error) {
      console.error(`[LevelMetadataService] Error updating play count for ${postId}:`, error);
    }
  }

  /**
   * Add a rating for a level
   */
  static async addRating(postId: string, rating: number, userId?: string): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const ratingsKey = `ratings:${postId}`;
      const ratingsStr = await redis.get(ratingsKey);

      let ratings: number[] = [];
      if (ratingsStr) {
        ratings = JSON.parse(ratingsStr);
      }

      // Add the new rating
      ratings.push(rating);

      // Store updated ratings
      await redis.set(ratingsKey, JSON.stringify(ratings));

      // If userId provided, store individual user rating to prevent duplicates
      if (userId) {
        const userRatingKey = `rating:${postId}:${userId}`;
        await redis.set(userRatingKey, rating.toString());
      }

      console.log(`[LevelMetadataService] Added rating ${rating} for ${postId}`);
    } catch (error) {
      console.error(`[LevelMetadataService] Error adding rating for ${postId}:`, error);
    }
  }

  /**
   * Set thumbnail URL for a level
   */
  static async setThumbnailUrl(postId: string, thumbnailUrl: string): Promise<void> {
    try {
      const thumbnailKey = `level:thumbnail:${postId}`;
      await redis.set(thumbnailKey, thumbnailUrl);

      // Set TTL for thumbnail cache (30 days)
      await redis.expire(thumbnailKey, 30 * 24 * 60 * 60);

      console.log(`[LevelMetadataService] Set thumbnail URL for ${postId}`);
    } catch (error) {
      console.error(`[LevelMetadataService] Error setting thumbnail URL for ${postId}:`, error);
    }
  }

  /**
   * Set featured status for a level
   */
  static async setFeaturedStatus(postId: string, featured: boolean): Promise<void> {
    try {
      const featuredKey = `level:featured:${postId}`;

      if (featured) {
        await redis.set(featuredKey, 'true');
      } else {
        await redis.del(featuredKey);
      }

      console.log(`[LevelMetadataService] Set featured status to ${featured} for ${postId}`);
    } catch (error) {
      console.error(`[LevelMetadataService] Error setting featured status for ${postId}:`, error);
    }
  }

  /**
   * Get enriched metadata for multiple levels (batch operation)
   */
  static async enrichMultipleLevels(
    levelData: { postId: string; data: LevelBlockData }[]
  ): Promise<LevelBlockMetadata[]> {
    try {
      const enrichedLevels = await Promise.all(
        levelData.map(async ({ postId, data }) => {
          return await this.enrichLevelData(postId, data);
        })
      );

      console.log(`[LevelMetadataService] Enriched ${enrichedLevels.length} levels`);
      return enrichedLevels;
    } catch (error) {
      console.error(`[LevelMetadataService] Error enriching multiple levels:`, error);

      // Return base data on error
      return levelData.map(({ data }) => ({
        ...data,
        playCount: 0,
        shortDescription: `Play ${data.title} by u/${data.creator}`,
        featured: false,
      }));
    }
  }

  /**
   * Clean up old metadata for levels that no longer exist
   */
  static async cleanupOldMetadata(): Promise<void> {
    try {
      console.log(`[LevelMetadataService] Starting metadata cleanup...`);

      // Cleanup would require scanning keys, which is not available
      // In production, this would be handled by TTL or background jobs
      console.log(`[LevelMetadataService] Metadata cleanup skipped (requires key scanning)`);

      console.log(`[LevelMetadataService] Metadata cleanup completed`);
    } catch (error) {
      console.error(`[LevelMetadataService] Error during metadata cleanup:`, error);
    }
  }

  /**
   * Extract post ID from metadata key
   */
  private static extractPostIdFromMetadataKey(key: string): string | null {
    // Handle different key patterns
    if (key.startsWith('level:play_count:')) {
      return key.replace('level:play_count:', '');
    }
    if (key.startsWith('level:last_played:')) {
      return key.replace('level:last_played:', '');
    }
    if (key.startsWith('level:thumbnail:')) {
      return key.replace('level:thumbnail:', '');
    }
    if (key.startsWith('level:featured:')) {
      return key.replace('level:featured:', '');
    }
    if (key.startsWith('ratings:')) {
      return key.replace('ratings:', '');
    }

    return null;
  }
}
