import { Devvit } from '@devvit/public-api';
import { MainMenuPost } from './components/MainMenuPost.js';
// Configure the app
Devvit.configure({
    redditAPI: true,
    redis: true,
    http: true,
});
// Main app component - Galaxy Explorer Main Menu
Devvit.addCustomPostType({
    name: 'Galaxy Explorer',
    height: 'regular',
    render: (context) => {
        return Devvit.createElement(MainMenuPost, { context: context });
    },
});
export default Devvit;
// Add a serverless menu action to avoid localhost HTTP calls
Devvit.addMenuItem({
    label: 'Create Galaxy Explorer Menu',
    location: 'subreddit',
    forUserType: 'moderator',
    onPress: async (_event, context) => {
        try {
            if (!context.subredditName) {
                await context.ui.showToast({ text: 'Missing subreddit context' });
                return;
            }
            const community = await context.reddit.getCurrentSubreddit();
            const post = await context.reddit.submitPost({
                subredditName: community.name,
                title: 'Galaxy Explorer - Main Menu',
                text: 'Welcome to Galaxy Explorer! (Dev)'
            });
            await context.ui.navigateTo(`https://reddit.com${post.permalink}`);
        }
        catch (err) {
            await context.ui.showToast({ text: 'Failed to create main menu post' });
        }
    },
});
