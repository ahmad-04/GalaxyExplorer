import { WebviewContextClient } from './WebviewContextClient';
import { StateSyncData } from '../../shared/types/blocks';

/**
 * Handles return-to-block functionality and state synchronization
 */
export class BlockReturnHandler {
  private static initialized = false;
  private static returnUrl: string | null = null;

  /**
   * Initialize the return handler
   */
  static initialize(): void {
    if (this.initialized) return;

    // Listen for page visibility changes to detect return to Reddit
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for beforeunload to sync state before leaving
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Store the referrer URL if available
    if (document.referrer) {
      this.returnUrl = document.referrer;
      console.log('Return URL detected:', this.returnUrl);
    }

    this.initialized = true;
    console.log('BlockReturnHandler initialized');
  }

  /**
   * Handle page visibility changes
   */
  private static handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // Page is being hidden, sync state
      this.syncCurrentState();
    } else if (document.visibilityState === 'visible') {
      // Page is becoming visible, check if we need to update context
      this.handlePageVisible();
    }
  }

  /**
   * Handle before page unload
   */
  private static handleBeforeUnload(): void {
    // Sync state before leaving the page
    this.syncCurrentState();
  }

  /**
   * Handle page becoming visible
   */
  private static async handlePageVisible(): Promise<void> {
    try {
      // Retry any pending synchronizations
      await WebviewContextClient.retryPendingSyncs();

      // Check if we have updated context from the server
      const context = WebviewContextClient.getContext();
      if (context) {
        console.log('Page visible with context:', context);
        // Could trigger UI updates here if needed
      }
    } catch (error) {
      console.error('Error handling page visible:', error);
    }
  }

  /**
   * Sync current game state
   */
  private static syncCurrentState(): void {
    try {
      const context = WebviewContextClient.getContext();
      if (!context) return;

      // Collect current game state based on context type
      const gameState = this.collectGameState(context.blockType);
      if (gameState && Object.keys(gameState).length > 0) {
        // Sync state asynchronously
        WebviewContextClient.syncState(gameState).catch((error) => {
          console.error('Error syncing state:', error);
        });
      }
    } catch (error) {
      console.error('Error collecting game state:', error);
    }
  }

  /**
   * Collect current game state based on block type
   */
  private static collectGameState(blockType: string): StateSyncData['changes'] | null {
    try {
      // This would integrate with the actual game to collect state
      // For now, we'll return mock data based on block type

      switch (blockType) {
        case 'level-preview':
          return this.collectLevelState();

        case 'weekly-challenge':
          return this.collectChallengeState();

        case 'landing':
          return this.collectLandingState();

        case 'community-showcase':
          return this.collectCommunityState();

        default:
          return null;
      }
    } catch (error) {
      console.error('Error collecting game state:', error);
      return null;
    }
  }

  /**
   * Collect level-specific state
   */
  private static collectLevelState(): StateSyncData['changes'] {
    // This would integrate with the actual game state
    // For now, return mock data that might be updated during play

    const changes: StateSyncData['changes'] = {};

    // Check if play count should be incremented
    const hasPlayed = sessionStorage.getItem('level_played');
    if (hasPlayed) {
      changes.playCount = parseInt(hasPlayed) || 1;
      sessionStorage.removeItem('level_played');
    }

    // Check if rating was updated
    const newRating = sessionStorage.getItem('level_rating');
    if (newRating) {
      changes.rating = parseFloat(newRating);
      sessionStorage.removeItem('level_rating');
    }

    // Check for user progress updates
    const userProgress = sessionStorage.getItem('user_progress');
    if (userProgress) {
      try {
        changes.userProgress = JSON.parse(userProgress);
        sessionStorage.removeItem('user_progress');
      } catch (error) {
        console.error('Error parsing user progress:', error);
      }
    }

    return changes;
  }

  /**
   * Collect challenge-specific state
   */
  private static collectChallengeState(): StateSyncData['changes'] {
    const changes: StateSyncData['changes'] = {};

    // Check for leaderboard updates
    const leaderboardUpdate = sessionStorage.getItem('leaderboard_update');
    if (leaderboardUpdate) {
      try {
        changes.leaderboard = JSON.parse(leaderboardUpdate);
        sessionStorage.removeItem('leaderboard_update');
      } catch (error) {
        console.error('Error parsing leaderboard update:', error);
      }
    }

    // Check for user progress in challenge
    const challengeProgress = sessionStorage.getItem('challenge_progress');
    if (challengeProgress) {
      try {
        changes.userProgress = JSON.parse(challengeProgress);
        sessionStorage.removeItem('challenge_progress');
      } catch (error) {
        console.error('Error parsing challenge progress:', error);
      }
    }

    // Check for participant count updates
    const participantCount = sessionStorage.getItem('participant_count');
    if (participantCount) {
      changes.statistics = {
        participantCount: parseInt(participantCount),
      };
      sessionStorage.removeItem('participant_count');
    }

    return changes;
  }

  /**
   * Collect landing-specific state
   */
  private static collectLandingState(): StateSyncData['changes'] {
    const changes: StateSyncData['changes'] = {};

    // Check for tutorial progress
    const tutorialProgress = sessionStorage.getItem('tutorial_progress');
    if (tutorialProgress) {
      try {
        changes.userProgress = JSON.parse(tutorialProgress);
        sessionStorage.removeItem('tutorial_progress');
      } catch (error) {
        console.error('Error parsing tutorial progress:', error);
      }
    }

    return changes;
  }

  /**
   * Collect community-specific state
   */
  private static collectCommunityState(): StateSyncData['changes'] {
    const changes: StateSyncData['changes'] = {};

    // Check for community statistics updates
    const statsUpdate = sessionStorage.getItem('community_stats_update');
    if (statsUpdate) {
      try {
        changes.statistics = JSON.parse(statsUpdate);
        sessionStorage.removeItem('community_stats_update');
      } catch (error) {
        console.error('Error parsing community stats update:', error);
      }
    }

    return changes;
  }

  /**
   * Manually trigger return to block
   */
  static async returnToBlock(): Promise<void> {
    try {
      // Sync current state first
      this.syncCurrentState();

      // Wait a moment for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate back to the block if we have a return URL
      if (this.returnUrl) {
        window.location.href = this.returnUrl;
      } else {
        // Fallback: go back in history
        window.history.back();
      }
    } catch (error) {
      console.error('Error returning to block:', error);
      // Fallback: go back in history
      window.history.back();
    }
  }

  /**
   * Set game state that should be synced
   */
  static setGameState(key: string, value: any): void {
    try {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
      console.error('Error setting game state:', error);
    }
  }

  /**
   * Get the return URL
   */
  static getReturnUrl(): string | null {
    return this.returnUrl;
  }

  /**
   * Check if we're in a webview context (came from a block)
   */
  static isFromBlock(): boolean {
    const context = WebviewContextClient.getContext();
    return context !== null;
  }

  /**
   * Create a return-to-block button element
   */
  static createReturnButton(): HTMLElement {
    const button = document.createElement('button');
    button.textContent = '← Back to Reddit';
    button.className = 'return-to-block-btn';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 10000;
      padding: 8px 16px;
      background: #ff4500;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', () => {
      this.returnToBlock();
    });

    return button;
  }

  /**
   * Show return button if we're from a block
   */
  static showReturnButtonIfNeeded(): void {
    if (this.isFromBlock()) {
      const button = this.createReturnButton();
      document.body.appendChild(button);
      console.log('Return to block button added');
    }
  }
}
