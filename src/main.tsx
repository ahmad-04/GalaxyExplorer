import { Devvit, useState } from '@devvit/public-api';

// Configure the app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

// Add menu actions for creating different types of posts
Devvit.addMenuItem({
  label: 'Create Level Block Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    // Create a post with a level preview block
    const post = await reddit.submitPost({
      title: 'Test Level - Epic Space Battle',
      subredditName: context.subredditName!,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large" weight="bold">
            Level Preview Block
          </text>
          <text>Epic Space Battle by TestCreator</text>
          <button onPress={() => {}}>Play Now</button>
        </vstack>
      ),
    });

    ui.showToast({ text: `Created level block post: ${post.id}` });
  },
});

Devvit.addMenuItem({
  label: 'Create Landing Block Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    const post = await reddit.submitPost({
      title: 'Galaxy Explorer - Play, Build, Share',
      subredditName: context.subredditName!,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="navy">
          <text size="xxlarge" weight="bold" color="white">
            Galaxy Explorer
          </text>
          <text size="medium" color="lightblue">
            Build epic space levels and share them with the community
          </text>
          <spacer size="medium" />
          <hstack gap="medium">
            <button appearance="primary" onPress={() => {}}>
              Open App
            </button>
            <button appearance="secondary" onPress={() => {}}>
              How to Play
            </button>
          </hstack>
        </vstack>
      ),
    });

    ui.showToast({ text: `Created landing block post: ${post.id}` });
  },
});

Devvit.addMenuItem({
  label: 'Create Challenge Block Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    // Get current week ID
    const now = new Date();
    const year = now.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(year, 0, 1));
    const day = firstThursday.getUTCDay();
    const offset = day <= 4 ? 4 - day : 11 - day;
    firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
    const week = Math.floor((now.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
    const weekId = `${year}-W${String(week).padStart(2, '0')}`;

    const post = await reddit.submitPost({
      title: `Galaxy Explorer Weekly Challenge — ${weekId}`,
      subredditName: context.subredditName!,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="purple">
          <text size="xxlarge" weight="bold" color="white">
            Weekly Challenge
          </text>
          <text size="large" color="lightblue">
            {weekId}
          </text>
          <text size="medium" color="white">
            Play the seeded mission and try to top the leaderboard!
          </text>
          <spacer size="medium" />
          <hstack gap="medium">
            <button appearance="primary" onPress={() => {}}>
              Join Challenge
            </button>
            <button appearance="secondary" onPress={() => {}}>
              View Leaderboard
            </button>
          </hstack>
        </vstack>
      ),
    });

    ui.showToast({ text: `Created challenge block post: ${post.id}` });
  },
});

Devvit.addMenuItem({
  label: 'Create Community Showcase Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    const post = await reddit.submitPost({
      title: 'Galaxy Explorer Community Showcase',
      subredditName: context.subredditName!,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkgreen">
          <text size="xxlarge" weight="bold" color="white">
            Community Showcase
          </text>
          <text size="medium" color="lightgreen">
            Discover amazing community content
          </text>
          <spacer size="medium" />
          <vstack gap="small" alignment="center">
            <hstack gap="large">
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  125
                </text>
                <text size="small" color="lightgreen">
                  Total Levels
                </text>
              </vstack>
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  450
                </text>
                <text size="small" color="lightgreen">
                  Active Players
                </text>
              </vstack>
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  75
                </text>
                <text size="small" color="lightgreen">
                  Creators
                </text>
              </vstack>
            </hstack>
          </vstack>
          <spacer size="medium" />
          <hstack gap="medium">
            <button appearance="primary" onPress={() => {}}>
              Browse Levels
            </button>
            <button appearance="secondary" onPress={() => {}}>
              View Stats
            </button>
          </hstack>
        </vstack>
      ),
    });

    ui.showToast({ text: `Created community showcase post: ${post.id}` });
  },
});

// Helper function to handle block actions with proper context
const handleBlockAction = async (
  ui: any,
  postId: string,
  actionId: string,
  blockType: string,
  actionData: Record<string, unknown>
) => {
  try {
    ui.showToast({ text: 'Loading...' });

    // Build webview URL with context parameters
    const params = new URLSearchParams({
      postId,
      blockType,
      action: actionId,
      timestamp: Date.now().toString(),
      ...Object.fromEntries(Object.entries(actionData).map(([key, value]) => [key, String(value)])),
    });

    const webviewUrl = `https://reddit.com/r/galaxytester0982_dev?${params.toString()}`;

    // Navigate to webview with context
    ui.navigateTo(webviewUrl);
  } catch (error) {
    console.error('Block action error:', error);
    ui.showToast({ text: 'Action failed. Please try again.' });
  }
};

// Main app component that renders based on post type
Devvit.addCustomPostType({
  name: 'Galaxy Explorer',
  height: 'regular',
  render: (context) => {
    const [blockType, setBlockType] = useState<'level' | 'challenge' | 'landing' | 'community'>(
      'level'
    );
    const [loading, setLoading] = useState(false);

    // Simple demo navigation between block types
    const renderBlockTypeSelector = () => (
      <vstack gap="small" alignment="center">
        <text size="small" color="white">
          Demo: Switch Block Types
        </text>
        <hstack gap="small">
          <button size="small" onPress={() => setBlockType('level')}>
            Level
          </button>
          <button size="small" onPress={() => setBlockType('challenge')}>
            Challenge
          </button>
          <button size="small" onPress={() => setBlockType('landing')}>
            Landing
          </button>
          <button size="small" onPress={() => setBlockType('community')}>
            Community
          </button>
        </hstack>
      </vstack>
    );

    if (blockType === 'challenge') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="purple">
          {renderBlockTypeSelector()}
          <spacer size="medium" />
          <text size="xxlarge" weight="bold" color="white">
            Weekly Challenge
          </text>
          <text size="large" color="lightblue">
            2024-W42
          </text>
          <text size="medium" color="white">
            Play the seeded mission and compete!
          </text>
          <spacer size="small" />
          <text size="small" color="white">
            15 participants • 2d 14h remaining
          </text>
          <spacer size="medium" />
          <hstack gap="medium">
            <button
              appearance="primary"
              onPress={async () => {
                await handleBlockAction(
                  context.ui,
                  context.postId || 'demo-post',
                  'join_challenge',
                  'weekly-challenge',
                  {
                    weekId: '2024-W42',
                    challengeId: 'challenge-2024-W42',
                    seedLevelId: 'seed-2024-W42',
                    challengeMode: 'true',
                  }
                );
              }}
            >
              Join Challenge
            </button>
            <button appearance="secondary" onPress={() => {}}>
              View Leaderboard
            </button>
          </hstack>
        </vstack>
      );
    }

    if (blockType === 'community') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkgreen">
          {renderBlockTypeSelector()}
          <spacer size="medium" />
          <text size="xxlarge" weight="bold" color="white">
            Community Showcase
          </text>
          <text size="medium" color="lightgreen">
            Discover amazing community content
          </text>
          <spacer size="medium" />
          <vstack gap="small" alignment="center">
            <hstack gap="large">
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  125
                </text>
                <text size="small" color="lightgreen">
                  Total Levels
                </text>
              </vstack>
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  450
                </text>
                <text size="small" color="lightgreen">
                  Active Players
                </text>
              </vstack>
              <vstack alignment="center">
                <text size="large" weight="bold" color="white">
                  75
                </text>
                <text size="small" color="lightgreen">
                  Creators
                </text>
              </vstack>
            </hstack>
            <spacer size="small" />
            <text size="small" color="white">
              🏆 Featured: SpaceBuilder • GalaxyMaster • ZenBuilder
            </text>
            <text size="small" color="lightgreen">
              📈 Popular: Epic Space Battle • Asteroid Maze
            </text>
          </vstack>
          <spacer size="medium" />
          <hstack gap="medium">
            <button
              appearance="primary"
              onPress={async () => {
                await handleBlockAction(
                  context.ui,
                  context.postId || 'demo-post',
                  'browse_levels',
                  'community-showcase',
                  {
                    filter: 'popular',
                    sortBy: 'plays',
                  }
                );
              }}
            >
              Browse Levels
            </button>
            <button
              appearance="secondary"
              onPress={() => {
                context.ui.showToast({ text: 'Loading community stats...' });
              }}
            >
              View Stats
            </button>
          </hstack>
        </vstack>
      );
    }

    if (blockType === 'landing') {
      return (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="navy">
          {renderBlockTypeSelector()}
          <spacer size="medium" />
          <text size="xxlarge" weight="bold" color="white">
            Galaxy Explorer
          </text>
          <text size="medium" color="lightblue">
            Build epic space levels and share them with the community
          </text>
          <spacer size="medium" />
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
          <spacer size="medium" />
          <hstack gap="medium">
            <button
              appearance="primary"
              onPress={async () => {
                await handleBlockAction(
                  context.ui,
                  context.postId || 'demo-post',
                  'get_started',
                  'landing',
                  {
                    mode: 'tutorial',
                    step: 1,
                  }
                );
              }}
            >
              Get Started
            </button>
            <button
              appearance="secondary"
              onPress={() => {
                context.ui.showToast({ text: 'Loading tutorial...' });
              }}
            >
              How to Play
            </button>
          </hstack>
        </vstack>
      );
    }

    // Default level preview block
    return (
      <vstack height="100%" width="100%" alignment="middle center" backgroundColor="darkblue">
        {renderBlockTypeSelector()}
        <spacer size="medium" />
        <text size="xxlarge" weight="bold" color="white">
          Epic Space Battle
        </text>
        <text size="medium" color="lightblue">
          by TestCreator
        </text>
        <spacer size="small" />
        <hstack gap="small" alignment="center">
          <text size="small" color="yellow">
            ⭐⭐⭐⭐⭐
          </text>
          <text size="small" color="white">
            Difficulty: 3/5
          </text>
        </hstack>
        <text size="small" color="white">
          25 plays
        </text>
        <spacer size="medium" />
        <text size="small" color="lightgray" alignment="center">
          Navigate through asteroid fields and defeat enemy ships in this challenging space mission.
        </text>
        <spacer size="medium" />
        <hstack gap="medium">
          <button
            appearance="primary"
            onPress={async () => {
              await handleBlockAction(
                context.ui,
                context.postId || 'demo-post',
                'play_now',
                'level-preview',
                {
                  levelId: 'epic-space-battle',
                  mode: 'play',
                  difficulty: 3,
                  creator: 'TestCreator',
                }
              );
            }}
          >
            Play Now
          </button>
          <button appearance="secondary" onPress={() => {}}>
            View Details
          </button>
        </hstack>
      </vstack>
    );
  },
});

export default Devvit;
