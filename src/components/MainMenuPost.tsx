import { Devvit, useState, Context } from '@devvit/public-api';
import { MenuScreen } from './MenuScreen';
import { PlayModeScreen } from './PlayModeScreen';
import { BuildModeScreen } from './BuildModeScreen';
import {
  defaultWebviewLauncher,
  type WebviewLaunchParams,
  handleNavigationError,
  handleWebviewError,
  handleValidationError,
  handleCriticalError,
} from '../utils';

export interface MainMenuPostProps {
  context: Context;
}

/**
 * Navigation state type for the main menu
 */
export type PageType = 'menu' | 'play' | 'build';

/**
 * Error state interface for comprehensive error tracking
 */
interface ErrorState {
  hasError: boolean;
  errorMessage?: string;
  errorCode?: string;
  timestamp?: number;
  retryCount?: number;
}

/**
 * Loading state interface for granular loading management
 */
interface LoadingState {
  isLoading: boolean;
  operation?: 'navigation' | 'webview_launch' | 'initialization';
  message?: string;
}

/**
 * Main menu post component that handles navigation between different screens
 * and integrates with the webview launcher for game mode launches
 */
export const MainMenuPost: Devvit.BlockComponent<MainMenuPostProps> = ({ context }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOperation, setLoadingOperation] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorRetryCount, setErrorRetryCount] = useState(0);

  /**
   * Clear error state
   */
  const clearError = () => {
    console.log('[MainMenuPost] Clearing error state');
    setHasError(false);
    setErrorMessage('');
    setErrorCode('');
    setErrorRetryCount(0);
  };

  /**
   * Set error state with comprehensive error information using centralized error handler
   */
  const setError = (message: string, code?: string, retryCount?: number) => {
    // Use centralized error handler for consistent logging and user feedback
    const errorInfo = handleNavigationError(message, context);

    setHasError(true);
    setErrorMessage(errorInfo.userMessage || message);
    setErrorCode(errorInfo.code);
    setErrorRetryCount(retryCount || 0);
  };

  /**
   * Set loading state with operation context
   */
  const setLoading = (
    loading: boolean,
    operation?: LoadingState['operation'],
    message?: string
  ) => {
    console.log(`[MainMenuPost] Loading state changed: ${loading}`, { operation, message });
    setIsLoading(loading);
    setLoadingOperation(operation || '');
    setLoadingMessage(message || '');
  };

  /**
   * Navigation handler for moving between screens with error handling
   */
  const navigateToPage = (page: PageType) => {
    try {
      console.log(`[MainMenuPost] Navigating to page: ${page}`);

      // Clear any existing errors
      clearError();

      // Set loading state for navigation
      setLoading(true, 'navigation', `Navigating to ${page} mode`);

      // Validate page type
      const validPages: PageType[] = ['menu', 'play', 'build'];
      if (!validPages.includes(page)) {
        throw new Error(`Invalid page type: ${page}`);
      }

      // Perform navigation
      setCurrentPage(page);

      // Clear loading state after successful navigation
      setTimeout(() => {
        setLoading(false);
      }, 300); // Brief delay for smooth UX
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Navigation error';
      handleNavigationError(`Failed to navigate to ${page}: ${errorMessage}`, context);

      setError(`Failed to navigate to ${page}. Returning to main menu.`, 'NAVIGATION_ERROR');

      // Fallback to menu on navigation error
      setCurrentPage('menu');
      setLoading(false);
    }
  };

  /**
   * Navigate back to the main menu with error recovery
   */
  const navigateToMenu = () => {
    try {
      navigateToPage('menu');
    } catch (error) {
      console.error('[MainMenuPost] Failed to navigate to menu:', error);
      // Force reset to menu state as last resort
      setCurrentPage('menu');
      setLoading(false);
      clearError();
    }
  };

  /**
   * Navigate to play mode screen
   */
  const navigateToPlay = () => {
    navigateToPage('play');
  };

  /**
   * Navigate to build mode screen
   */
  const navigateToBuild = () => {
    navigateToPage('build');
  };

  /**
   * Handle webview launch with comprehensive error handling and loading states
   */
  const handleWebviewLaunch = async (params: WebviewLaunchParams): Promise<void> => {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      console.log('[MainMenuPost] Starting webview launch:', params);

      // Clear any existing errors
      clearError();

      // Set loading state with specific operation context
      setLoading(true, 'webview_launch', 'Launching Galaxy Explorer...');

      // Validate required parameters
      if (!params.postId && !context.postId) {
        throw new Error('Missing post ID for webview launch');
      }

      if (!params.actionId) {
        throw new Error('Missing action ID for webview launch');
      }

      if (!params.blockType) {
        throw new Error('Missing block type for webview launch');
      }

      // Ensure we have the correct post ID
      const launchParams: WebviewLaunchParams = {
        ...params,
        postId: context.postId || params.postId,
      };

      console.log('[MainMenuPost] Validated launch parameters:', launchParams);

      // Launch webview using the utility with retry logic
      const result = await defaultWebviewLauncher.launchWebview(context, launchParams);
      retryCount = result.retryCount || 0;

      if (!result.success) {
        const errorMessage = result.error || 'Unknown webview launch error';
        console.error('[MainMenuPost] Webview launch failed:', {
          error: errorMessage,
          retryCount,
          duration: Date.now() - startTime,
          params: launchParams,
        });

        // Use centralized error handler for webview errors
        handleWebviewError(errorMessage, context, retryCount);

        // Set comprehensive error state
        setError(
          `Failed to launch Galaxy Explorer${retryCount > 0 ? ` after ${retryCount} retries` : ''}. Please check your connection and try again.`,
          'WEBVIEW_LAUNCH_ERROR',
          retryCount
        );
      } else {
        console.log('[MainMenuPost] Webview launch successful:', {
          retryCount,
          duration: Date.now() - startTime,
        });

        // Show success feedback
        context.ui.showToast({
          text: 'Galaxy Explorer launched successfully!',
          appearance: 'success',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[MainMenuPost] Unexpected error during webview launch:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        params,
        duration: Date.now() - startTime,
        retryCount,
      });

      // Use centralized error handler for critical errors
      handleCriticalError(error instanceof Error ? error : errorMessage, context);

      // Set detailed error state
      setError(
        `Unexpected error: ${errorMessage}. Please try again or contact support if the issue persists.`,
        'UNEXPECTED_ERROR',
        retryCount
      );
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  /**
   * Render error screen with recovery options
   */
  const renderErrorScreen = () => {
    return (
      <vstack
        height="100%"
        width="100%"
        alignment="middle center"
        backgroundColor="#1a1a2e"
        gap="medium"
      >
        <text size="large" weight="bold" color="#ff6b6b">
          ⚠️ Something went wrong
        </text>

        <text size="medium" color="white" alignment="center">
          {errorMessage || 'An unexpected error occurred'}
        </text>

        {errorCode && errorCode !== '' && (
          <text size="small" color="lightgray">
            Error Code: {errorCode}
          </text>
        )}

        {errorRetryCount > 0 && (
          <text size="small" color="lightgray">
            Retries attempted: {errorRetryCount}
          </text>
        )}

        <spacer size="medium" />

        <vstack gap="small" alignment="center">
          <button appearance="primary" onPress={clearError}>
            Try Again
          </button>

          <button appearance="secondary" onPress={navigateToMenu}>
            Return to Main Menu
          </button>
        </vstack>

        <spacer size="small" />

        <text size="small" color="lightgray" alignment="center">
          If this problem persists, please contact support
        </text>
      </vstack>
    );
  };

  /**
   * Render loading screen with operation context
   */
  const renderLoadingScreen = () => {
    return (
      <vstack
        height="100%"
        width="100%"
        alignment="middle center"
        backgroundColor="#1a1a2e"
        gap="medium"
      >
        <text size="large" weight="bold" color="white">
          🌌 Galaxy Explorer
        </text>

        <text size="medium" color="lightblue">
          {loadingMessage || 'Loading...'}
        </text>

        <spacer size="medium" />

        {/* Simple loading animation using text */}
        <text size="large" color="white">
          ⭐ ✨ 🌟 ✨ ⭐
        </text>

        <text size="small" color="lightgray">
          Please wait while we prepare your experience
        </text>
      </vstack>
    );
  };

  /**
   * Render the current page based on navigation state with comprehensive error handling
   */
  const renderCurrentPage = () => {
    try {
      // Show error screen if there's an active error
      if (hasError) {
        return renderErrorScreen();
      }

      // Show loading screen for certain operations
      if (isLoading && loadingOperation === 'webview_launch') {
        return renderLoadingScreen();
      }

      // Render appropriate screen based on current page
      switch (currentPage) {
        case 'menu':
          return (
            <MenuScreen
              onPlayPress={navigateToPlay}
              onBuildPress={navigateToBuild}
              loading={isLoading}
              errorState={{
                hasError,
                errorMessage: errorMessage || undefined,
                errorCode: errorCode || undefined,
              }}
              onClearError={clearError}
            />
          );

        case 'play':
          return (
            <PlayModeScreen
              onBack={navigateToMenu}
              onLaunchWebview={handleWebviewLaunch}
              loading={isLoading}
              errorState={{
                hasError,
                errorMessage: errorMessage || undefined,
                errorCode: errorCode || undefined,
              }}
              onClearError={clearError}
            />
          );

        case 'build':
          return (
            <BuildModeScreen
              onBack={navigateToMenu}
              onLaunchWebview={handleWebviewLaunch}
              loading={isLoading}
              errorState={{
                hasError,
                errorMessage: errorMessage || undefined,
                errorCode: errorCode || undefined,
              }}
              onClearError={clearError}
            />
          );

        default:
          // Comprehensive fallback for invalid state
          console.error('[MainMenuPost] Invalid page state detected:', currentPage);

          // Log additional context for debugging
          console.error('[MainMenuPost] Debug context:', {
            currentPage,
            isLoading,
            loadingOperation,
            loadingMessage,
            hasError,
            errorMessage,
            errorCode,
            contextPostId: context.postId,
            timestamp: new Date().toISOString(),
          });

          // Set error state and return to menu
          setError(
            'Invalid navigation state detected. Returning to main menu.',
            'INVALID_PAGE_STATE'
          );

          // Force reset to menu state
          setCurrentPage('menu');

          return (
            <vstack
              height="100%"
              width="100%"
              alignment="middle center"
              backgroundColor="#1a1a2e"
              gap="medium"
            >
              <text size="large" weight="bold" color="#ff6b6b">
                ⚠️ Navigation Error
              </text>
              <text size="medium" color="white">
                Invalid page state detected
              </text>
              <text size="small" color="lightgray">
                Returning to main menu...
              </text>
              <spacer size="medium" />
              <button appearance="primary" onPress={navigateToMenu}>
                Go to Main Menu
              </button>
            </vstack>
          );
      }
    } catch (renderError) {
      // Ultimate fallback for render errors
      console.error('[MainMenuPost] Critical render error:', renderError);

      return (
        <vstack
          height="100%"
          width="100%"
          alignment="middle center"
          backgroundColor="#1a1a2e"
          gap="medium"
        >
          <text size="large" weight="bold" color="#ff6b6b">
            🚨 Critical Error
          </text>
          <text size="medium" color="white" alignment="center">
            A critical error occurred while rendering the interface
          </text>
          <text size="small" color="lightgray" alignment="center">
            Please refresh the page or contact support
          </text>
          <spacer size="medium" />
          <button
            appearance="primary"
            onPress={() => {
              // Reset all state as last resort
              setCurrentPage('menu');
              setIsLoading(false);
              setLoadingOperation('');
              setLoadingMessage('');
              setHasError(false);
              setErrorMessage('');
              setErrorCode('');
              setErrorRetryCount(0);
            }}
          >
            Reset Application
          </button>
        </vstack>
      );
    }
  };

  // Render the current page with error boundary
  return renderCurrentPage();
};
