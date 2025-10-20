import { Devvit } from '@devvit/public-api';

/**
 * Galaxy-themed loading state component for Devvit blocks
 * Inspired by Pixelary's pattern but with Galaxy Explorer branding
 */
export const LoadingState = () => (
  <zstack width="100%" height="100%" alignment="center middle">
    {/* Background gradient matching galaxy theme */}
    <image
      imageHeight={1024}
      imageWidth={1500}
      height="100%"
      width="100%"
      url="galaxy-background.svg"
      description="Galaxy space background"
      resizeMode="cover"
    />
    {/* Loading spinner or animated element */}
    <vstack alignment="center middle" gap="medium">
      <image
        url="spinner.svg"
        description="Loading..."
        imageHeight={128}
        imageWidth={128}
        width="96px"
        height="96px"
        resizeMode="scale-down"
      />
      <text size="large" weight="bold" color="#e5f0ff" alignment="center">
        Galaxy Explorer
      </text>
      <text size="medium" color="#9bb3c8" alignment="center">
        Preparing your adventure...
      </text>
    </vstack>
  </zstack>
);

/**
 * Compact loading state for smaller UI areas
 */
export const CompactLoadingState = () => (
  <vstack width="100%" height="100%" alignment="center middle" gap="small">
    <image
      url="spinner.svg"
      description="Loading..."
      imageHeight={128}
      imageWidth={128}
      width="48px"
      height="48px"
      resizeMode="scale-down"
    />
    <text size="small" color="#9bb3c8">
      Loading...
    </text>
  </vstack>
);
