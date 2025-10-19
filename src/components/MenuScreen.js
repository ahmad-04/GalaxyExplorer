import { Devvit } from '@devvit/public-api';
import { SpaceBackground, StyledButton } from './shared';
export const MenuScreen = ({ onPlayPress, onBuildPress, loading = false, errorState, onClearError, }) => {
    return (Devvit.createElement(SpaceBackground, { theme: "navy" },
        Devvit.createElement("vstack", { alignment: "center", gap: "medium" },
            Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "white" }, "\uD83C\uDF0C Galaxy Explorer"),
            Devvit.createElement("text", { size: "medium", color: "lightblue" }, "Build epic space levels and share them with the community"),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { alignment: "center", gap: "small" },
                Devvit.createElement("text", { size: "small", color: "white" }, "\u2728 Create custom space missions"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83D\uDE80 Share with the community"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83C\uDFAE Play levels by other creators"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83C\uDFC6 Compete in weekly challenges")),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
                Devvit.createElement(StyledButton, { label: "Play", icon: "\uD83C\uDFAE", appearance: "primary", size: "large", onPress: onPlayPress, disabled: loading, loading: loading }),
                Devvit.createElement(StyledButton, { label: "Build", icon: "\uD83D\uDD27", appearance: "secondary", size: "large", onPress: onBuildPress, disabled: loading, loading: loading })),
            Devvit.createElement("spacer", { size: "medium" }),
            errorState?.hasError && errorState.errorMessage && (Devvit.createElement("vstack", { alignment: "center", gap: "small", backgroundColor: "#2a1810", cornerRadius: "medium", padding: "medium" },
                Devvit.createElement("text", { size: "small", color: "#ff6b6b", weight: "bold" },
                    "\u26A0\uFE0F ",
                    errorState.errorMessage),
                onClearError && (Devvit.createElement("button", { appearance: "plain", onPress: onClearError },
                    Devvit.createElement("text", { size: "small", color: "lightblue" }, "Dismiss"))))),
            Devvit.createElement("text", { size: "small", color: "lightgray", alignment: "center" }, "Choose your adventure in the galaxy"))));
};
