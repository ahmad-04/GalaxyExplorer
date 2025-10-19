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
    <zstack height="100%" width="100%" alignment="top start">
      {/* Background */}
      <vstack height="100%" width="100%" backgroundColor="#000814" />

      {/* Decorative stars scattered around */}
      <hstack width="100%" alignment="top start">
        <spacer size="small" />
        <text size="small" color="#ffffff88">
          ✦
        </text>
        <spacer grow />
        <text size="medium" color="#ffffff66">
          ✧
        </text>
        <spacer size="large" />
        <text size="small" color="#ffffff44">
          ✦
        </text>
        <spacer size="medium" />
      </hstack>

      {/* Main content centered */}
      <vstack height="100%" width="100%" alignment="middle center">
        <spacer size="large" />
        <spacer size="medium" />

        {/* Top decorative stars */}
        <hstack gap="medium" alignment="center">
          <text size="small" color="#4a90e2">
            ✦
          </text>
          <text size="medium" color="#ffffff">
            ✧
          </text>
          <text size="small" color="#4a90e2">
            ✦
          </text>
        </hstack>

        <spacer size="small" />

        {/* Title */}
        <text size="xxlarge" weight="bold" color="#ffffff">
          GALAXY EXPLORER
        </text>

        <spacer size="small" />

        {/* Subtitle */}
        <text size="large" weight="bold" color="#4a90e2">
          CONQUER THE COSMOS
        </text>

        <spacer size="medium" />

        {/* Bottom decorative line */}
        <hstack gap="small" alignment="center">
          <text size="small" color="#4a90e244">
            ━━━
          </text>
          <text size="small" color="#4a90e2">
            ✦
          </text>
          <text size="small" color="#4a90e244">
            ━━━
          </text>
        </hstack>

        <spacer size="large" />
        <spacer size="medium" />

        {/* Main Menu Buttons */}
        <vstack gap="medium" alignment="center middle">
          <button
            appearance="primary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: '🚀 Starting Game…' });
              mountStartGame();
            }}
          >
            START GAME
          </button>

          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: '🏆 Loading Leaderboard…' });
              mountLeaderboard();
            }}
          >
            LEADERBOARD
          </button>

          <button
            appearance="secondary"
            size="large"
            onPress={() => {
              context.ui.showToast({ text: '🛠️ Opening Build Mode…' });
              mountBuildMode();
            }}
          >
            BUILD MODE
          </button>
        </vstack>

        <spacer size="large" />
        <spacer size="large" />

        {/* Bottom decorative stars */}
        <hstack gap="medium" alignment="center">
          <text size="small" color="#ffffff44">
            ✧
          </text>
          <text size="small" color="#4a90e266">
            ✦
          </text>
          <text size="small" color="#ffffff44">
            ✧
          </text>
        </hstack>

        <spacer size="small" />

        {/* Version footer */}
        <text size="small" color="#555555">
          v1.0
        </text>

        <spacer size="medium" />
      </vstack>

      {/* More scattered stars in corners */}
      <vstack height="100%" width="100%" alignment="bottom end">
        <spacer grow />
        <hstack width="100%" alignment="bottom end">
          <spacer grow />
          <text size="small" color="#ffffff33">
            ✦
          </text>
          <spacer size="medium" />
          <text size="medium" color="#ffffff55">
            ✧
          </text>
          <spacer size="small" />
        </hstack>
      </vstack>
    </zstack>
  );
};
