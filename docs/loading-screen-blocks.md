# Galaxy Explorer - Devvit Blocks Loading Screen

This document explains how to use the new galaxy-themed loading screen for Devvit blocks, inspired by the Pixelary example.

## Overview

The loading screen provides a polished, on-brand loading experience for your Devvit blocks posts while data is being fetched or processed.

## Components

### LoadingState

Full-screen loading component with:

- Galaxy-themed background (matching your game aesthetic)
- Animated spinner
- "Galaxy Explorer" branding
- "Preparing your adventure..." message

### CompactLoadingState

Smaller loading component for use in confined UI areas.

## Assets

Two SVG assets are included in `/assets/`:

1. **galaxy-background.svg** - Animated space background with stars and nebula effects
2. **spinner.svg** - Animated loading spinner with galaxy gradient colors

## Usage Example

```tsx
import { Devvit, useAsync } from '@devvit/public-api';
import { LoadingState } from './components/LoadingState.js';

export const MyGamePost = () => {
  // Fetch your data
  const { data, loading, error } = useAsync(async () => {
    // Your API call here
    return await yourDataFetchFunction();
  });

  // Show loading state while fetching
  if (loading || data === null) {
    return <LoadingState />;
  }

  // Handle errors
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Render your actual content
  return <blocks height="tall">{/* Your game UI */}</blocks>;
};
```

## Pattern Explanation (from Pixelary)

This follows the same pattern as Pixelary's loading system:

1. **Immediate Feedback**: The loading state shows instantly, preventing blank screens
2. **Brand Consistency**: Uses your game's colors and theme
3. **Async-Aware**: Integrates with Devvit's `useAsync` hook
4. **Graceful**: Smooth transitions between loading and loaded states

## Customization

### Colors

The loading screen uses your galaxy theme colors:

- `#e5f0ff` - Primary text (bright)
- `#9bb3c8` - Secondary text (muted)
- `#60f0af` - Accent green
- `#5ed4ff` - Accent cyan
- `#0b1020` - Deep space background

### Messages

You can customize the loading messages by modifying `LoadingState.tsx`:

```tsx
<text size="large" weight="bold" color="#e5f0ff">
  Your Custom Title
</text>
<text size="medium" color="#9bb3c8">
  Your custom message...
</text>
```

### Animation

The spinner is animated via SVG animations. You can adjust timing in `assets/spinner.svg`:

- Main spinner: `dur="1.2s"` (rotation speed)
- Center pulse: `dur="1.5s"` (pulsing speed)
- Inner dots: `dur="2s"` (counter-rotation speed)

## Integration Points

### Where to Use LoadingState

1. **Post Router**: When initializing a post
2. **Level Loading**: When fetching level data
3. **Leaderboard**: When loading scores
4. **Profile Data**: When loading user information
5. **Any Async Operation**: Any time you use `useAsync`

### Skeleton States (Advanced)

For more sophisticated loading UX, consider implementing skeleton screens:

```tsx
// Show content structure while loading
export const GamePostSkeleton = () => (
  <blocks height="tall">
    <zstack width="100%" height="100%">
      {/* Skeleton UI mimicking your actual layout */}
      <vstack gap="medium" padding="medium">
        <hstack gap="medium">
          <spacer width="80px" height="60px" backgroundColor="#1a2b4a" />
          <vstack gap="small">
            <spacer width="200px" height="20px" backgroundColor="#1a2b4a" />
            <spacer width="120px" height="16px" backgroundColor="#0e1830" />
          </vstack>
        </hstack>
      </vstack>
    </zstack>
  </blocks>
);
```

## File Locations

- Component: `src/components/LoadingState.tsx`
- Background: `assets/galaxy-background.svg`
- Spinner: `assets/spinner.svg`
- Example: `src/components/ExampleGamePost.tsx`

## Testing

To test the loading state:

1. Add artificial delay in your data fetching:

```tsx
const { data, loading } = useAsync(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
  return yourData;
});
```

2. Check that LoadingState appears during the delay
3. Verify smooth transition to actual content

## Next Steps

1. Replace any existing loading indicators with `<LoadingState />`
2. Ensure all Devvit blocks posts use this component
3. Consider adding skeleton states for complex UIs
4. Test loading experience on various connection speeds

## Credits

Pattern inspired by [Pixelary](https://github.com/reddit/devvit/tree/main/packages/apps/pixelary) - Reddit's official Devvit example app.
