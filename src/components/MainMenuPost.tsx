import { Devvit, Context, useWebView } from '@devvit/public-api';

const buildWebviewUrl = (params: Record<string, string>): string => {
  const search = new URLSearchParams(params);
  return `index.html?${search.toString()}`;
};

export const MainMenuPost: Devvit.BlockComponent<{ context: Context }> = ({ context }) => {
  const postId = context.postId || 'main-menu';
  const timestamp = Date.now().toString();

  // Create webview hooks for main menu actions
  const { mount: mountStartGame } = useWebView({
    url: buildWebviewUrl({
      postId,
      blockType: 'game',
      action: 'start_game',
      mode: 'play',
      timestamp,
    }),
    onMessage: () => {},
  });

  const { mount: mountLeaderboard } = useWebView({
    url: buildWebviewUrl({
      postId,
      blockType: 'leaderboard',
      action: 'view_leaderboard',
      mode: 'view',
      timestamp,
    }),
    onMessage: () => {},
  });

  const { mount: mountBuildMode } = useWebView({
    url: buildWebviewUrl({
      postId,
      blockType: 'build-mode',
      action: 'create',
      mode: 'build',
      timestamp,
    }),
    onMessage: () => {},
  });

  return (
    <vstack height="100%" width="100%" alignment="middle center" backgroundColor="#0a0a1a">
      <spacer size="large" />
      <spacer size="large" />

      <text size="xxlarge" weight="bold" color="white">
        MAIN MENU
      </text>

      <spacer size="large" />
      <spacer size="medium" />

      <vstack gap="medium" alignment="center middle">
        <button
          appearance="primary"
          size="large"
          onPress={() => {
            context.ui.showToast({ text: 'Starting Game…' });
            mountStartGame();
          }}
        >
          START GAME
        </button>

        <button
          appearance="secondary"
          size="large"
          onPress={() => {
            context.ui.showToast({ text: 'Loading Leaderboard…' });
            mountLeaderboard();
          }}
        >
          LEADERBOARD
        </button>

        <button
          appearance="secondary"
          size="large"
          onPress={() => {
            context.ui.showToast({ text: 'Opening Build Mode…' });
            mountBuildMode();
          }}
        >
          BUILD MODE
        </button>
      </vstack>

      <spacer size="large" />
      <spacer size="large" />

      <text size="small" color="#666666">
        v1.0
      </text>
    </vstack>
  );
};
