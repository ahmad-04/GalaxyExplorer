import { Devvit } from '@devvit/public-api';
import { MainMenuPost } from './components/MainMenuPost.tsx';

// Configure the app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

// Main app component - Galaxy Explorer Main Menu
Devvit.addCustomPostType({
  name: 'Galaxy Explorer',
  height: 'tall',
  render: (context) => {
    return <MainMenuPost context={context} />;
  },
});

// Add a serverless menu action to create Galaxy Explorer posts
Devvit.addMenuItem({
  label: 'Create Galaxy Explorer Menu',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    try {
      const subreddit = await context.reddit.getCurrentSubreddit();

      // Create a custom post - the preview triggers our custom post type
      const post = await context.reddit.submitPost({
        subredditName: subreddit.name,
        title: 'Galaxy Explorer - Main Menu',
        preview: Devvit.createElement(
          'vstack',
          { height: '100%', width: '100%', alignment: 'middle center', backgroundColor: '#0a0e1a' },
          Devvit.createElement(
            'text',
            { size: 'xlarge', weight: 'bold', color: '#e5f0ff' },
            '🚀 Galaxy Explorer'
          ),
          Devvit.createElement('text', { size: 'medium', color: '#9bb3c8' }, 'Loading...')
        ),
      });

      context.ui.showToast({ text: 'Created Galaxy Explorer Menu!' });
      context.ui.navigateTo(post);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      context.ui.showToast({ text: `Error: ${errorMsg}` });
    }
  },
});

export default Devvit;
