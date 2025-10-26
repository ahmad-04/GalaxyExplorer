import { Devvit, useAsync } from '@devvit/public-api';
import { LoadingState } from './LoadingState.js';
/**
 * Example Galaxy Explorer post component showing how to use LoadingState
 * Similar to Pixelary's pattern
 */
export const ExampleGamePost = () => {
    // Simulate async data loading (replace with your actual data fetching)
    const { data, loading, error } = useAsync(async () => {
        // Fetch level data, leaderboard, etc.
        const response = await fetch('/api/level');
        return await response.json();
    });
    // Show loading state while data is being fetched
    if (loading || data === null) {
        return Devvit.createElement(LoadingState, null);
    }
    // Handle error state
    if (error) {
        return (Devvit.createElement("vstack", { width: "100%", height: "100%", alignment: "center middle", gap: "medium" },
            Devvit.createElement("text", { size: "xlarge", weight: "bold", color: "#ff6b6b" }, "Error Loading Game"),
            Devvit.createElement("text", { size: "medium", color: "#9bb3c8" }, error.message || 'Something went wrong')));
    }
    // Render actual game content
    return (Devvit.createElement("blocks", { height: "tall" },
        Devvit.createElement("zstack", { width: "100%", height: "100%", alignment: "top start" },
            Devvit.createElement("image", { imageHeight: 1024, imageWidth: 1500, height: "100%", width: "100%", url: "galaxy-background.svg", description: "Galaxy background", resizeMode: "cover" }),
            Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "center middle", gap: "medium" },
                Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "#e5f0ff" }, "Galaxy Explorer"),
                Devvit.createElement("hstack", { gap: "medium" },
                    Devvit.createElement("button", { appearance: "primary", size: "large" }, "Start Game"),
                    Devvit.createElement("button", { appearance: "secondary", size: "large" }, "View Leaderboard")),
                Devvit.createElement("text", { size: "medium", color: "#9bb3c8" },
                    "Level: ",
                    data.levelName)))));
};
