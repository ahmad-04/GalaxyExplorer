// Remove unused import
import {
  BlockActionContext,
  WebviewLaunchConfig,
  WebviewContextData,
} from '../../../shared/types/blocks.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
import { BlockActionHandlers } from '../components/BlockActionHandlers.js';
// import { BlockActionHandlers } from '../components/BlockActionHandlers.js'; // Removed for now
import { WebviewContextService } from './WebviewContextService.js';

/**
 * Service for handling navigation from blocks to webview
 */
export class BlockNavigationService {
  /**
   * Handle block action and navigate to webview if needed
   */
  static async handleBlockAction(
    actionId: string,
    actionContext: BlockActionContext
  ): Promise<any> {
    try {
      console.log(`Handling block action: ${actionId}`, actionContext);

      // Route to appropriate action handler
      let result;
      switch (actionId) {
        case 'play_now':
          result = await BlockActionHandlers.handlePlayNow(actionContext);
          break;

        case 'view_details':
          result = await BlockActionHandlers.handleViewDetails(actionContext);
          break;

        case 'join_challenge':
          result = await BlockActionHandlers.handleJoinChallenge(actionContext);
          break;

        case 'view_leaderboard':
          result = await BlockActionHandlers.handleViewLeaderboard(actionContext);
          break;

        case 'get_started':
          result = await BlockActionHandlers.handleGetStarted(actionContext);
          break;

        case 'browse_levels':
          result = await BlockActionHandlers.handleBrowseLevels(actionContext);
          break;

        case 'view_creator_profile':
          result = await BlockActionHandlers.handleViewCreatorProfile(actionContext);
          break;

        case 'view_community_stats':
          result = await BlockActionHandlers.handleViewCommunityStats(actionContext);
          break;

        case 'create_level':
          result = await BlockActionHandlers.handleCreateLevel(actionContext);
          break;

        case 'share_challenge':
          result = await BlockActionHandlers.handleShareChallenge(actionContext);
          break;

        default:
          throw new Error(`Unknown action: ${actionId}`);
      }

      // Handle webview launch results
      if (result.type === 'webview_launch') {
        return await this.processWebviewLaunch(result.config, result.contextKey);
      }

      return result;
    } catch (error) {
      console.error(`Error handling block action ${actionId}:`, error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Process webview launch configuration
   */
  private static async processWebviewLaunch(
    config: WebviewLaunchConfig,
    contextKey?: string
  ): Promise<any> {
    try {
      // Validate webview context
      const validation = WebviewContextService.validateContext(config.context);
      if (!validation.valid) {
        throw new Error(`Invalid webview context: ${validation.errors?.join(', ')}`);
      }

      // Create loading state response
      const loadingResponse = {
        type: 'loading',
        message: config.loading?.message || 'Loading...',
        timeout: config.loading?.timeout || 10000,
      };

      // Return navigation configuration
      return {
        type: 'navigate',
        url: config.url,
        context: config.context,
        contextKey,
        loading: loadingResponse,
        fallback: config.fallback,
      };
    } catch (error) {
      console.error('Error processing webview launch:', error);
      throw error;
    }
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(error: unknown): any {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';

    return {
      type: 'error',
      message,
      actions: [
        {
          id: 'retry',
          label: 'Retry',
          type: 'primary',
        },
        {
          id: 'cancel',
          label: 'Cancel',
          type: 'secondary',
        },
      ],
    };
  }

  /**
   * Create webview URL with proper context parameters
   */
  static createWebviewUrl(baseUrl: string, context: WebviewContextData): string {
    return WebviewContextService.buildWebviewUrl(baseUrl, context);
  }

  /**
   * Handle navigation with loading states and error handling
   */
  static async navigateWithContext(
    ui: any,
    actionContext: BlockActionContext,
    actionId: string
  ): Promise<void> {
    try {
      // Show loading state
      ui.showToast({ text: 'Loading...' });

      // Handle the action
      const result = await this.handleBlockAction(actionId, actionContext);

      if (result.type === 'navigate') {
        // Navigate to webview with context
        ui.navigateTo(result.url);

        // Show success message if specified
        if (result.loading?.message) {
          ui.showToast({ text: result.loading.message });
        }
      } else if (result.type === 'error') {
        // Show error message
        ui.showToast({ text: result.message });
      } else if (result.type === 'modal') {
        // Handle modal display (would need UI support)
        console.log('Modal result:', result);
        ui.showToast({ text: 'Feature not yet implemented in demo' });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      ui.showToast({
        text: error instanceof Error ? error.message : 'Navigation failed. Please try again.',
      });
    }
  }

  /**
   * Validate action context before processing
   */
  static validateActionContext(actionContext: BlockActionContext): boolean {
    if (!actionContext.postId) {
      console.error('Missing postId in action context');
      return false;
    }

    if (!actionContext.blockType) {
      console.error('Missing blockType in action context');
      return false;
    }

    if (!actionContext.actionId) {
      console.error('Missing actionId in action context');
      return false;
    }

    return true;
  }

  /**
   * Create action context from block interaction
   */
  static createActionContext(
    postId: string,
    blockType: BlockActionContext['blockType'],
    actionId: string,
    actionData?: Record<string, unknown>,
    userId?: string
  ): BlockActionContext {
    return {
      postId,
      blockType,
      actionId,
      actionData,
      userId,
    };
  }

  /**
   * Handle fallback navigation when webview launch fails
   */
  static async handleFallbackNavigation(
    ui: any,
    fallback: WebviewLaunchConfig['fallback']
  ): Promise<void> {
    if (!fallback) {
      ui.showToast({ text: 'Navigation failed. Please try again.' });
      return;
    }

    if (fallback.type === 'error') {
      ui.showToast({ text: fallback.message });
    } else if (fallback.type === 'retry') {
      ui.showToast({ text: fallback.message });
      // Could implement retry logic here
    }
  }
}
