import { Devvit } from '@devvit/public-api';
import { SpaceBackground, StyledButton } from './shared';

export interface MenuScreenProps {
  onPlayPress: () => void;
  onBuildPress: () => void;
  loading?: boolean;
  errorState?: {
    hasError: boolean;
    errorMessage?: string;
    errorCode?: string;
  };
  onClearError?: () => void;
}

export const MenuScreen: Devvit.BlockComponent<MenuScreenProps> = ({
  onPlayPress,
  onBuildPress,
  loading = false,
  errorState,
  onClearError,
}) => {
  return (
    <SpaceBackground theme="navy">
      <vstack alignment="center" gap="medium">
        {/* Galaxy Explorer Logo and Title Section */}
        <text size="xxlarge" weight="bold" color="white">
          🌌 Galaxy Explorer
        </text>
        <text size="medium" color="lightblue">
          Build epic space levels and share them with the community
        </text>

        <spacer size="large" />

        {/* Feature Highlights Section */}
        <vstack alignment="center" gap="small">
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

        {/* Primary Navigation Buttons */}
        <vstack gap="medium" alignment="center">
          <StyledButton
            label="Play"
            icon="🎮"
            appearance="primary"
            size="large"
            onPress={onPlayPress}
            disabled={loading}
            loading={loading}
          />

          <StyledButton
            label="Build"
            icon="🔧"
            appearance="secondary"
            size="large"
            onPress={onBuildPress}
            disabled={loading}
            loading={loading}
          />
        </vstack>

        <spacer size="medium" />

        {/* Error Display */}
        {errorState?.hasError && errorState.errorMessage && (
          <vstack
            alignment="center"
            gap="small"
            backgroundColor="#2a1810"
            cornerRadius="medium"
            padding="medium"
          >
            <text size="small" color="#ff6b6b" weight="bold">
              ⚠️ {errorState.errorMessage}
            </text>
            {onClearError && (
              <button appearance="plain" onPress={onClearError}>
                <text size="small" color="lightblue">
                  Dismiss
                </text>
              </button>
            )}
          </vstack>
        )}

        {/* Footer Information */}
        <text size="small" color="lightgray" alignment="center">
          Choose your adventure in the galaxy
        </text>
      </vstack>
    </SpaceBackground>
  );
};
