import { Devvit, Context, useState } from '@devvit/public-api';

const buildWebviewUrl = (params: Record<string, string>): string => {
  const search = new URLSearchParams(params);
  return `index.html?${search.toString()}`;
};

export type PageType = 'menu' | 'play' | 'build';

export const MainMenuPost: Devvit.BlockComponent<{ context: Context }> = ({ context }) => {
  const [selectedMode, setSelectedMode] = useState<PageType>('menu');
  const [activeWebview, setActiveWebview] = useState<string | null>(null);

  const postId = context.postId || 'main-menu';
  const timestamp = Date.now().toString();

  if (activeWebview) {
    return (
      <vstack grow>
        <webview
          id={`webview-${activeWebview}`}
          url={buildWebviewUrl({
            postId,
            blockType: activeWebview.startsWith('play-') ? 'play-mode' : 'build-mode',
            action: activeWebview.replace('play-', '').replace('build-', ''),
            mode: activeWebview.startsWith('play-') ? 'play' : 'build',
            gameType: activeWebview.replace('play-', '').replace('build-', ''),
            timestamp,
          })}
          grow
        />
      </vstack>
    );
  }

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
            ��� Share with the community
          </text>
          <text size="small" color="white">
            ��� Play levels by other creators
          </text>
          <text size="small" color="white">
            �� Compete in weekly challenges
          </text>
        </vstack>
        <spacer size="large" />
        <vstack gap="medium" alignment="center">
          <button appearance="primary" size="large" onPress={() => setSelectedMode('play')}>
            ��� Play
          </button>
          <button appearance="secondary" size="large" onPress={() => setSelectedMode('build')}>
            ��� Build
          </button>
        </vstack>
        <spacer size="medium" />
        <text size="small" color="lightgray" alignment="center">
          Choose your adventure in the galaxy
        </text>
      </vstack>
    );
  }

  if (selectedMode === 'play') {
    return (
      <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkblue">
        <button appearance="plain" onPress={() => setSelectedMode('menu')}>
          ← Back to Menu
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
            onPress={() => {
              context.ui.showToast({ text: 'Launching Campaign…' });
              setActiveWebview('play-start_game');
            }}
          >
            ��� Start Campaign
          </button>
          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: 'Opening Community…' });
              setActiveWebview('play-browse_levels');
            }}
          >
            ��� Community Levels
          </button>
          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: 'Joining Challenge…' });
              setActiveWebview('play-weekly_challenge');
            }}
          >
            ��� Weekly Challenge
          </button>
        </vstack>
      </vstack>
    );
  }

  if (selectedMode === 'build') {
    return (
      <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkgreen">
        <button appearance="plain" onPress={() => setSelectedMode('menu')}>
          ← Back to Menu
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
            onPress={() => {
              context.ui.showToast({ text: 'Opening Builder…' });
              setActiveWebview('build-create');
            }}
          >
            ✨ Create New Level
          </button>
          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: 'Loading Your Levels…' });
              setActiveWebview('build-edit');
            }}
          >
            ��� Edit My Levels
          </button>
          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: 'Opening Tutorial…' });
              setActiveWebview('build-tutorial');
            }}
          >
            ��� Building Tutorial
          </button>
        </vstack>
      </vstack>
    );
  }

  return (
    <vstack height="100%" width="100%" alignment="middle center" backgroundColor="red">
      <text size="large" weight="bold" color="white">
        Error: Unknown state
      </text>
      <button onPress={() => setSelectedMode('menu')}>Return to Menu</button>
    </vstack>
  );
};
