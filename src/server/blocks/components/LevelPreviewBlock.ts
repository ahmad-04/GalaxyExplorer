import { LevelBlockData, BlockConfig } from '../../../shared/types/blocks.js';
import {
  createBaseBlockConfig,
  createBlockHeader,
  createDifficultyIndicator,
  createThumbnailConfig,
  createStatsDisplay,
  createBlockActions,
  createLoadingState,
  createErrorState,
} from './BaseBlock.js';

/**
 * Level preview block component with level metadata display
 * Following Pixelary patterns for card-based level presentation
 */
export class LevelPreviewBlock {
  /**
   * Create a complete level preview block configuration
   */
  static createBlockConfig(config: BlockConfig): any {
    const levelData = config.data as LevelBlockData;

    // Create base block structure
    const baseConfig = createBaseBlockConfig(config);

    // Create header with title and creator
    const header = createBlockHeader(config);

    // Create difficulty indicator
    const difficulty = createDifficultyIndicator(levelData.difficulty);

    // Create thumbnail configuration
    const thumbnailArgs: {
      url?: string;
      width?: number;
      height?: number;
      alt?: string;
    } = {
      width: 80,
      height: 60,
      alt: `${levelData.title} thumbnail`,
    };

    if (levelData.thumbnailUrl) {
      thumbnailArgs.url = levelData.thumbnailUrl;
    }

    const thumbnail = createThumbnailConfig(thumbnailArgs);

    // Create statistics display
    const stats = this.createLevelStats(levelData);

    // Create action buttons
    const actions = createBlockActions(config);

    return {
      ...baseConfig,
      components: [
        header,
        {
          type: 'content',
          layout: 'level-preview',
          thumbnail,
          difficulty,
          stats,
          description: levelData.description,
        },
        actions,
      ],
    };
  }

  /**
   * Create level statistics configuration
   */
  private static createLevelStats(levelData: LevelBlockData) {
    const stats = [
      {
        label: 'Plays',
        value: this.formatPlayCount(levelData.playCount),
        icon: '▶️',
      },
    ];

    // Add rating if available
    if (levelData.rating !== undefined) {
      stats.push({
        label: 'Rating',
        value: `${levelData.rating.toFixed(1)}/5`,
        icon: '⭐',
      });
    }

    return createStatsDisplay(stats);
  }

  /**
   * Format play count for display (e.g., 1.2K, 5.3M)
   */
  private static formatPlayCount(count: number): string {
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return `${(count / 1000000).toFixed(1)}M`;
    }
  }

  /**
   * Create loading state for level preview block
   */
  static createLoadingBlock(): any {
    return {
      type: 'level-preview-loading',
      components: [createLoadingState()],
      style: {
        padding: 'medium',
        cornerRadius: 'medium',
        backgroundColor: 'neutral-background-weak',
        border: 'thin',
        borderColor: 'neutral-border',
      },
    };
  }

  /**
   * Create error state for level preview block
   */
  static createErrorBlock(error: string): any {
    return {
      type: 'level-preview-error',
      components: [createErrorState(error)],
      style: {
        padding: 'medium',
        cornerRadius: 'medium',
        backgroundColor: 'neutral-background-weak',
        border: 'thin',
        borderColor: 'neutral-border',
      },
    };
  }

  /**
   * Create level preview block with enhanced metadata
   */
  static createEnhancedBlockConfig(
    config: BlockConfig,
    options?: {
      showCreatorAvatar?: boolean;
      showLastPlayed?: boolean;
      showTags?: boolean;
    }
  ): any {
    const levelData = config.data as LevelBlockData;
    const baseBlock = this.createBlockConfig(config);

    // Add enhanced features if requested
    if (options?.showCreatorAvatar) {
      // Add creator avatar to header
      baseBlock.components[0].creatorAvatar = {
        type: 'avatar',
        username: levelData.creator,
        size: 'small',
      };
    }

    if (options?.showLastPlayed && 'lastPlayedAt' in levelData) {
      // Add last played timestamp
      const lastPlayed = (levelData as any).lastPlayedAt;
      if (lastPlayed) {
        baseBlock.components[1].lastPlayed = {
          type: 'timestamp',
          value: lastPlayed,
          format: 'relative',
        };
      }
    }

    if (options?.showTags && 'tags' in levelData) {
      // Add level tags
      const tags = (levelData as any).tags;
      if (tags && tags.length > 0) {
        baseBlock.components[1].tags = {
          type: 'tags',
          items: tags.slice(0, 3), // Limit to 3 tags for space
          style: {
            size: 'small',
            color: 'secondary',
          },
        };
      }
    }

    return baseBlock;
  }

  /**
   * Create compact level preview for use in carousels or lists
   */
  static createCompactBlockConfig(config: BlockConfig): any {
    const levelData = config.data as LevelBlockData;

    return {
      type: 'level-preview-compact',
      style: {
        padding: 'small',
        cornerRadius: 'small',
        backgroundColor: 'neutral-background-weak',
        border: 'thin',
        borderColor: 'neutral-border',
        width: '100%',
      },
      components: [
        {
          type: 'compact-header',
          title: levelData.title,
          creator: levelData.creator,
          difficulty: createDifficultyIndicator(levelData.difficulty),
          style: {
            titleSize: 'medium',
            titleWeight: 'bold',
            creatorSize: 'small',
            creatorColor: 'secondary',
          },
        },
        {
          type: 'compact-stats',
          playCount: this.formatPlayCount(levelData.playCount),
          rating: levelData.rating ? `${levelData.rating.toFixed(1)}/5` : undefined,
          style: {
            layout: 'horizontal',
            gap: 'small',
            textSize: 'small',
            textColor: 'secondary',
          },
        },
      ],
    };
  }
}
