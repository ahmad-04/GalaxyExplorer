import { Devvit, useWebView, useState } from '@devvit/public-api';
// Helper to build a webview asset URL with context query parameters
const buildWebviewUrl = (params) => {
    const search = new URLSearchParams(params);
    return `index.html?${search.toString()}`; // useWebView will resolve this asset URL
};
export const MainMenuPost = ({ context }) => {
    const [selectedMode, setSelectedMode] = useState('menu');
    const [loading, setLoading] = useState(false);
    const postId = context.postId || 'main-menu';
    const timestamp = Date.now().toString();
    // Precreate webviews for common actions so we can mount fullscreen webview reliably
    const playCampaignWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'play-mode',
            action: 'start_game',
            mode: 'play',
            gameType: 'campaign',
            timestamp,
        }),
        onMessage: async () => { },
    });
    const playCommunityWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'play-mode',
            action: 'browse_levels',
            mode: 'play',
            gameType: 'community',
            timestamp,
        }),
        onMessage: async () => { },
    });
    const playChallengeWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'play-mode',
            action: 'weekly_challenge',
            mode: 'play',
            gameType: 'challenge',
            timestamp,
        }),
        onMessage: async () => { },
    });
    const buildCreateWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'build-mode',
            action: 'create',
            mode: 'build',
            timestamp,
        }),
        onMessage: async () => { },
    });
    const buildEditWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'build-mode',
            action: 'edit',
            mode: 'build',
            timestamp,
        }),
        onMessage: async () => { },
    });
    const buildTutorialWV = useWebView({
        url: buildWebviewUrl({
            postId,
            blockType: 'build-mode',
            action: 'tutorial',
            mode: 'build',
            timestamp,
        }),
        onMessage: async () => { },
    });
    // Main menu screen
    if (selectedMode === 'menu') {
        return (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center", backgroundColor: "navy" },
            Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "white" }, "Galaxy Explorer"),
            Devvit.createElement("text", { size: "medium", color: "lightblue" }, "Build epic space levels and share them with the community"),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { gap: "small", alignment: "center" },
                Devvit.createElement("text", { size: "small", color: "white" }, "\u2728 Create custom space missions"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83D\uDE80 Share with the community"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83C\uDFAE Play levels by other creators"),
                Devvit.createElement("text", { size: "small", color: "white" }, "\uD83C\uDFC6 Compete in weekly challenges")),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
                Devvit.createElement("button", { appearance: "primary", size: "large", onPress: () => setSelectedMode('play'), disabled: loading }, "\uD83C\uDFAE Play"),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: () => setSelectedMode('build'), disabled: loading }, "\uD83D\uDD27 Build")),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("text", { size: "small", color: "lightgray", alignment: "center" }, "Choose your adventure in the galaxy")));
    }
    // Play mode selection screen
    if (selectedMode === 'play') {
        return (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center", backgroundColor: "darkblue" },
            Devvit.createElement("button", { appearance: "plain", onPress: () => setSelectedMode('menu') }, '← Back to Menu'),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "white" }, "Play Mode"),
            Devvit.createElement("text", { size: "medium", color: "lightblue" }, "Choose how you want to play"),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
                Devvit.createElement("button", { appearance: "primary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Launching…' });
                            playCampaignWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '🚀 Start Campaign'),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Opening Community…' });
                            playCommunityWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '🌟 Community Levels'),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Joining Challenge…' });
                            playChallengeWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '🏆 Weekly Challenge'))));
    }
    // Build mode selection screen
    if (selectedMode === 'build') {
        return (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center", backgroundColor: "darkgreen" },
            Devvit.createElement("button", { appearance: "plain", onPress: () => setSelectedMode('menu') }, '← Back to Menu'),
            Devvit.createElement("spacer", { size: "medium" }),
            Devvit.createElement("text", { size: "xxlarge", weight: "bold", color: "white" }, "Build Mode"),
            Devvit.createElement("text", { size: "medium", color: "lightgreen" }, "Create and share your own levels"),
            Devvit.createElement("spacer", { size: "large" }),
            Devvit.createElement("vstack", { gap: "medium", alignment: "center" },
                Devvit.createElement("button", { appearance: "primary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Opening Builder…' });
                            buildCreateWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '✨ Create New Level'),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Loading Your Levels…' });
                            buildEditWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '📝 Edit My Levels'),
                Devvit.createElement("button", { appearance: "secondary", size: "large", onPress: async () => {
                        setLoading(true);
                        try {
                            context.ui.showToast({ text: 'Opening Tutorial…' });
                            buildTutorialWV.mount();
                        }
                        finally {
                            setLoading(false);
                        }
                    }, disabled: loading }, loading ? 'Loading...' : '🎓 Building Tutorial'))));
    }
    // Fallback (shouldn't reach here)
    return (Devvit.createElement("vstack", { height: "100%", width: "100%", alignment: "middle center", backgroundColor: "red" },
        Devvit.createElement("text", { size: "large", weight: "bold", color: "white" }, "Error: Unknown state"),
        Devvit.createElement("button", { onPress: () => setSelectedMode('menu') }, "Return to Menu")));
};
