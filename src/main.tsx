import { Devvit, useState } from '@devvit/public-api';

// Configure the app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

// Add menu action for creating the main Galaxy Explorer menu
Devvit.addMenuItem({
  label: 'Create Galaxy Explorer Menu',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    const post = await reddit.submitPost({
      title: 'Galaxy Explorer - Main Menu',
      subredditName: context.subredditName!,
      kind: 'text',
      text: 'Galaxy Explorer main menu - use the interactive block below to play or build!',
    });

    ui.showToast({ text: `Created Galaxy Explorer main menu: ${post.id}` });
  },
});

// Helper function to handle block actions with proper context
const handleBlockAction = async (
  context: any,
  postId: string,
  actionId: string,
  blockType: string,
  actionData: Record<string, unknown>
) => {
  const { ui } = context;
  try {
    console.log('[Block Action] Starting action:', { postId, actionId, blockType, actionData });
    ui.showToast({ text: 'Loading Galaxy Explorer...' });

    // Build webview URL with context parameters
    const params = new URLSearchParams({
      postId,
      blockType,
      action: actionId,
      timestamp: Date.now().toString(),
      ...Object.fromEntries(Object.entries(actionData).map(([key, value]) => [key, String(value)])),
    });

    const webviewUrl = `https://reddit.com/r/galaxytester0982_dev?${params.toString()}`;
    console.log('[Block Action] Generated webview URL:', webviewUrl);

    // Navigate to webview with context
    console.log('[Block Action] Navigating to webview...');
    console.log('[Block Action] Available UI methods:', Object.keys(ui));
    console.log('[Block Action] Full context object keys:', Object.keys(context));
    console.log('[Block Action] Context object:', context);

    // Try different navigation approaches with full context
    console.log('[Block Action] Attempting navigation to webview URL:', webviewUrl);

    // Check if context has navigation methods
    if (context.ui && context.ui.navigateTo && typeof context.ui.navigateTo === 'function') {
      console.log('[Block Action] Using context.ui.navigateTo');
      context.ui.navigateTo(webviewUrl);
    } else if (context.ui && context.ui.webView && typeof context.ui.webView === 'function') {
      console.log('[Block Action] Using context.ui.webView as function');
      context.ui.webView({ url: webviewUrl });
    } else if (ui.navigateTo && typeof ui.navigateTo === 'function') {
      console.log('[Block Action] Using ui.navigateTo');
      ui.navigateTo(webviewUrl);
    } else if (ui.webView && ui.webView.postMessage) {
      console.log('[Block Action] Using webView postMessage approach');
      ui.webView.postMessage({ action: 'navigate', url: webviewUrl, params: actionData });
    } else {
      console.log('[Block Action] Trying alternative approaches...');

      // Try to find any navigation method in the context
      const allMethods = [];
      for (const key in context) {
        if (typeof context[key] === 'object' && context[key] !== null) {
          for (const subKey in context[key]) {
            if (typeof context[key][subKey] === 'function') {
              allMethods.push(`${key}.${subKey}`);
            }
          }
        }
      }
      console.log('[Block Action] Available methods in context:', allMethods);

      throw new Error(
        `No webview navigation method available. Available methods: ${allMethods.join(', ')}`
      );
    }
    console.log('[Block Action] Navigation initiated successfully');
  } catch (error) {
    console.error('[Block Action] Error occurred:', error);
    ui.showToast({ text: 'Failed to launch Galaxy Explorer. Please try again.' });
  }
};

// Main app component - Galaxy Explorer Main Menu
Devvit.addCustomPostType({
  name: 'Galaxy Explorer',
  height: 'regular',
  render: (context) => {
    const [selectedMode, setSelectedMode] = useState<'menu' | 'play' | 'build'>('menu');
    const [loading, setLoading] = useState(false);

    // Main menu screen
    if (selectedMode === 'menu') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="navy">
          <text size="xxlarge" weight="bold" color="white">
            Galaxy Explorer
          </text>
          <text size="medium" color="lightblue">
            Build epic space levels and share them with the community
          </text>
          <spacer size="large" />

          <vstack gap="small" alignment="center">
            <text size="small" color="white">
              ✨ Create custom space missions
            </text>
            <text size="small" color="white">
              🚀 Share with the community
            </text>
            <text size="small" color="white">
              🎮 Play levels by other creators
            </text>
            <text size="small" color="white">
              🏆 Compete in weekly challenges
            </text>
          </vstack>

          <spacer size="large" />

          <vstack gap="medium" alignment="center">
            <button
              appearance="primary"
              size="large"
              onPress={() => setSelectedMode('play')}
              disabled={loading}
            >
              🎮 Play
            </button>
            <button
              appearance="secondary"
              size="large"
              onPress={() => setSelectedMode('build')}
              disabled={loading}
            >
              🔧 Build
            </button>
          </vstack>

          <spacer size="medium" />
          <text size="small" color="lightgray" alignment="center">
            Choose your adventure in the galaxy
          </text>
        </vstack>
      );
    }

    // Play mode selection screen
    if (selectedMode === 'play') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkblue">
          <button appearance="plain" onPress={() => setSelectedMode('menu')}>
            <text size="small" color="lightblue">
              ← Back to Menu
            </text>
          </button>
          <spacer size="medium" />

          <text size="xxlarge" weight="bold" color="white">
            Play Mode
          </text>
          <text size="medium" color="lightblue">
            Choose how you want to play
          </text>
          <spacer size="large" />

          <vstack gap="medium" alignment="center">
            <button
              appearance="primary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'start_game',
                  'play-mode',
                  {
                    mode: 'play',
                    gameType: 'campaign',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🚀 Start Campaign'}
            </button>

            <button
              appearance="secondary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'browse_levels',
                  'play-mode',
                  {
                    mode: 'play',
                    gameType: 'community',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🌟 Community Levels'}
            </button>

            <button
              appearance="secondary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'weekly_challenge',
                  'play-mode',
                  {
                    mode: 'play',
                    gameType: 'challenge',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🏆 Weekly Challenge'}
            </button>
          </vstack>
        </vstack>
      );
    }

    // Build mode selection screen
    if (selectedMode === 'build') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkgreen">
          <button appearance="plain" onPress={() => setSelectedMode('menu')}>
            <text size="small" color="lightgreen">
              ← Back to Menu
            </text>
          </button>
          <spacer size="medium" />

          <text size="xxlarge" weight="bold" color="white">
            Build Mode
          </text>
          <text size="medium" color="lightgreen">
            Create and share your own levels
          </text>
          <spacer size="large" />

          <vstack gap="medium" alignment="center">
            <button
              appearance="primary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'new_level',
                  'build-mode',
                  {
                    mode: 'build',
                    action: 'create',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '✨ Create New Level'}
            </button>

            <button
              appearance="secondary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'my_levels',
                  'build-mode',
                  {
                    mode: 'build',
                    action: 'edit',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '📝 Edit My Levels'}
            </button>

            <button
              appearance="secondary"
              size="large"
              onPress={async () => {
                setLoading(true);
                await handleBlockAction(
                  context,
                  context.postId || 'main-menu',
                  'tutorial',
                  'build-mode',
                  {
                    mode: 'build',
                    action: 'tutorial',
                  }
                );
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🎓 Building Tutorial'}
            </button>
          </vstack>
        </vstack>
      );
    }

    // Fallback (shouldn't reach here)
    return (
      <vstack height="100%" width="100%" alignment="middle center" backgroundColor="red">
        <text size="large" weight="bold" color="white">
          Error: Unknown state
        </text>
        <button onPress={() => setSelectedMode('menu')}>Return to Menu</button>
      </vstack>
    );
  },
});

export default Devvit;
