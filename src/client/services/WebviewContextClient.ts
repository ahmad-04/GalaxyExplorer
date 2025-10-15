import { WebviewContextData, StateSyncData } from '../../shared/types/blocks';

/**
 * Client-side service for handling webview context and state synchronization
 */
export class WebviewContextClient {
  private static context: WebviewContextData | null = null;
  private static initialized = false;

  /**
   * Initialize context from URL parameters or stored data
   */
  static async initialize(): Promise<WebviewContextData | null> {
    if (this.initialized) {
      return this.context;
    }

    try {
      // First try to get context from URL parameters
      const urlContext = this.parseUrlParameters();
      if (urlContext) {
        this.context = urlContext;
        console.log('Initialized context from URL:', this.context);
        this.initialized = true;
        return this.context;
      }

      // If no URL context, try to get from Devvit props
      if (typeof window !== 'undefined' && (window as any).Devvit) {
        const props = await (window as any).Devvit.getProps();
        if (props?.webviewContext) {
          this.context = props.webviewContext as WebviewContextData;
          console.log('Initialized context from Devvit props:', this.context);
          this.initialized = true;
          return this.context;
        }
      }

      // Try to restore from session storage as fallback
      const storedContext = this.getStoredContext();
      if (storedContext) {
        this.context = storedContext;
        console.log('Restored context from storage:', this.context);
        this.initialized = true;
        return this.context;
      }

      console.log('No webview context found');
      this.initialized = true;
      return null;
    } catch (error) {
      console.error('Error initializing webview context:', error);
      this.initialized = true;
      return null;
    }
  }

  /**
   * Get current webview context
   */
  static getContext(): WebviewContextData | null {
    return this.context;
  }

  /**
   * Update current context with new data
   */
  static updateContext(updates: Partial<WebviewContextData>): void {
    if (this.context) {
      this.context = { ...this.context, ...updates };
      this.storeContext(this.context);
      console.log('Updated webview context:', this.context);
    }
  }

  /**
   * Parse URL parameters to extract context
   */
  private static parseUrlParameters(): WebviewContextData | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);

      const postId = urlParams.get('postId');
      const blockType = urlParams.get('blockType') as WebviewContextData['blockType'];
      const action = urlParams.get('action');
      const timestamp = urlParams.get('timestamp');

      if (!postId || !blockType || !action || !timestamp) {
        return null;
      }

      const baseContext = {
        postId,
        blockType,
        action,
        timestamp: parseInt(timestamp),
      };

      // Parse block type specific parameters
      switch (blockType) {
        case 'level-preview':
          const levelId = urlParams.get('levelId') || '';
          const mode = urlParams.get('mode') as 'play' | 'edit' | 'preview' | null;
          const difficultyStr = urlParams.get('difficulty');
          const levelCreator = urlParams.get('creator');

          return {
            ...baseContext,
            blockType,
            levelId,
            mode: mode || undefined,
            difficulty: difficultyStr ? parseInt(difficultyStr) : undefined,
            creator: levelCreator || undefined,
            data: this.parseDataParam(urlParams.get('data')),
          };

        case 'weekly-challenge':
          return {
            ...baseContext,
            blockType,
            weekId: urlParams.get('weekId') || '',
            challengeId: urlParams.get('challengeId') || '',
            seedLevelId: urlParams.get('seedLevelId') || '',
            challengeMode: urlParams.get('challengeMode') === 'true',
            data: this.parseDataParam(urlParams.get('data')),
          };

        case 'landing':
          const landingMode = urlParams.get('mode') as
            | 'tutorial'
            | 'getting-started'
            | 'feature-tour';
          const stepStr = urlParams.get('step');

          return {
            ...baseContext,
            blockType,
            mode: landingMode,
            step: stepStr ? parseInt(stepStr) : undefined,
            data: this.parseDataParam(urlParams.get('data')),
          };

        case 'community-showcase':
          const filter = urlParams.get('filter') as
            | 'popular'
            | 'trending'
            | 'new'
            | 'creator'
            | null;
          const communityCreator = urlParams.get('creator');
          const sortBy = urlParams.get('sortBy') as 'plays' | 'rating' | 'date' | null;

          return {
            ...baseContext,
            blockType,
            filter: filter || undefined,
            creator: communityCreator || undefined,
            sortBy: sortBy || undefined,
            data: this.parseDataParam(urlParams.get('data')),
          };

        default:
          return baseContext as WebviewContextData;
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
      return null;
    }
  }

  /**
   * Parse data parameter from URL
   */
  private static parseDataParam(dataParam: string | null): Record<string, unknown> | undefined {
    if (!dataParam) return undefined;

    try {
      return JSON.parse(decodeURIComponent(dataParam));
    } catch (error) {
      console.error('Error parsing data parameter:', error);
      return undefined;
    }
  }

  /**
   * Store context in session storage
   */
  private static storeContext(context: WebviewContextData): void {
    try {
      sessionStorage.setItem('webview_context', JSON.stringify(context));
    } catch (error) {
      console.error('Error storing context:', error);
    }
  }

  /**
   * Get stored context from session storage
   */
  private static getStoredContext(): WebviewContextData | null {
    try {
      const stored = sessionStorage.getItem('webview_context');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving stored context:', error);
      return null;
    }
  }

  /**
   * Send state synchronization data back to the server
   */
  static async syncState(changes: StateSyncData['changes']): Promise<void> {
    if (!this.context) {
      console.warn('No context available for state sync');
      return;
    }

    try {
      const syncData: StateSyncData = {
        postId: this.context.postId,
        blockType: this.context.blockType,
        updatedAt: Date.now(),
        changes,
      };

      // Send sync data to server endpoint
      const response = await fetch('/api/blocks/sync-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      console.log('State synchronized successfully');
    } catch (error) {
      console.error('Error syncing state:', error);
      // Store failed sync for retry
      this.storePendingSync(changes);
    }
  }

  /**
   * Store pending sync data for retry
   */
  private static storePendingSync(changes: StateSyncData['changes']): void {
    try {
      const pending = this.getPendingSyncs();
      pending.push({
        timestamp: Date.now(),
        changes,
      });
      sessionStorage.setItem('pending_syncs', JSON.stringify(pending));
    } catch (error) {
      console.error('Error storing pending sync:', error);
    }
  }

  /**
   * Get pending sync data
   */
  private static getPendingSyncs(): Array<{
    timestamp: number;
    changes: StateSyncData['changes'];
  }> {
    try {
      const stored = sessionStorage.getItem('pending_syncs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving pending syncs:', error);
      return [];
    }
  }

  /**
   * Retry pending synchronizations
   */
  static async retryPendingSyncs(): Promise<void> {
    const pending = this.getPendingSyncs();
    if (pending.length === 0) return;

    console.log(`Retrying ${pending.length} pending syncs`);

    const successful: number[] = [];

    for (let i = 0; i < pending.length; i++) {
      const pendingSync = pending[i];
      if (!pendingSync) continue;

      try {
        await this.syncState(pendingSync.changes);
        successful.push(i);
      } catch (error) {
        console.error(`Failed to retry sync ${i}:`, error);
      }
    }

    // Remove successful syncs
    if (successful.length > 0) {
      const remaining = pending.filter((_, index) => !successful.includes(index));
      sessionStorage.setItem('pending_syncs', JSON.stringify(remaining));
    }
  }

  /**
   * Clear all stored context and sync data
   */
  static clearStoredData(): void {
    try {
      sessionStorage.removeItem('webview_context');
      sessionStorage.removeItem('pending_syncs');
      console.log('Cleared stored webview data');
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  }

  /**
   * Get context-specific configuration for the game
   */
  static getGameConfig(): Record<string, unknown> {
    if (!this.context) return {};

    const config: Record<string, unknown> = {
      postId: this.context.postId,
      blockType: this.context.blockType,
      action: this.context.action,
    };

    switch (this.context.blockType) {
      case 'level-preview':
        const levelContext = this.context as any;
        return {
          ...config,
          levelId: levelContext.levelId,
          mode: levelContext.mode,
          difficulty: levelContext.difficulty,
          creator: levelContext.creator,
          autoStart: levelContext.mode === 'play',
        };

      case 'weekly-challenge':
        const challengeContext = this.context as any;
        return {
          ...config,
          weekId: challengeContext.weekId,
          challengeId: challengeContext.challengeId,
          seedLevelId: challengeContext.seedLevelId,
          challengeMode: challengeContext.challengeMode,
          userProgress: challengeContext.userProgress,
          autoStart: true,
        };

      case 'landing':
        const landingContext = this.context as any;
        return {
          ...config,
          mode: landingContext.mode,
          step: landingContext.step,
          showTutorial: landingContext.mode === 'tutorial',
        };

      case 'community-showcase':
        const communityContext = this.context as any;
        return {
          ...config,
          filter: communityContext.filter,
          creator: communityContext.creator,
          sortBy: communityContext.sortBy,
          showBrowser: true,
        };

      default:
        return config;
    }
  }
}
