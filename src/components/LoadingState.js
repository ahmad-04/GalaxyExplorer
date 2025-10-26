import { Devvit } from '@devvit/public-api';
/**
 * Galaxy-themed loading state component for Devvit blocks
 * Inspired by Pixelary's pattern but with Galaxy Explorer branding
 */
export const LoadingState = () => (Devvit.createElement("zstack", { width: "100%", height: "100%", alignment: "center middle" },
    Devvit.createElement("image", { imageHeight: 1024, imageWidth: 1500, height: "100%", width: "100%", url: "galaxy-background.svg", description: "Galaxy space background", resizeMode: "cover" }),
    Devvit.createElement("vstack", { alignment: "center middle", gap: "medium" },
        Devvit.createElement("image", { url: "spinner.svg", description: "Loading...", imageHeight: 128, imageWidth: 128, width: "96px", height: "96px", resizeMode: "scale-down" }),
        Devvit.createElement("text", { size: "large", weight: "bold", color: "#e5f0ff", alignment: "center" }, "Galaxy Explorer"),
        Devvit.createElement("text", { size: "medium", color: "#9bb3c8", alignment: "center" }, "Preparing your adventure..."))));
/**
 * Compact loading state for smaller UI areas
 */
export const CompactLoadingState = () => (Devvit.createElement("vstack", { width: "100%", height: "100%", alignment: "center middle", gap: "small" },
    Devvit.createElement("image", { url: "spinner.svg", description: "Loading...", imageHeight: 128, imageWidth: 128, width: "48px", height: "48px", resizeMode: "scale-down" }),
    Devvit.createElement("text", { size: "small", color: "#9bb3c8" }, "Loading...")));
