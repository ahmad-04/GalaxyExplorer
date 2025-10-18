import { Devvit } from '@devvit/public-api';
import { ScreenHeader, SpaceBackground, StyledButton } from './shared';
import { WebviewLauncher, type WebviewLaunchParams } from '../utils';

export interface BuildModeScreenProps {
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

export const BuildModeScreen: Devvit.BlockComponent<BuildModeScreenProps> = ({
  onBack,
  onLaunchWebview,
  loading = false,
  errorState,
  onClearError,
}) => {
  const handleCreateNewLevelPress = async () => {
    const params = WebviewLauncher.createBuildModeParams('main-menu', 'create');
    await onLaunchWebview(params);
  };

  const handleEditMyLevelsPress = async () => {
    const params = WebviewLauncher.createBuildModeParams('main-menu', 'edit');
    await onLaunchWebview(params);
  };

  const handleBuildingTutorialPress = async () => {
    const params = WebviewLauncher.createBuildModeParams('main-menu', 'tutorial');
    await onLaunchWebview(params);
  };

  return (
    <SpaceBackground theme="darkgreen">
      <ScreenHeader
        title="Build Mode"
        subtitle="Create and edit your levels"
        onBack={onBack}
        backLabel="← Back to Menu"
        titleColor="white"
        subtitleColor="lightgreen"
        backButtonColor="lightgreen"
      />

      <vstack gap="medium" alignment="center">
        <StyledButton
          label="Create New Level"
          icon="🔧"
          appearance="primary"
          size="large"
          onPress={handleCreateNewLevelPress}
          disabled={loading}
          loading={loading}
        />

        <StyledButton
          label="Edit My Levels"
          icon="📝"
          appearance="secondary"
          size="large"
          onPress={handleEditMyLevelsPress}
          disabled={loading}
          loading={loading}
        />

        <StyledButton
          label="Building Tutorial"
          icon="📚"
          appearance="secondary"
          size="large"
          onPress={handleBuildingTutorialPress}
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
