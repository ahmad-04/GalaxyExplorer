import { Devvit, useWebView } from '@devvit/public-api';
const buildWebviewUrl = (params) => {
    const search = new URLSearchParams(params);
    return `index.html?${search.toString()}`;
};
export const MainMenuPost = ({ context }) => {
    const postId = context.postId || 'main-menu';
    const timestamp = Date.now().toString();
    // Create webview hooks for main menu actions
    const { mount: mountStartGame } = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'game',
            action: 'start_game',
            mode: 'play',
            timestamp,
        }),
        onMessage: () => { },
    });
    const { mount: mountLeaderboard } = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'leaderboard',
            action: 'view_leaderboard',
            mode: 'view',
            timestamp,
        }),
        onMessage: () => { },
    });
    const { mount: mountBuildMode } = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'build-mode',
            action: 'create',
            mode: 'build',
            timestamp,
        }),
        onMessage: () => { },
    });
    return (Devvit.createElement("zstack", { height: "100%", width: "100%", alignment: "top start" },
        Devvit.createElement("vstack", { height: "100%", width: "100%", backgroundColor: "#000814" }),
        Devvit.createElement("hstack", { width: "100%", alignment: "top start" },
            Devvit.createElement("spacer", { size: "small" }),
            Devvit.createElement("text", { size: "small", color: "#ffffff88" }, "\u2726"),
            Devvit.createElement("spacer", { grow: true }),
            Devvit.createElement("text", { size: "medium", color: "#ffffff66" }, "\u2727"),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("text", { size: "small", color: "#ffffff44" }, "\u2726"),
            Devvit.createElement("spacer", { size: "medium" })),
        Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center" },
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("hstack", { gap: "medium", alignment: "center" },
                Devvit.createElement("text", { size: "small", color: "#4a90e2" }, "\u2726"),
                Devvit.createElement("text", { size: "medium", color: "#ffffff" }, "\u2727"),
                Devvit.createElement("text", { size: "small", color: "#4a90e2" }, "\u2726")),
            Devvit.createElement("spacer", { size: "small" }),
            Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "#ffffff" }, "GALAXY EXPLORER"),
            Devvit.createElement("spacer", { size: "small" }),
            Devvit.createElement("text", { size: "large", weight: "bold", color: "#4a90e2" }, "CONQUER THE COSMOS"),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("hstack", { gap: "small", alignment: "center" },
                Devvit.createElement("text", { size: "small", color: "#4a90e244" }, "\u2501\u2501\u2501"),
                Devvit.createElement("text", { size: "small", color: "#4a90e2" }, "\u2726"),
                Devvit.createElement("text", { size: "small", color: "#4a90e244" }, "\u2501\u2501\u2501")),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("vstack", { gap: "medium", alignment: "center middle" },
                Devvit.createElement("button", { appearance: "primary", size: "large", onPress: () => {
                        context.ui.showToast({ text: '🚀 Starting Game…' });
                        mountStartGame();
                    } }, "START GAME"),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: () => {
                        context.ui.showToast({ text: '🏆 Loading Leaderboard…' });
                        mountLeaderboard();
                    } }, "LEADERBOARD"),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: () => {
                        context.ui.showToast({ text: '🛠️ Opening Build Mode…' });
                        mountBuildMode();
                    } }, "BUILD MODE")),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("hstack", { gap: "medium", alignment: "center" },
                Devvit.createElement("text", { size: "small", color: "#ffffff44" }, "\u2727"),
                Devvit.createElement("text", { size: "small", color: "#4a90e266" }, "\u2726"),
                Devvit.createElement("text", { size: "small", color: "#ffffff44" }, "\u2727")),
            Devvit.createElement("spacer", { size: "small" }),
            Devvit.createElement("text", { size: "small", color: "#555555" }, "v1.0"),
            Devvit.createElement("spacer", { size: "medium" })),
        Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "bottom end" },
            Devvit.createElement("spacer", { grow: true }),
            Devvit.createElement("hstack", { width: "100%", alignment: "bottom end" },
                Devvit.createElement("spacer", { grow: true }),
                Devvit.createElement("text", { size: "small", color: "#ffffff33" }, "\u2726"),
                Devvit.createElement("spacer", { size: "medium" }),
                Devvit.createElement("text", { size: "medium", color: "#ffffff55" }, "\u2727"),
                Devvit.createElement("spacer", { size: "small" })))));
};
