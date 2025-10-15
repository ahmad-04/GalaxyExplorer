import StartGame from './game/main';
import { ThemeManager, applyThemeToDocument, themes } from './theme';
import { WebviewContextClient } from './services/WebviewContextClient';
import { BlockReturnHandler } from './services/BlockReturnHandler';
import './style.css';
import './buildmode-ui.css';

// It's important to declare the Devvit type for TypeScript
interface DevvitClient {
  init: (callback: (context?: unknown) => void | Promise<void>) => void;
  getProps: <T = unknown>() => Promise<T>;
}
declare const Devvit: DevvitClient;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded. Initializing Devvit context...');

  // Initialize theme from storage and apply CSS variables early
  ThemeManager.initFromStorage();
  try {
    applyThemeToDocument(themes[ThemeManager.getName()]);
  } catch (e) {
    // non-fatal if document not ready in certain embeds
  }

  // Initialize webview context first
  const webviewContext = await WebviewContextClient.initialize();
  console.log('Webview context initialized:', webviewContext);

  // Initialize return handler for block navigation
  BlockReturnHandler.initialize();

  // Show return button if we came from a block
  BlockReturnHandler.showReturnButtonIfNeeded();

  // Failsafe: hide splash after 7s in case boot hangs
  const splashTimeout = window.setTimeout(() => {
    const el = document.getElementById('splash');
    if (el) el.classList.add('hidden');
  }, 7000);

  // Check if the Devvit object is available
  if (typeof Devvit !== 'undefined') {
    Devvit.init(async (context: unknown) => {
      console.log('Devvit context initialized:', context);

      try {
        const props = await Devvit.getProps<Record<string, unknown>>();
        console.log('Props received from Devvit:', props);

        // Merge webview context with Devvit props
        const gameConfig = {
          ...props,
          ...WebviewContextClient.getGameConfig(),
          webviewContext,
        };

        console.log('Starting game with merged config:', gameConfig);
        StartGame('game-container', gameConfig);

        // Retry any pending state synchronizations
        await WebviewContextClient.retryPendingSyncs();

        window.clearTimeout(splashTimeout);
      } catch (error) {
        console.error('Error initializing with Devvit props:', error);
        // Fallback to context-only initialization
        const gameConfig = {
          ...WebviewContextClient.getGameConfig(),
          webviewContext,
        };
        StartGame('game-container', gameConfig);
        window.clearTimeout(splashTimeout);
      }
    });
  } else {
    // Fallback for local development outside of Reddit
    console.log('Devvit object not found. Running in fallback mode.');

    const gameConfig = {
      ...WebviewContextClient.getGameConfig(),
      webviewContext,
      developmentMode: true,
    };

    console.log('Starting game in development mode with config:', gameConfig);
    const game = StartGame('game-container', gameConfig);

    // Hide splash once the first scene creates (LoadingScene updates splash too)
    if (game) {
      game.events.once('ready', () => {
        const el = document.getElementById('splash');
        if (el) el.classList.add('hidden');
      });
    }
    window.clearTimeout(splashTimeout);
  }
});
