import type { Context } from '@devvit/public-api';

/**
 * Parameters for launching a webview with specific game mode and action
 */
export interface WebviewLaunchParams {
  postId: string;
  actionId: string;
  blockType: string;
  actionData: Record<string, unknown>;
}

/**
 * Configuration options for webview launcher
 */
export interface WebviewLauncherConfig {
  maxRetries?: number;
  retryDelay?: number;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Result of webview launch attempt
 */
export interface WebviewLaunchResult {
  success: boolean;
  error?: string;
  retryCount?: number;
  duration?: number;
  errorCode?: string;
  lastAttemptError?: string;
}

/**
 * Default configuration for webview launcher
 */
const DEFAULT_CONFIG: Required<WebviewLauncherConfig> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  baseUrl: 'https://reddit.com/r/galaxytester0982_dev',
  timeout: 10000, // 10 seconds
};

/**
 * Utility class for managing webview launches with error handling and retry logic
 */
export class WebviewLauncher {
  private config: Required<WebviewLauncherConfig>;
  private loadingState: boolean = false;
  private loadingCallbacks: Set<(loading: boolean) => void> = new Set();

  constructor(config: WebviewLauncherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Subscribe to loading state changes
   */
  onLoadingStateChange(callback: (loading: boolean) => void): () => void {
    this.loadingCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.loadingCallbacks.delete(callback);
    };
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingState;
  }

  /**
   * Set loading state and notify subscribers
   */
  private setLoadingState(loading: boolean): void {
    if (this.loadingState !== loading) {
      this.loadingState = loading;
      this.loadingCallbacks.forEach((callback) => callback(loading));
    }
  }

  /**
   * Construct webview URL with proper parameters
   */
  private constructWebviewUrl(params: WebviewLaunchParams): string {
    const urlParams = new URLSearchParams({
      postId: params.postId,
      blockType: params.blockType,
      action: params.actionId,
      timestamp: Date.now().toString(),
      // Convert all action data to strings for URL parameters
      ...Object.fromEntries(
        Object.entries(params.actionData).map(([key, value]) => [key, String(value)])
      ),
    });

    return `${this.config.baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Attempt to navigate to webview using available navigation methods
   */
  private async attemptNavigation(context: Context, url: string): Promise<void> {
    const { ui } = context;

    console.log('[WebviewLauncher] Attempting navigation to:', url);
    console.log('[WebviewLauncher] Available UI methods:', Object.keys(ui));

    // Try different navigation approaches in order of preference
    const navigationMethods = [
      // Method 1: Direct UI navigation
      () => {
        if ((ui as any).navigateTo && typeof (ui as any).navigateTo === 'function') {
          console.log('[WebviewLauncher] Using ui.navigateTo');
          return (ui as any).navigateTo(url);
        }
        throw new Error('ui.navigateTo not available');
      },

      // Method 2: WebView function call
      () => {
        if ((ui as any).webView && typeof (ui as any).webView === 'function') {
          console.log('[WebviewLauncher] Using ui.webView as function');
          return (ui as any).webView({ url });
        }
        throw new Error('ui.webView function not available');
      },

      // Method 3: WebView postMessage
      () => {
        if ((ui as any).webView && (ui as any).webView.postMessage) {
          console.log('[WebviewLauncher] Using webView postMessage');
          return (ui as any).webView.postMessage({ action: 'navigate', url });
        }
        throw new Error('ui.webView.postMessage not available');
      },

      // Method 4: Context-level navigation
      () => {
        if (
          (context as any).ui &&
          (context as any).ui.navigateTo &&
          typeof (context as any).ui.navigateTo === 'function'
        ) {
          console.log('[WebviewLauncher] Using context.ui.navigateTo');
          return (context as any).ui.navigateTo(url);
        }
        throw new Error('context.ui.navigateTo not available');
      },
    ];

    let lastError: Error | null = null;

    for (const method of navigationMethods) {
      try {
        await method();
        console.log('[WebviewLauncher] Navigation successful');
        return; // Success - exit early
      } catch (error) {
        lastError = error as Error;
        console.log('[WebviewLauncher] Navigation method failed:', error);
        continue; // Try next method
      }
    }

    // If we get here, all methods failed
    const availableMethods: string[] = [];
    for (const key in context) {
      if (typeof (context as any)[key] === 'object' && (context as any)[key] !== null) {
        for (const subKey in (context as any)[key]) {
          if (typeof (context as any)[key][subKey] === 'function') {
            availableMethods.push(`${key}.${subKey}`);
          }
        }
      }
    }

    throw new Error(
      `All navigation methods failed. Last error: ${lastError?.message}. Available methods: ${availableMethods.join(', ')}`
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Launch webview with comprehensive retry logic and error handling
   */
  async launchWebview(context: Context, params: WebviewLaunchParams): Promise<WebviewLaunchResult> {
    const { ui } = context;
    const startTime = Date.now();
    let retryCount = 0;
    let lastAttemptError = '';
    let errorCode = '';

    // Set loading state
    this.setLoadingState(true);

    try {
      console.log('[WebviewLauncher] Starting webview launch:', {
        params,
        config: this.config,
        timestamp: new Date().toISOString(),
      });

      // Validate input parameters
      if (!params.postId) {
        throw new Error('Missing required parameter: postId');
      }
      if (!params.actionId) {
        throw new Error('Missing required parameter: actionId');
      }
      if (!params.blockType) {
        throw new Error('Missing required parameter: blockType');
      }

      // Show initial loading toast
      ui.showToast({ text: 'Loading Galaxy Explorer...' });

      // Construct webview URL
      const webviewUrl = this.constructWebviewUrl(params);
      console.log('[WebviewLauncher] Generated webview URL:', webviewUrl);

      // Validate URL construction
      if (!webviewUrl || webviewUrl === this.config.baseUrl) {
        throw new Error('Failed to construct valid webview URL');
      }

      // Attempt navigation with retries
      while (retryCount <= this.config.maxRetries) {
        const attemptStartTime = Date.now();

        try {
          console.log(
            `[WebviewLauncher] Attempt ${retryCount + 1}/${this.config.maxRetries + 1} starting`
          );

          // Create timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Navigation timeout after ${this.config.timeout}ms`));
            }, this.config.timeout);
          });

          // Race between navigation and timeout
          await Promise.race([this.attemptNavigation(context, webviewUrl), timeoutPromise]);

          const attemptDuration = Date.now() - attemptStartTime;
          console.log('[WebviewLauncher] Navigation completed successfully:', {
            retryCount,
            attemptDuration,
            totalDuration: Date.now() - startTime,
          });

          return {
            success: true,
            retryCount,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          retryCount++;
          const attemptDuration = Date.now() - attemptStartTime;
          lastAttemptError = error instanceof Error ? error.message : 'Unknown error';

          // Categorize error types
          if (lastAttemptError.includes('timeout')) {
            errorCode = 'TIMEOUT_ERROR';
          } else if (lastAttemptError.includes('not available')) {
            errorCode = 'METHOD_NOT_AVAILABLE';
          } else if (lastAttemptError.includes('navigation')) {
            errorCode = 'NAVIGATION_ERROR';
          } else {
            errorCode = 'UNKNOWN_ERROR';
          }

          console.error(`[WebviewLauncher] Attempt ${retryCount} failed:`, {
            error: lastAttemptError,
            errorCode,
            attemptDuration,
            retryCount,
            maxRetries: this.config.maxRetries,
          });

          if (retryCount <= this.config.maxRetries) {
            console.log(`[WebviewLauncher] Retrying in ${this.config.retryDelay}ms...`);

            // Show progressive retry messages
            const retryMessage =
              retryCount === 1
                ? 'Connection issue detected, retrying...'
                : `Retrying... (${retryCount}/${this.config.maxRetries})`;

            ui.showToast({ text: retryMessage });
            await this.sleep(this.config.retryDelay);
          } else {
            // Max retries exceeded
            console.error('[WebviewLauncher] Max retries exceeded, giving up');
            throw error;
          }
        }
      }

      // This should never be reached, but just in case
      throw new Error('Unexpected end of retry loop');
    } catch (error) {
      const finalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Comprehensive error logging
      console.error('[WebviewLauncher] Final error after all retries:', {
        error: errorMessage,
        lastAttemptError,
        errorCode,
        retryCount,
        duration: finalDuration,
        params,
        config: this.config,
        contextInfo: {
          postId: context.postId,
          userId: context.userId,
          subredditName: context.subredditName,
        },
        timestamp: new Date().toISOString(),
      });

      // Show contextual error toast
      let userErrorMessage = 'Failed to launch Galaxy Explorer.';

      if (errorCode === 'TIMEOUT_ERROR') {
        userErrorMessage =
          'Connection timeout. Please check your internet connection and try again.';
      } else if (errorCode === 'METHOD_NOT_AVAILABLE') {
        userErrorMessage =
          'Navigation method not available. Please refresh the page and try again.';
      } else if (retryCount > 0) {
        userErrorMessage = `Failed to launch after ${retryCount} attempts. Please try again later.`;
      }

      ui.showToast({
        text: userErrorMessage,
        appearance: 'neutral',
      });

      return {
        success: false,
        error: errorMessage,
        retryCount,
        duration: finalDuration,
        errorCode,
        lastAttemptError,
      };
    } finally {
      // Always clear loading state
      this.setLoadingState(false);

      console.log('[WebviewLauncher] Launch attempt completed:', {
        duration: Date.now() - startTime,
        retryCount,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Create webview launch parameters for play mode
   */
  static createPlayModeParams(
    postId: string,
    gameType: 'campaign' | 'community' | 'challenge'
  ): WebviewLaunchParams {
    const actionMap = {
      campaign: 'start_game',
      community: 'browse_levels',
      challenge: 'weekly_challenge',
    };

    return {
      postId,
      actionId: actionMap[gameType],
      blockType: 'play-mode',
      actionData: {
        mode: 'play',
        gameType,
      },
    };
  }

  /**
   * Create webview launch parameters for build mode
   */
  static createBuildModeParams(
    postId: string,
    action: 'create' | 'edit' | 'tutorial'
  ): WebviewLaunchParams {
    const actionMap = {
      create: 'create_level',
      edit: 'edit_levels',
      tutorial: 'building_tutorial',
    };

    return {
      postId,
      actionId: actionMap[action],
      blockType: 'build-mode',
      actionData: {
        mode: 'build',
        action,
      },
    };
  }
}

/**
 * Default webview launcher instance
 */
export const defaultWebviewLauncher = new WebviewLauncher();

/**
 * Convenience function for launching webview with default configuration
 */
export async function launchWebview(
  context: Context,
  params: WebviewLaunchParams
): Promise<WebviewLaunchResult> {
  return defaultWebviewLauncher.launchWebview(context, params);
}
