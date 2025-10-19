import { Devvit } from '@devvit/public-api';
export const StyledButton = ({ label, icon, appearance = 'primary', size = 'medium', onPress, disabled = false, loading = false, error = false, }) => {
    // Handle error state display
    if (error) {
        return (Devvit.createElement("button", { appearance: "secondary", size: size, onPress: onPress, disabled: disabled || loading },
            "\u26A0\uFE0F Retry ",
            label));
    }
    // Handle loading state display
    if (loading) {
        return (Devvit.createElement("button", { appearance: appearance, size: size, onPress: onPress, disabled: true }, "\u2B50 Loading..."));
    }
    // Normal state display
    const displayText = icon ? `${icon} ${label}` : label;
    return (Devvit.createElement("button", { appearance: appearance, size: size, onPress: onPress, disabled: disabled }, displayText));
};
