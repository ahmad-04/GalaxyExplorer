import { Devvit } from '@devvit/public-api';
import { ScreenHeader, SpaceBackground, StyledButton } from './shared';
import { WebviewLauncher } from '../utils';
export const PlayModeScreen = ({ onBack, onLaunchWebview, loading = false, errorState, onClearError, }) => {
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
    return (Devvit.createElement(SpaceBackground, { theme: "darkblue" },
        Devvit.createElement(ScreenHeader, { title: "Play Mode", subtitle: "Choose how you want to play", onBack: onBack, backLabel: "\u2190 Back to Menu", titleColor: "white", subtitleColor: "lightblue", backButtonColor: "lightblue" }),
        Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
            Devvit.createElement(StyledButton, { label: "Start Campaign", icon: "\uD83D\uDE80", appearance: "primary", size: "large", onPress: handleCampaignPress, disabled: loading, loading: loading }),
            Devvit.createElement(StyledButton, { label: "Community Levels", icon: "\uD83C\uDF1F", appearance: "secondary", size: "large", onPress: handleCommunityLevelsPress, disabled: loading, loading: loading }),
            Devvit.createElement(StyledButton, { label: "Weekly Challenge", icon: "\uD83C\uDFC6", appearance: "secondary", size: "large", onPress: handleWeeklyChallengePress, disabled: loading, loading: loading }),
            errorState?.hasError && errorState.errorMessage && (Devvit.createElement("vstack", { alignment: "center", gap: "small", backgroundColor: "#2a1810", cornerRadius: "medium", padding: "medium" },
                Devvit.createElement("text", { size: "small", color: "#ff6b6b", weight: "bold" },
                    "\u26A0\uFE0F ",
                    errorState.errorMessage),
                onClearError && (Devvit.createElement("button", { appearance: "plain", onPress: onClearError },
                    Devvit.createElement("text", { size: "small", color: "lightblue" }, "Dismiss"))))))));
};
