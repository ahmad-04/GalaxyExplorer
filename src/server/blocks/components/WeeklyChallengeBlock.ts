import { ChallengeBlockData, BlockConfig } from '../../../shared/types/blocks.js';
import {
  createBaseBlockConfig,
  createBlockHeader,
  createStatsDisplay,
  createBlockActions,
  createLoadingState,
  createErrorState,
} from './BaseBlock.js';

/**
 * Weekly challenge block component with challenge information and leaderboard preview
 * Following Pixelary patterns for challenge presentation
 */
export class WeeklyChallengeBlock {
  /**
   * Create a complete weekly challenge block configuration
   */
  static createBlockConfig(config: BlockConfig): any {
    const challengeData = config.data as ChallengeBlockData;

    // Create base block structure
    const baseConfig = createBaseBlockConfig(config);

    // Create header with challenge title and participant count
    const header = createBlockHeader(config);

    // Create challenge information section
    const challengeInfo = this.createChallengeInfo(challengeData);

    // Create leaderboard preview (top 3)
    const leaderboardPreview = this.createLeaderboardPreview(challengeData);

    // Create time remaining countdown
    const timeRemaining = this.createTimeRemainingDisplay(challengeData);

    // Create challenge statistics
    const stats = this.createChallengeStats(challengeData);

    // Create action buttons
    const actions = createBlockActions(config);

    return {
      ...baseConfig,
      components: [
        header,
        {
          type: 'challenge-content',
          layout: 'weekly-challenge',
          challengeInfo,
          leaderboardPreview,
          timeRemaining,
          stats,
        },
        actions,
      ],
    };
  }

  /**
   * Create challenge information section with week identifier and description
   */
  private static createChallengeInfo(challengeData: ChallengeBlockData) {
    return {
      type: 'challenge-info',
      weekId: challengeData.weekId,
      description: challengeData.description,
      seedLevel: {
        title: challengeData.seedLevel.title,
        difficulty: challengeData.seedLevel.difficulty,
        difficultyDisplay: this.createDifficultyStars(challengeData.seedLevel.difficulty),
      },
      style: {
        weekIdSize: 'large',
        weekIdWeight: 'bold',
        weekIdColor: 'primary',
        descriptionSize: 'medium',
        descriptionColor: 'secondary',
        seedLevelSize: 'small',
        seedLevelColor: 'neutral-content',
      },
    };
  }

  /**
   * Create leaderboard preview showing top 3 participants
   */
  private static createLeaderboardPreview(challengeData: ChallengeBlockData) {
    const topThree = challengeData.leaderboard.slice(0, 3);

    if (topThree.length === 0) {
      return {
        type: 'leaderboard-empty',
        message: 'No participants yet. Be the first!',
        style: {
          textAlign: 'center',
          textSize: 'medium',
          textColor: 'secondary',
          padding: 'medium',
        },
      };
    }

    return {
      type: 'leaderboard-preview',
      title: 'Current Leaders',
      entries: topThree.map((entry) => ({
        rank: entry.rank,
        username: entry.username,
        score: this.formatScore(entry.score),
        medal: this.getMedalForRank(entry.rank),
        isCurrentUser: false, // TODO: Check against current user
      })),
      style: {
        titleSize: 'medium',
        titleWeight: 'bold',
        titleColor: 'primary',
        entryPadding: 'small',
        rankSize: 'small',
        rankWeight: 'bold',
        usernameSize: 'medium',
        scoreSize: 'small',
        scoreColor: 'secondary',
      },
    };
  }

  /**
   * Create time remaining countdown display
   */
  private static createTimeRemainingDisplay(challengeData: ChallengeBlockData) {
    const timeRemaining = challengeData.timeRemaining;
    const timeDisplay = this.formatTimeRemaining(timeRemaining);

    return {
      type: 'time-remaining',
      timeRemaining: timeRemaining,
      display: timeDisplay,
      urgent: timeRemaining < 24 * 60 * 60 * 1000, // Less than 24 hours
      style: {
        textSize: 'medium',
        textWeight: 'bold',
        textColor: timeRemaining < 24 * 60 * 60 * 1000 ? 'critical' : 'warning',
        backgroundColor: 'neutral-background',
        padding: 'small',
        cornerRadius: 'small',
        border: 'thin',
        borderColor: timeRemaining < 24 * 60 * 60 * 1000 ? 'critical' : 'warning',
      },
    };
  }

  /**
   * Create challenge statistics display
   */
  private static createChallengeStats(challengeData: ChallengeBlockData) {
    const stats = [
      {
        label: 'Participants',
        value: challengeData.participantCount,
        icon: '👥',
      },
      {
        label: 'Difficulty',
        value: `${challengeData.seedLevel.difficulty}/5`,
        icon: '⭐',
      },
    ];

    // Add best score if leaderboard has entries
    if (challengeData.leaderboard.length > 0) {
      const bestScore = Math.max(...challengeData.leaderboard.map((entry) => entry.score));
      stats.push({
        label: 'Best Score',
        value: this.formatScore(bestScore),
        icon: '🏆',
      });
    }

    return createStatsDisplay(stats);
  }

  /**
   * Create difficulty stars display
   */
  private static createDifficultyStars(level: number): string {
    const clampedLevel = Math.max(1, Math.min(5, level));
    const stars = '★'.repeat(clampedLevel);
    const emptyStars = '☆'.repeat(5 - clampedLevel);
    return `${stars}${emptyStars}`;
  }

  /**
   * Format score for display (e.g., 1,234 or 1.2K)
   */
  private static formatScore(score: number): string {
    if (score < 1000) {
      return score.toLocaleString();
    } else if (score < 1000000) {
      return `${(score / 1000).toFixed(1)}K`;
    } else {
      return `${(score / 1000000).toFixed(1)}M`;
    }
  }

  /**
   * Get medal emoji for leaderboard rank
   */
  private static getMedalForRank(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  }

  /**
   * Format time remaining for display
   */
  private static formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) {
      return 'Challenge Ended';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  }

  /**
   * Create loading state for weekly challenge block
   */
  static createLoadingBlock(): any {
    return {
      type: 'weekly-challenge-loading',
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
   * Create error state for weekly challenge block
   */
  static createErrorBlock(error: string): any {
    return {
      type: 'weekly-challenge-error',
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
   * Create compact weekly challenge block for use in carousels or lists
   */
  static createCompactBlockConfig(config: BlockConfig): any {
    const challengeData = config.data as ChallengeBlockData;

    return {
      type: 'weekly-challenge-compact',
      style: {
        padding: 'small',
        cornerRadius: 'small',
        backgroundColor: 'neutral-background-weak',
        border: 'thin',
        borderColor: 'warning',
        width: '100%',
      },
      components: [
        {
          type: 'compact-header',
          title: challengeData.title,
          weekId: challengeData.weekId,
          badge: 'CHALLENGE',
          style: {
            titleSize: 'medium',
            titleWeight: 'bold',
            weekIdSize: 'small',
            weekIdColor: 'secondary',
            badgeColor: 'warning',
          },
        },
        {
          type: 'compact-stats',
          participants: challengeData.participantCount,
          timeRemaining: this.formatTimeRemaining(challengeData.timeRemaining),
          difficulty: challengeData.seedLevel.difficulty,
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

  /**
   * Create enhanced challenge block with additional features
   */
  static createEnhancedBlockConfig(
    config: BlockConfig,
    options?: {
      showFullLeaderboard?: boolean;
      showChallengeHistory?: boolean;
      showParticipantAvatars?: boolean;
    }
  ): any {
    const challengeData = config.data as ChallengeBlockData;
    const baseBlock = this.createBlockConfig(config);

    // Add enhanced features if requested
    if (options?.showFullLeaderboard && challengeData.leaderboard.length > 3) {
      // Show more leaderboard entries
      baseBlock.components[1].leaderboardPreview.entries = challengeData.leaderboard
        .slice(0, 10)
        .map((entry) => ({
          rank: entry.rank,
          username: entry.username,
          score: this.formatScore(entry.score),
          medal: this.getMedalForRank(entry.rank),
          isCurrentUser: false, // TODO: Check against current user
        }));
    }

    if (options?.showParticipantAvatars) {
      // Add participant avatars to leaderboard entries
      baseBlock.components[1].leaderboardPreview.entries.forEach((entry: any) => {
        entry.avatar = {
          type: 'avatar',
          username: entry.username,
          size: 'small',
        };
      });
    }

    if (options?.showChallengeHistory) {
      // Add previous challenge results
      baseBlock.components[1].challengeHistory = {
        type: 'challenge-history',
        title: 'Previous Challenges',
        entries: [], // Would be populated from challenge history service
        style: {
          titleSize: 'medium',
          titleWeight: 'bold',
          entrySize: 'small',
          entryColor: 'secondary',
        },
      };
    }

    return baseBlock;
  }
}
