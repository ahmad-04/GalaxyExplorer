import { Devvit } from '@devvit/public-api';
import { ScreenHeader, SpaceBackground, StyledButton } from './shared';
import { WebviewLauncher, type WebviewLaunchParams } from '../utils';

export interface PlayModeScreenProps {
  onBack: () => void;
  onLaunchWebview: (params: WebviewLaunchParams) => Promise<void>;
  loading?: boolean;
  errorState?: {
    hasError: boolean;
    errorMessage?: string;
    errorCode?: string;
  };
  onClearError?: () => void;
}

export { type WebviewLaunchParams } from '../utils';

export const PlayModeScreen: Devvit.BlockComponent<PlayModeScreenProps> = ({
  onBack,
  onLaunchWebview,
  loading = false,
  errorState,
  onClearError,
}) => {
  const handleCampaignPress = async () => {
    const params = WebviewLauncher.createPlayModeParams('main-menu', 'campaign');
    await onLaunchWebview(params);
  };

  const handleCommunityLevelsPress = async () => {
    const params = WebviewLauncher.createPlayModeParams('main-menu', 'community');
    await onLaunchWebview(params);
  };

  const handleWeeklyChallengePress = async () => {
    const params = WebviewLauncher.createPlayModeParams('main-menu', 'challenge');
    await onLaunchWebview(params);
  };

  return (
    <SpaceBackground theme="darkblue">
      <ScreenHeader
        title="Play Mode"
        subtitle="Choose how you want to play"
        onBack={onBack}
        backLabel="← Back to Menu"
        titleColor="white"
        subtitleColor="lightblue"
        backButtonColor="lightblue"
      />

      <vstack gap="medium" alignment="center">
        <StyledButton
          label="Start Campaign"
          icon="🚀"
          appearance="primary"
          size="large"
          onPress={handleCampaignPress}
          disabled={loading}
          loading={loading}
        />

        <StyledButton
          label="Community Levels"
          icon="🌟"
          appearance="secondary"
          size="large"
          onPress={handleCommunityLevelsPress}
          disabled={loading}
          loading={loading}
        />

        <StyledButton
          label="Weekly Challenge"
          icon="🏆"
          appearance="secondary"
          size="large"
          onPress={handleWeeklyChallengePress}
          disabled={loading}
          loading={loading}
        />

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
      </vstack>
    </SpaceBackground>
  );
};
