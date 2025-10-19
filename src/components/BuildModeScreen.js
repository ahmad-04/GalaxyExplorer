import { Devvit } from '@devvit/public-api';
import { ScreenHeader, SpaceBackground, StyledButton } from './shared';
import { WebviewLauncher } from '../utils';
export const BuildModeScreen = ({ onBack, onLaunchWebview, loading = false, errorState, onClearError, }) => {
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
    return (Devvit.createElement(SpaceBackground, { theme: "darkgreen" },
        Devvit.createElement(ScreenHeader, { title: "Build Mode", subtitle: "Create and edit your levels", onBack: onBack, backLabel: "\u2190 Back to Menu", titleColor: "white", subtitleColor: "lightgreen", backButtonColor: "lightgreen" }),
        Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
            Devvit.createElement(StyledButton, { label: "Create New Level", icon: "\uD83D\uDD27", appearance: "primary", size: "large", onPress: handleCreateNewLevelPress, disabled: loading, loading: loading }),
            Devvit.createElement(StyledButton, { label: "Edit My Levels", icon: "\uD83D\uDCDD", appearance: "secondary", size: "large", onPress: handleEditMyLevelsPress, disabled: loading, loading: loading }),
            Devvit.createElement(StyledButton, { label: "Building Tutorial", icon: "\uD83D\uDCDA", appearance: "secondary", size: "large", onPress: handleBuildingTutorialPress, disabled: loading, loading: loading }),
            errorState?.hasError && errorState.errorMessage && (Devvit.createElement("vstack", { alignment: "center", gap: "small", backgroundColor: "#2a1810", cornerRadius: "medium", padding: "medium" },
                Devvit.createElement("text", { size: "small", color: "#ff6b6b", weight: "bold" },
                    "\u26A0\uFE0F ",
                    errorState.errorMessage),
                onClearError && (Devvit.createElement("button", { appearance: "plain", onPress: onClearError },
                    Devvit.createElement("text", { size: "small", color: "lightblue" }, "Dismiss"))))))));
};
