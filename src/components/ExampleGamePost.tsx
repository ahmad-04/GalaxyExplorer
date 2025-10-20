import { Devvit, useAsync } from '@devvit/public-api';
import { LoadingState } from './LoadingState.js';

/**
 * Example Galaxy Explorer post component showing how to use LoadingState
 * Similar to Pixelary's pattern
 */
export const ExampleGamePost = () => {
  // Simulate async data loading (replace with your actual data fetching)
  const { data, loading, error } = useAsync(async () => {
    // Fetch level data, leaderboard, etc.
    const response = await fetch('/api/level');
    return await response.json();
  });

  // Show loading state while data is being fetched
  if (loading || data === null) {
    return <LoadingState />;
  }

  // Handle error state
  if (error) {
    return (
      <vstack width="100%" height="100%" alignment="center middle" gap="medium">
        <text size="xlarge" weight="bold" color="#ff6b6b">
          Error Loading Game
        </text>
        <text size="medium" color="#9bb3c8">
          {error.message || 'Something went wrong'}
        </text>
      </vstack>
    );
  }

  // Render actual game content
  return (
    <blocks height="tall">
      <zstack width="100%" height="100%" alignment="top start">
        <image
          imageHeight={1024}
          imageWidth={1500}
          height="100%"
          width="100%"
          url="galaxy-background.svg"
          description="Galaxy background"
          resizeMode="cover"
        />

        <vstack height="100%" width="100%" alignment="center middle" gap="medium">
          <text size="xxlarge" weight="bold" color="#e5f0ff">
            Galaxy Explorer
          </text>

          {/* Your game UI here */}
          <hstack gap="medium">
            <button appearance="primary" size="large">
              Start Game
            </button>
            <button appearance="secondary" size="large">
              View Leaderboard
            </button>
          </hstack>

          <text size="medium" color="#9bb3c8">
            Level: {data.levelName}
          </text>
        </vstack>
      </zstack>
    </blocks>
  );
};
