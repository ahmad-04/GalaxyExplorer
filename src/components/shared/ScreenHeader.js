import { Devvit } from '@devvit/public-api';
export const ScreenHeader = ({ title, subtitle, onBack, backLabel = '← Back to Menu', titleColor = 'white', subtitleColor = 'lightblue', backButtonColor = 'lightblue', }) => {
    return (Devvit.createElement("vstack", { alignment: "center", gap: "small" },
        Devvit.createElement("button", { appearance: "plain", onPress: onBack },
            Devvit.createElement("text", { size: "small", color: backButtonColor }, backLabel)),
        Devvit.createElement("spacer", { size: "medium" }),
        Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: titleColor }, title),
        subtitle && (Devvit.createElement("text", { size: "medium", color: subtitleColor }, subtitle)),
        Devvit.createElement("spacer", { size: "large" })));
};
