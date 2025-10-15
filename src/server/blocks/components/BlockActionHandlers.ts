import { context, reddit, redis } from '@devvit/web/server';
import {
  BlockActionContext,
  BlockError,
  WebviewLaunchConfig,
  LevelWebviewContext,
  ChallengeWebviewContext,
  LandingWebviewContext,
  CommunityWebviewContext,
} from '../../../shared/types/blocks.js';
import { BlockService } from '../services/BlockService.js';
import { WebviewContextService } from '../services/WebviewContextService.js';
import { BlockAnalyticsService } from '../services/BlockAnalyticsService.js';
import { trackBlockInteraction } from '../../api/blocks/analytics.js';

/**
 * Block action handlers for devvit block interactions
 * Handles "Play Now", "View Details", and other block actions
 */
export class BlockActionHandlers {
  /**
   * Handle "Play Now" action - launches webview with level context
   */
  static async handlePlayNow(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      // Validate authentication if required
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return this.createAuthRequiredResponse();
      }

      // Get level data from action context or fetch from storage
      const levelId = actionData?.levelId as string;
      if (!levelId) {
        throw new Error('Level ID is required for Play Now action');
      }

      // Get additional level metadata for context
      const blockConfig = await BlockService.getBlockConfig(postId);
      const levelData = blockConfig?.data as any;

      // Create webview context with level information
      const webviewContext: LevelWebviewContext = {
        postId,
        blockType: 'level-preview',
        action: 'play',
        timestamp: Date.now(),
        levelId,
        mode: 'play',
        difficulty: levelData?.difficulty,
        creator: levelData?.creator,
        data: {
          title: levelData?.title,
          playCount: levelData?.playCount,
          rating: levelData?.rating,
        },
      };

      // Store context for retrieval in webview
      const contextKey = await WebviewContextService.storeContext(webviewContext);

      // Create webview launch configuration
      const webviewConfig: WebviewLaunchConfig = {
        url: WebviewContextService.buildWebviewUrl(this.getBaseWebviewUrl(postId), webviewContext),
        context: webviewContext,
        loading: {
          message: 'Loading level...',
          timeout: 10000, // 10 second timeout
        },
        fallback: {
          type: 'error',
          message: 'Failed to load level. Please try again.',
          actions: [
            {
              id: 'retry_play',
              label: 'Retry',
              type: 'primary',
              handler: 'handlePlayNow',
              data: actionData,
            },
          ],
        },
      };

      // Track interaction for analytics
      await this.trackBlockInteraction(actionContext, 'play_now');
      await BlockAnalyticsService.trackBlockAction(
        postId,
        'level-preview',
        'play_now',
        context.userId,
        { levelId, difficulty: levelData?.difficulty }
      );

      return {
        type: 'webview_launch',
        config: webviewConfig,
        contextKey,
      };
    } catch (error) {
      console.error('Error in handlePlayNow:', error);
      return this.createErrorResponse('Failed to launch level. Please try again.');
    }
  }

  /**
   * Handle "View Details" action - shows expanded level information
   */
  static async handleViewDetails(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      const levelId = actionData?.levelId as string;
      if (!levelId) {
        throw new Error('Level ID is required for View Details action');
      }

      // Fetch detailed level information
      const levelDetails = await this.fetchLevelDetails(postId, levelId);

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'view_details');

      return {
        type: 'modal',
        title: levelDetails.title,
        content: {
          type: 'level_details',
          data: levelDetails,
        },
        actions: [
          {
            id: 'play_from_details',
            label: 'Play Now',
            type: 'primary',
            handler: 'handlePlayNow',
            data: { levelId },
          },
          {
            id: 'close_details',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleViewDetails:', error);
      return this.createErrorResponse('Failed to load level details. Please try again.');
    }
  }

  /**
   * Handle "Join Challenge" action - loads seed-based level for weekly challenge
   */
  static async handleJoinChallenge(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData, userId } = actionContext;

      // Validate authentication
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return this.createAuthRequiredResponse();
      }

      // Get challenge data from action context
      const weekId = actionData?.weekId as string;

      if (!weekId) {
        throw new Error('Week ID is required for Join Challenge action');
      }

      // Get challenge configuration
      const blockConfig = await BlockService.getBlockConfig(postId);
      if (!blockConfig || blockConfig.type !== 'weekly-challenge') {
        throw new Error('Challenge block configuration not found');
      }

      const challengeData = blockConfig.data as any;

      // Get user's existing progress if any
      let userProgress;
      if (userId) {
        userProgress = await this.fetchUserChallengeProgress(userId, weekId);
      }

      // Create webview context for challenge mode
      const webviewContext: ChallengeWebviewContext = {
        postId,
        blockType: 'weekly-challenge',
        action: 'challenge',
        timestamp: Date.now(),
        weekId,
        challengeId: challengeData.challengeId,
        seedLevelId: challengeData.seedLevel.levelId,
        challengeMode: true,
        userProgress: userProgress
          ? {
              bestScore: userProgress.bestScore,
              attempts: userProgress.totalAttempts,
              lastPlayedAt: userProgress.lastPlayedAt,
            }
          : undefined,
        data: {
          title: challengeData.title,
          description: challengeData.description,
          timeRemaining: challengeData.timeRemaining,
          participantCount: challengeData.participantCount,
        },
      };

      // Store context for retrieval in webview
      const contextKey = await WebviewContextService.storeContext(webviewContext);

      // Create webview launch configuration for challenge mode
      const webviewConfig: WebviewLaunchConfig = {
        url: WebviewContextService.buildWebviewUrl(this.getBaseWebviewUrl(postId), webviewContext),
        context: webviewContext,
        loading: {
          message: 'Loading challenge...',
          timeout: 15000, // 15 second timeout for challenges
        },
        fallback: {
          type: 'error',
          message: 'Failed to load challenge. Please try again.',
          actions: [
            {
              id: 'retry_challenge',
              label: 'Retry',
              type: 'primary',
              handler: 'handleJoinChallenge',
              data: actionData,
            },
          ],
        },
      };

      // Track challenge participation
      await this.trackChallengeParticipation(actionContext, weekId);

      // Track interaction for analytics
      await this.trackBlockInteraction(actionContext, 'join_challenge');

      return {
        type: 'webview_launch',
        config: webviewConfig,
        contextKey,
      };
    } catch (error) {
      console.error('Error in handleJoinChallenge:', error);
      return this.createErrorResponse('Failed to join challenge. Please try again.');
    }
  }

  /**
   * Handle "View Leaderboard" action - shows full challenge leaderboard
   */
  static async handleViewLeaderboard(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      const weekId = actionData?.weekId as string;
      if (!weekId) {
        throw new Error('Week ID is required for View Leaderboard action');
      }

      // Fetch full leaderboard data
      const leaderboardData = await this.fetchFullLeaderboard(postId, weekId);

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'view_leaderboard');

      return {
        type: 'modal',
        title: `Challenge ${weekId} Leaderboard`,
        content: {
          type: 'leaderboard_full',
          data: leaderboardData,
        },
        actions: [
          {
            id: 'join_from_leaderboard',
            label: 'Join Challenge',
            type: 'primary',
            handler: 'handleJoinChallenge',
            data: { weekId, challengeMode: true },
          },
          {
            id: 'share_leaderboard',
            label: 'Share',
            type: 'secondary',
            handler: 'handleShareChallenge',
            data: { weekId, type: 'leaderboard' },
          },
          {
            id: 'close_leaderboard',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleViewLeaderboard:', error);
      return this.createErrorResponse('Failed to load leaderboard. Please try again.');
    }
  }

  /**
   * Handle "Share Challenge" action - implements challenge sharing and social features
   */
  static async handleShareChallenge(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      const weekId = actionData?.weekId as string;
      const shareType = (actionData?.type as string) || 'challenge';

      if (!weekId) {
        throw new Error('Week ID is required for Share Challenge action');
      }

      // Get challenge data for sharing
      const blockConfig = await BlockService.getBlockConfig(postId);
      if (!blockConfig || blockConfig.type !== 'weekly-challenge') {
        throw new Error('Challenge block configuration not found');
      }

      const challengeData = blockConfig.data as any;

      // Create share content based on type
      const shareContent = this.createShareContent(challengeData, shareType);

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'share_challenge');

      return {
        type: 'share_modal',
        title: 'Share Challenge',
        content: shareContent,
        actions: [
          {
            id: 'copy_link',
            label: 'Copy Link',
            type: 'primary',
            handler: 'handleCopyLink',
            data: { url: shareContent.url },
          },
          {
            id: 'share_reddit',
            label: 'Share on Reddit',
            type: 'secondary',
            handler: 'handleShareReddit',
            data: { content: shareContent },
          },
          {
            id: 'close_share',
            label: 'Cancel',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleShareChallenge:', error);
      return this.createErrorResponse('Failed to create share content. Please try again.');
    }
  }

  /**
   * Handle "Track Progress" action - shows ongoing challenge progress
   */
  static async handleTrackProgress(actionContext: BlockActionContext): Promise<any> {
    try {
      const { actionData, userId } = actionContext;

      if (!userId) {
        return this.createAuthRequiredResponse();
      }

      const weekId = actionData?.weekId as string;
      if (!weekId) {
        throw new Error('Week ID is required for Track Progress action');
      }

      // Fetch user's progress in the challenge
      const progressData = await this.fetchUserChallengeProgress(userId, weekId);

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'track_progress');

      return {
        type: 'modal',
        title: 'Your Challenge Progress',
        content: {
          type: 'challenge_progress',
          data: progressData,
        },
        actions: [
          {
            id: 'continue_challenge',
            label: 'Continue Playing',
            type: 'primary',
            handler: 'handleJoinChallenge',
            data: { weekId, challengeMode: true },
          },
          {
            id: 'view_stats',
            label: 'View Stats',
            type: 'secondary',
            handler: 'handleViewStats',
            data: { weekId, userId },
          },
          {
            id: 'close_progress',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleTrackProgress:', error);
      return this.createErrorResponse('Failed to load progress. Please try again.');
    }
  }

  /**
   * Handle "Get Started" action - launches webview with tutorial or level creation
   */
  static async handleGetStarted(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      const mode =
        (actionData?.mode as 'tutorial' | 'getting-started' | 'feature-tour') || 'tutorial';

      // Create webview context for getting started
      const webviewContext: LandingWebviewContext = {
        postId,
        blockType: 'landing',
        action: 'get-started',
        timestamp: Date.now(),
        mode,
        step: (actionData?.step as number) || 1,
        completedSteps: (actionData?.completedSteps as string[]) || [],
        data: {
          tutorialType: mode,
          startedAt: Date.now(),
        },
      };

      // Store context for retrieval in webview
      const contextKey = await WebviewContextService.storeContext(webviewContext);

      // Create webview launch configuration for getting started
      const webviewConfig: WebviewLaunchConfig = {
        url: WebviewContextService.buildWebviewUrl(this.getBaseWebviewUrl(postId), webviewContext),
        context: webviewContext,
        loading: {
          message: 'Loading tutorial...',
          timeout: 10000,
        },
        fallback: {
          type: 'error',
          message: 'Failed to load tutorial. Please try again.',
          actions: [
            {
              id: 'retry_tutorial',
              label: 'Retry',
              type: 'primary',
              handler: 'handleGetStarted',
              data: actionData,
            },
          ],
        },
      };

      // Track interaction for analytics
      await this.trackBlockInteraction(actionContext, 'get_started');

      return {
        type: 'webview_launch',
        config: webviewConfig,
        contextKey,
      };
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      return this.createErrorResponse('Failed to start tutorial. Please try again.');
    }
  }

  /**
   * Handle "Browse Levels" action - launches webview with level browser
   */
  static async handleBrowseLevels(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId, actionData } = actionContext;

      const filter =
        (actionData?.filter as 'popular' | 'trending' | 'new' | 'creator') || 'popular';

      // Create webview context for browsing levels
      const webviewContext: CommunityWebviewContext = {
        postId,
        blockType: 'community-showcase',
        action: 'browse-levels',
        timestamp: Date.now(),
        filter,
        creator: actionData?.creator as string,
        tags: actionData?.tags as string[],
        sortBy: (actionData?.sortBy as 'plays' | 'rating' | 'date') || 'plays',
        data: {
          initialFilter: filter,
          searchQuery: actionData?.search as string,
        },
      };

      // Store context for retrieval in webview
      const contextKey = await WebviewContextService.storeContext(webviewContext);

      // Create webview launch configuration for browsing levels
      const webviewConfig: WebviewLaunchConfig = {
        url: WebviewContextService.buildWebviewUrl(this.getBaseWebviewUrl(postId), webviewContext),
        context: webviewContext,
        loading: {
          message: 'Loading level browser...',
          timeout: 10000,
        },
        fallback: {
          type: 'error',
          message: 'Failed to load level browser. Please try again.',
          actions: [
            {
              id: 'retry_browse',
              label: 'Retry',
              type: 'primary',
              handler: 'handleBrowseLevels',
              data: actionData,
            },
          ],
        },
      };

      // Track interaction for analytics
      await this.trackBlockInteraction(actionContext, 'browse_levels');

      return {
        type: 'webview_launch',
        config: webviewConfig,
        contextKey,
      };
    } catch (error) {
      console.error('Error in handleBrowseLevels:', error);
      return this.createErrorResponse('Failed to load level browser. Please try again.');
    }
  }

  /**
   * Handle "View Creator Profile" action - shows creator profile and levels
   */
  static async handleViewCreatorProfile(actionContext: BlockActionContext): Promise<any> {
    try {
      const { actionData } = actionContext;

      const username = actionData?.username as string;
      if (!username) {
        throw new Error('Username is required for View Creator Profile action');
      }

      // Fetch creator profile data
      const creatorProfile = await this.fetchCreatorProfile(username);

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'view_creator_profile');

      return {
        type: 'modal',
        title: `u/${username}'s Profile`,
        content: {
          type: 'creator_profile',
          data: creatorProfile,
        },
        actions: [
          {
            id: 'view_creator_levels',
            label: 'View Levels',
            type: 'primary',
            handler: 'handleBrowseLevels',
            data: { filter: 'creator', creator: username },
          },
          {
            id: 'follow_creator',
            label: 'Follow',
            type: 'secondary',
            handler: 'handleFollowCreator',
            data: { username },
          },
          {
            id: 'close_profile',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleViewCreatorProfile:', error);
      return this.createErrorResponse('Failed to load creator profile. Please try again.');
    }
  }

  /**
   * Handle "View Community Stats" action - shows detailed community statistics
   */
  static async handleViewCommunityStats(actionContext: BlockActionContext): Promise<any> {
    try {
      // Fetch detailed community statistics
      const communityStats = await this.fetchDetailedCommunityStats();

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'view_community_stats');

      return {
        type: 'modal',
        title: 'Community Statistics',
        content: {
          type: 'community_stats_detailed',
          data: communityStats,
        },
        actions: [
          {
            id: 'view_trending',
            label: 'View Trending',
            type: 'primary',
            handler: 'handleBrowseLevels',
            data: { filter: 'trending' },
          },
          {
            id: 'view_top_creators',
            label: 'Top Creators',
            type: 'secondary',
            handler: 'handleViewTopCreators',
          },
          {
            id: 'close_stats',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleViewCommunityStats:', error);
      return this.createErrorResponse('Failed to load community stats. Please try again.');
    }
  }

  /**
   * Handle "Create Level" action - launches webview with level editor
   */
  static async handleCreateLevel(actionContext: BlockActionContext): Promise<any> {
    try {
      const { postId } = actionContext;

      // Validate authentication
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return this.createAuthRequiredResponse();
      }

      // Create webview launch configuration for level creation
      const webviewConfig = {
        url: this.buildWebviewUrl(postId, {
          action: 'create-level',
          mode: 'editor',
        }),
        context: {
          postId,
          action: 'create-level',
          mode: 'editor',
          timestamp: Date.now(),
        },
      };

      // Track interaction for analytics
      await this.trackBlockInteraction(actionContext, 'create_level');

      return {
        type: 'webview_launch',
        config: webviewConfig,
        loading: {
          message: 'Loading level editor...',
          timeout: 15000,
        },
      };
    } catch (error) {
      console.error('Error in handleCreateLevel:', error);
      return this.createErrorResponse('Failed to load level editor. Please try again.');
    }
  }

  /**
   * Handle "View Popular Levels" action - shows popular levels carousel
   */
  static async handleViewPopularLevels(actionContext: BlockActionContext): Promise<any> {
    try {
      // Fetch popular levels data
      const popularLevels = await this.fetchPopularLevels();

      // Track interaction
      await this.trackBlockInteraction(actionContext, 'view_popular_levels');

      return {
        type: 'modal',
        title: 'Popular Levels',
        content: {
          type: 'popular_levels_grid',
          data: popularLevels,
        },
        actions: [
          {
            id: 'browse_all_levels',
            label: 'Browse All',
            type: 'primary',
            handler: 'handleBrowseLevels',
            data: { filter: 'all' },
          },
          {
            id: 'filter_by_difficulty',
            label: 'Filter by Difficulty',
            type: 'secondary',
            handler: 'handleFilterLevels',
          },
          {
            id: 'close_popular',
            label: 'Close',
            type: 'secondary',
            handler: 'handleCloseModal',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleViewPopularLevels:', error);
      return this.createErrorResponse('Failed to load popular levels. Please try again.');
    }
  }

  /**
   * Handle authentication-required actions
   */
  static async handleAuthRequired(actionContext: BlockActionContext): Promise<any> {
    try {
      // Check if user is already authenticated
      const isAuthenticated = await this.checkAuthentication();
      if (isAuthenticated) {
        // Redirect to original action
        return this.redirectToOriginalAction(actionContext);
      }

      return {
        type: 'auth_prompt',
        title: 'Sign In Required',
        message: 'Please sign in to Reddit to continue.',
        actions: [
          {
            id: 'sign_in',
            label: 'Sign In',
            type: 'primary',
            handler: 'handleSignIn',
          },
          {
            id: 'cancel_auth',
            label: 'Cancel',
            type: 'secondary',
            handler: 'handleCancel',
          },
        ],
      };
    } catch (error) {
      console.error('Error in handleAuthRequired:', error);
      return this.createErrorResponse('Authentication error. Please try again.');
    }
  }

  /**
   * Handle loading states for actions
   */
  static async handleLoadingState(actionContext: BlockActionContext): Promise<any> {
    const { actionId } = actionContext;

    return {
      type: 'loading',
      message: this.getLoadingMessage(actionId),
      timeout: 15000, // 15 second timeout
      fallback: {
        type: 'error',
        message: 'Action timed out. Please try again.',
      },
    };
  }

  /**
   * Handle error recovery actions
   */
  static async handleErrorRecovery(
    actionContext: BlockActionContext,
    error: BlockError
  ): Promise<any> {
    const { actionId } = actionContext;

    if (error.retryable) {
      return {
        type: 'retry_prompt',
        title: 'Action Failed',
        message: error.message,
        actions: [
          {
            id: 'retry_action',
            label: 'Retry',
            type: 'primary',
            handler: actionId, // Retry original action
            data: actionContext.actionData,
          },
          {
            id: 'cancel_action',
            label: 'Cancel',
            type: 'secondary',
            handler: 'handleCancel',
          },
        ],
      };
    }

    return this.createErrorResponse(error.message);
  }

  /**
   * Check if user is authenticated
   */
  private static async checkAuthentication(): Promise<boolean> {
    try {
      const { userId } = context;
      if (!userId) {
        return false;
      }

      // Verify user can access Reddit API
      const user = await reddit.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Get base webview URL for the current subreddit and post
   */
  private static getBaseWebviewUrl(postId: string): string {
    return `https://reddit.com/r/${context.subredditName}/comments/${postId}`;
  }

  /**
   * Build webview URL with context parameters (deprecated - use WebviewContextService)
   */
  private static buildWebviewUrl(postId: string, params: Record<string, any>): string {
    const baseUrl = `/r/${context.subredditName}/comments/${postId}`;
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: Date.now().toString(),
    });

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Fetch detailed level information
   */
  private static async fetchLevelDetails(postId: string, levelId: string): Promise<any> {
    try {
      // Get block configuration
      const blockConfig = await BlockService.getBlockConfig(postId);
      if (!blockConfig || blockConfig.type !== 'level-preview') {
        throw new Error('Level block configuration not found');
      }

      // TODO: Use levelId to fetch specific level details when available
      console.log(`Fetching details for level: ${levelId}`);

      const levelData = blockConfig.data as any;

      // Enhance with additional details
      return {
        ...levelData,
        fullDescription: levelData.description || 'No description available',
        createdAt: Date.now(), // Would be fetched from actual storage
        tags: [], // Would be fetched from level metadata
        screenshots: [], // Would be fetched from level assets
      };
    } catch (error) {
      console.error('Error fetching level details:', error);
      throw error;
    }
  }

  /**
   * Fetch full leaderboard data for a challenge
   */
  private static async fetchFullLeaderboard(postId: string, weekId: string): Promise<any> {
    try {
      // Get challenge block configuration
      const blockConfig = await BlockService.getBlockConfig(postId);
      if (!blockConfig || blockConfig.type !== 'weekly-challenge') {
        throw new Error('Challenge block configuration not found');
      }

      const challengeData = blockConfig.data as any;

      // TODO: Fetch real leaderboard data from challenge service
      console.log(`Fetching full leaderboard for challenge: ${weekId}`);

      // For now, return the existing leaderboard data with additional entries
      const mockAdditionalEntries = Array.from({ length: 10 }, (_, i) => ({
        rank: challengeData.leaderboard.length + i + 1,
        username: `player${challengeData.leaderboard.length + i + 1}`,
        score: Math.floor(Math.random() * 10000),
      }));

      return {
        weekId,
        title: challengeData.title,
        totalParticipants: challengeData.participantCount,
        entries: [...challengeData.leaderboard, ...mockAdditionalEntries],
        userRank: null, // Would be calculated based on current user
        userScore: null, // Would be fetched from user's challenge data
        timeRemaining: challengeData.timeRemaining,
      };
    } catch (error) {
      console.error('Error fetching full leaderboard:', error);
      throw error;
    }
  }

  /**
   * Fetch creator profile data
   */
  private static async fetchCreatorProfile(username: string): Promise<any> {
    try {
      // TODO: Fetch real creator data from user service
      console.log(`Fetching creator profile for: ${username}`);

      // Mock creator profile data
      return {
        username,
        displayName: username,
        joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        levelCount: 5,
        totalPlays: 150,
        averageRating: 4.2,
        badges: ['Creator', 'Popular'],
        bio: `Level creator passionate about space exploration games.`,
        recentLevels: [
          { levelId: 'level1', title: 'Epic Space Battle', playCount: 50 },
          { levelId: 'level2', title: 'Asteroid Field', playCount: 35 },
        ],
        achievements: [
          { id: 'first_level', name: 'First Level', description: 'Created your first level' },
          { id: 'popular_creator', name: 'Popular Creator', description: '100+ total plays' },
        ],
      };
    } catch (error) {
      console.error('Error fetching creator profile:', error);
      throw error;
    }
  }

  /**
   * Fetch detailed community statistics
   */
  private static async fetchDetailedCommunityStats(): Promise<any> {
    try {
      // TODO: Fetch real community stats from analytics service
      console.log('Fetching detailed community statistics');

      // Mock detailed community stats
      return {
        overview: {
          totalLevels: 125,
          activePlayers: 450,
          totalCreators: 75,
          totalPlays: 2500,
        },
        trends: {
          dailyPlays: [45, 52, 38, 67, 71, 58, 49], // Last 7 days
          weeklyCreations: [8, 12, 15, 10], // Last 4 weeks
          popularTags: ['#space-battle', '#puzzle', '#adventure'],
        },
        leaderboards: {
          topCreators: [
            { username: 'SpaceBuilder', levelCount: 12, totalPlays: 300 },
            { username: 'GalaxyMaster', levelCount: 8, totalPlays: 250 },
          ],
          topLevels: [
            { title: 'Epic Space Battle', creator: 'SpaceBuilder', playCount: 85 },
            { title: 'Asteroid Maze', creator: 'GalaxyMaster', playCount: 72 },
          ],
        },
        milestones: [
          { title: '1000 Total Plays', achieved: true, date: Date.now() - 7 * 24 * 60 * 60 * 1000 },
          {
            title: '100 Levels Created',
            achieved: true,
            date: Date.now() - 3 * 24 * 60 * 60 * 1000,
          },
        ],
      };
    } catch (error) {
      console.error('Error fetching detailed community stats:', error);
      throw error;
    }
  }

  /**
   * Fetch popular levels data
   */
  private static async fetchPopularLevels(): Promise<any> {
    try {
      // TODO: Fetch real popular levels from level service
      console.log('Fetching popular levels');

      // Mock popular levels data
      return {
        timeframe: 'week',
        levels: [
          {
            levelId: 'level1',
            title: 'Epic Space Battle',
            creator: 'SpaceBuilder',
            playCount: 85,
            rating: 4.5,
            difficulty: 3,
            tags: ['#space-battle', '#action'],
            thumbnailUrl: null,
          },
          {
            levelId: 'level2',
            title: 'Asteroid Maze',
            creator: 'GalaxyMaster',
            playCount: 72,
            rating: 4.2,
            difficulty: 4,
            tags: ['#puzzle', '#maze'],
            thumbnailUrl: null,
          },
          {
            levelId: 'level3',
            title: 'Peaceful Exploration',
            creator: 'ZenBuilder',
            playCount: 58,
            rating: 4.8,
            difficulty: 1,
            tags: ['#exploration', '#peaceful'],
            thumbnailUrl: null,
          },
        ],
        totalCount: 125,
        filters: {
          difficulty: [1, 2, 3, 4, 5],
          tags: ['#space-battle', '#puzzle', '#adventure', '#exploration'],
          timeframe: ['day', 'week', 'month', 'all-time'],
        },
      };
    } catch (error) {
      console.error('Error fetching popular levels:', error);
      throw error;
    }
  }

  /**
   * Fetch user's challenge progress
   */
  private static async fetchUserChallengeProgress(userId: string, weekId: string): Promise<any> {
    try {
      // TODO: Fetch real user progress from challenge service
      console.log(`Fetching challenge progress for user: ${userId}, week: ${weekId}`);

      // Mock progress data
      return {
        weekId,
        userId,
        hasParticipated: true,
        bestScore: 8500,
        currentRank: 15,
        totalAttempts: 3,
        lastPlayedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        timeSpent: 45 * 60 * 1000, // 45 minutes
        achievements: [
          {
            id: 'first_attempt',
            name: 'First Try',
            description: 'Completed your first challenge attempt',
          },
          { id: 'top_50', name: 'Top 50', description: 'Reached top 50 on the leaderboard' },
        ],
      };
    } catch (error) {
      console.error('Error fetching user challenge progress:', error);
      throw error;
    }
  }

  /**
   * Track challenge participation for analytics
   */
  private static async trackChallengeParticipation(
    actionContext: BlockActionContext,
    weekId: string
  ): Promise<void> {
    try {
      const { postId, userId } = actionContext;

      if (!userId) {
        return; // Can't track without user ID
      }

      // Store participation data
      const participationKey = `challenge:participation:${weekId}:${userId}`;
      const participationData = {
        weekId,
        userId,
        postId,
        joinedAt: Date.now(),
        source: 'block_action',
      };

      // Store in Redis with TTL (keep for 90 days)
      await redis.set(participationKey, JSON.stringify(participationData));
      await redis.expire(participationKey, 90 * 24 * 60 * 60);

      // Update challenge participant count
      const challengeStatsKey = `challenge:stats:${weekId}`;
      const existingStats = await redis.get(challengeStatsKey);

      if (existingStats) {
        const stats = JSON.parse(existingStats);
        stats.participantCount = (stats.participantCount || 0) + 1;
        stats.lastUpdated = Date.now();
        await redis.set(challengeStatsKey, JSON.stringify(stats));
      } else {
        const newStats = {
          weekId,
          participantCount: 1,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
        };
        await redis.set(challengeStatsKey, JSON.stringify(newStats));
      }

      console.log(`Tracked challenge participation: ${userId} joined ${weekId}`);
    } catch (error) {
      console.error('Error tracking challenge participation:', error);
      // Don't throw - analytics failure shouldn't break the action
    }
  }

  /**
   * Create share content for challenges
   */
  private static createShareContent(challengeData: any, shareType: string): any {
    const baseUrl = `https://reddit.com/r/${context.subredditName}`;

    switch (shareType) {
      case 'leaderboard':
        return {
          title: `${challengeData.title} Leaderboard`,
          description: `Check out the current standings for ${challengeData.weekId}!`,
          url: `${baseUrl}/challenge/${challengeData.weekId}/leaderboard`,
          image: null, // Could generate leaderboard image
        };

      case 'challenge':
      default:
        return {
          title: challengeData.title,
          description: `Join the ${challengeData.weekId} challenge! ${challengeData.description}`,
          url: `${baseUrl}/challenge/${challengeData.weekId}`,
          image: null, // Could generate challenge preview image
        };
    }
  }

  /**
   * Track block interaction for analytics
   */
  private static async trackBlockInteraction(
    actionContext: BlockActionContext,
    interactionType: string
  ): Promise<void> {
    try {
      const { postId, userId, blockType, actionId } = actionContext;

      // Store interaction data for analytics
      const interactionKey = `interaction:${postId}:${userId}:${Date.now()}`;
      const interactionData = {
        postId,
        userId,
        blockType,
        actionId,
        interactionType,
        timestamp: Date.now(),
      };

      // Store in Redis with TTL
      await redis.set(interactionKey, JSON.stringify(interactionData));
      await redis.expire(interactionKey, 30 * 24 * 60 * 60); // 30 days

      // Update block metadata
      const metadataKey = `block:metadata:${postId}`;
      const metadata = await redis.get(metadataKey);
      if (metadata) {
        const parsed = JSON.parse(metadata);
        parsed.interactionCount = (parsed.interactionCount || 0) + 1;
        parsed.lastUpdated = Date.now();
        await redis.set(metadataKey, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Error tracking block interaction:', error);
      // Don't throw - analytics failure shouldn't break the action
    }
  }

  /**
   * Create authentication required response
   */
  private static createAuthRequiredResponse(): any {
    return {
      type: 'auth_required',
      title: 'Sign In Required',
      message: 'Please sign in to Reddit to play levels.',
      actions: [
        {
          id: 'sign_in',
          label: 'Sign In',
          type: 'primary',
          handler: 'handleSignIn',
        },
      ],
    };
  }

  /**
   * Create error response
   */
  private static createErrorResponse(message: string): any {
    return {
      type: 'error',
      title: 'Action Failed',
      message,
      actions: [
        {
          id: 'dismiss_error',
          label: 'OK',
          type: 'primary',
          handler: 'handleDismiss',
        },
      ],
    };
  }

  /**
   * Get loading message for specific actions
   */
  private static getLoadingMessage(actionId: string): string {
    switch (actionId) {
      case 'play-now':
        return 'Loading level...';
      case 'view-details':
        return 'Loading details...';
      case 'join-challenge':
        return 'Joining challenge...';
      case 'view-leaderboard':
        return 'Loading leaderboard...';
      case 'share-challenge':
        return 'Preparing share...';
      case 'track-progress':
        return 'Loading progress...';
      default:
        return 'Loading...';
    }
  }

  /**
   * Redirect to original action after authentication
   */
  private static async redirectToOriginalAction(actionContext: BlockActionContext): Promise<any> {
    const { actionId } = actionContext;

    switch (actionId) {
      case 'play-now':
        return this.handlePlayNow(actionContext);
      case 'view-details':
        return this.handleViewDetails(actionContext);
      case 'join-challenge':
        return this.handleJoinChallenge(actionContext);
      case 'view-leaderboard':
        return this.handleViewLeaderboard(actionContext);
      case 'share-challenge':
        return this.handleShareChallenge(actionContext);
      case 'track-progress':
        return this.handleTrackProgress(actionContext);
      default:
        return this.createErrorResponse('Unknown action');
    }
  }
}

/**
 * Action handler registry for mapping action IDs to handler functions
 */
export const ACTION_HANDLERS = {
  'play-now': BlockActionHandlers.handlePlayNow,
  'view-details': BlockActionHandlers.handleViewDetails,
  'auth-required': BlockActionHandlers.handleAuthRequired,
  'join-challenge': BlockActionHandlers.handleJoinChallenge,
  'view-leaderboard': BlockActionHandlers.handleViewLeaderboard,
  'share-challenge': BlockActionHandlers.handleShareChallenge,
  'track-progress': BlockActionHandlers.handleTrackProgress,
  'get-started': BlockActionHandlers.handleGetStarted,
  'browse-levels': BlockActionHandlers.handleBrowseLevels,
  'view-creator-profile': BlockActionHandlers.handleViewCreatorProfile,
  'view-community-stats': BlockActionHandlers.handleViewCommunityStats,
  'create-level': BlockActionHandlers.handleCreateLevel,
  'view-popular-levels': BlockActionHandlers.handleViewPopularLevels,
} as const;

/**
 * Execute block action with error handling and loading states
 */
export async function executeBlockAction(
  actionId: string,
  actionContext: BlockActionContext
): Promise<any> {
  try {
    // Get handler for action
    const handler = ACTION_HANDLERS[actionId as keyof typeof ACTION_HANDLERS];
    if (!handler) {
      throw new Error(`Unknown action: ${actionId}`);
    }

    // Execute action
    const result = await handler(actionContext);

    return result;
  } catch (error) {
    console.error(`Error executing block action ${actionId}:`, error);

    const blockError: BlockError = {
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      retryable: true,
      context: { actionId, actionContext },
    };

    return await BlockActionHandlers.handleErrorRecovery(actionContext, blockError);
  }
}
  /**
   * Track block interaction for analytics
   */
  private static async trackBlockInteraction(
    actionContext: BlockActionContext,
    interactionType: string
  ): Promise<void> {
    try {
      const { postId, userId } = actionContext;
      
      // Get block type from block configuration
      const blockConfig = await BlockService.getBlockConfig(postId);
      const blockType = blockConfig?.type || 'unknown';

      await BlockAnalyticsService.trackBlockInteraction(
        postId,
        blockType,
        interactionType,
        userId,
        {
          timestamp: Date.now(),
          actionContext: actionContext.actionData,
        }
      );
    } catch (error) {
      console.error('Error tracking block interaction:', error);
      // Don't throw - analytics failures shouldn't break functionality
    }
  }

  /**
   * Track challenge participation for analytics
   */
  private static async trackChallengeParticipation(
    actionContext: BlockActionContext,
    weekId: string
  ): Promise<void> {
    try {
      const { postId, userId } = actionContext;

      await BlockAnalyticsService.trackBlockAction(
        postId,
        'weekly-challenge',
        'join_challenge',
        userId,
        {
          weekId,
          participationType: 'join',
          timestamp: Date.now(),
        }
      );
    } catch (error) {
      console.error('Error tracking challenge participation:', error);
    }
  }
}
