import {
  WebviewContextData,
  StateSyncData,
  PlayModeWebviewContext,
  BuildModeWebviewContext,
  LevelWebviewContext,
  ChallengeWebviewContext,
  LandingWebviewContext,
  CommunityWebviewContext,
} from '../../shared/types/blocks';

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
      const w =
        typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
      if (w && typeof w['Devvit'] === 'object' && w['Devvit']) {
        const dv = w['Devvit'] as { getProps: <T = unknown>() => Promise<T> } | undefined;
        if (dv && typeof dv.getProps === 'function') {
          const props = (await dv.getProps<Record<string, unknown>>()) || {};
          const wc =
            props && typeof props === 'object' && 'webviewContext' in props
              ? (props['webviewContext'] as WebviewContextData)
              : undefined;
          if (wc) {
            this.context = wc;
            console.log('Initialized context from Devvit props:', this.context);
            this.initialized = true;
            return this.context;
          }
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
      console.log('[WebviewContext] Parsing URL parameters:', window.location.search);

      const postId = urlParams.get('postId');
      const blockTypeRaw = urlParams.get('blockType') || '';
      const action = urlParams.get('action');
      const timestamp = urlParams.get('timestamp');

      console.log('[WebviewContext] Extracted base params:', {
        postId,
        blockType: blockTypeRaw,
        action,
        timestamp,
      });

      if (!postId || !blockTypeRaw || !action || !timestamp) {
        console.log('[WebviewContext] Missing required parameters, returning null');
        return null;
      }

      // Treat legacy/alias block types first
      // Reddit sometimes sends blockType=game with a separate mode parameter.
      // Normalize that into our supported play-mode/build-mode shapes.
      const modeParam = urlParams.get('mode');
      if (blockTypeRaw === 'game') {
        if (modeParam === 'play') {
          const gameType =
            (urlParams.get('gameType') as 'campaign' | 'community' | 'challenge' | null) ||
            'campaign';
          const levelId = urlParams.get('levelId') || undefined;
          const difficultyStr = urlParams.get('difficulty');
          const autoStartStr = urlParams.get('autoStart');

          const ctx = {
            postId,
            blockType: 'play-mode' as const,
            action,
            timestamp: parseInt(timestamp),
            gameType,
            levelId,
            difficulty: difficultyStr ? parseInt(difficultyStr) : undefined,
            autoStart: autoStartStr ? autoStartStr === 'true' : true,
            data: this.parseDataParam(urlParams.get('data')),
          };
          return ctx;
        }
        if (modeParam === 'build') {
          const buildAction =
            (urlParams.get('action') as 'create' | 'edit' | 'tutorial' | null) || 'create';
          const levelId = urlParams.get('levelId') || undefined;
          const templateId = urlParams.get('templateId') || undefined;
          const tutorialStepStr = urlParams.get('tutorialStep');
          const ctx = {
            postId,
            blockType: 'build-mode' as const,
            action: buildAction,
            timestamp: parseInt(timestamp),
            levelId,
            templateId,
            tutorialStep: tutorialStepStr ? parseInt(tutorialStepStr) : undefined,
            data: this.parseDataParam(urlParams.get('data')),
          };
          return ctx;
        }
        // Unknown mode with blockType=game; fall through to default base context
      }

      // From here on, treat the blockType as one of our known union values
      const blockType = blockTypeRaw as WebviewContextData['blockType'];

      const baseContext = {
        postId,
        blockType,
        action,
        timestamp: parseInt(timestamp),
      } as const;

      // Parse block type specific parameters
      switch (blockType) {
        case 'level-preview': {
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
          } as unknown as WebviewContextData;
        }

        case 'weekly-challenge': {
          return {
            ...baseContext,
            blockType,
            weekId: urlParams.get('weekId') || '',
            challengeId: urlParams.get('challengeId') || '',
            seedLevelId: urlParams.get('seedLevelId') || '',
            challengeMode: urlParams.get('challengeMode') === 'true',
            data: this.parseDataParam(urlParams.get('data')),
          } as unknown as WebviewContextData;
        }

        case 'landing': {
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
          } as unknown as WebviewContextData;
        }

        case 'community-showcase': {
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
          } as unknown as WebviewContextData;
        }

        case 'play-mode': {
          const gameType = urlParams.get('gameType') as
            | 'campaign'
            | 'community'
            | 'challenge'
            | null;
          const playLevelId = urlParams.get('levelId');
          const playDifficultyStr = urlParams.get('difficulty');
          const autoStartStr = urlParams.get('autoStart');

          console.log('[WebviewContext] Play mode params:', {
            gameType,
            playLevelId,
            playDifficultyStr,
            autoStartStr,
          });

          const playContext = {
            ...baseContext,
            blockType,
            gameType: gameType || 'campaign',
            levelId: playLevelId || undefined,
            difficulty: playDifficultyStr ? parseInt(playDifficultyStr) : undefined,
            autoStart: autoStartStr ? autoStartStr === 'true' : true,
            data: this.parseDataParam(urlParams.get('data')),
          };

          console.log('[WebviewContext] Created play context:', playContext);
          return playContext as unknown as WebviewContextData;
        }

        case 'build-mode': {
          const buildAction =
            (urlParams.get('action') as 'create' | 'edit' | 'tutorial' | null) || 'create';
          const buildLevelId = urlParams.get('levelId');
          const templateId = urlParams.get('templateId');
          const tutorialStepStr = urlParams.get('tutorialStep');

          return {
            ...baseContext,
            blockType,
            action: buildAction,
            levelId: buildLevelId || undefined,
            templateId: templateId || undefined,
            tutorialStep: tutorialStepStr ? parseInt(tutorialStepStr) : undefined,
            data: this.parseDataParam(urlParams.get('data')),
          } as unknown as WebviewContextData;
        }

        default:
          return baseContext as unknown as WebviewContextData;
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
    console.log('[WebviewContext] getGameConfig called, context:', this.context);

    if (!this.context) {
      console.log('[WebviewContext] No context available, returning empty config');
      return {};
    }

    const config: Record<string, unknown> = {
      postId: this.context.postId,
      blockType: this.context.blockType,
      action: this.context.action,
    };

    console.log('[WebviewContext] Base config:', config);

    switch (this.context.blockType) {
      case 'level-preview': {
        const levelContext = this.context as LevelWebviewContext;
        return {
          ...config,
          levelId: levelContext.levelId,
          mode: levelContext.mode,
          difficulty: levelContext.difficulty,
          creator: levelContext.creator,
          autoStart: levelContext.mode === 'play',
        };
      }

      case 'weekly-challenge': {
        const challengeContext = this.context as ChallengeWebviewContext;
        return {
          ...config,
          weekId: challengeContext.weekId,
          challengeId: challengeContext.challengeId,
          seedLevelId: challengeContext.seedLevelId,
          challengeMode: challengeContext.challengeMode,
          userProgress: challengeContext.userProgress,
          autoStart: true,
        };
      }

      case 'landing': {
        const landingContext = this.context as LandingWebviewContext;
        return {
          ...config,
          mode: landingContext.mode,
          step: landingContext.step,
          showTutorial: landingContext.mode === 'tutorial',
        };
      }

      case 'community-showcase': {
        const communityContext = this.context as CommunityWebviewContext;
        return {
          ...config,
          filter: communityContext.filter,
          creator: communityContext.creator,
          sortBy: communityContext.sortBy,
          showBrowser: true,
        };
      }

      case 'play-mode': {
        const playContext = this.context as PlayModeWebviewContext;
        const playConfig = {
          ...config,
          gameType: playContext.gameType,
          levelId: playContext.levelId,
          difficulty: playContext.difficulty,
          autoStart: typeof playContext.autoStart === 'boolean' ? playContext.autoStart : true,
          mode: 'play',
        };
        console.log('[WebviewContext] Play mode config:', playConfig);
        return playConfig;
      }

      case 'build-mode': {
        const buildContext = this.context as BuildModeWebviewContext;
        const buildConfig = {
          ...config,
          action: buildContext.action,
          levelId: buildContext.levelId,
          templateId: buildContext.templateId,
          tutorialStep: buildContext.tutorialStep,
          mode: 'build',
          showBuilder: true,
        };
        console.log('[WebviewContext] Build mode config:', buildConfig);
        return buildConfig;
      }

      default:
        console.log('[WebviewContext] Unknown block type, returning base config:', config);
        return config;
    }
  }
}
