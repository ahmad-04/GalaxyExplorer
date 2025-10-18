import { Devvit } from '@devvit/public-api';
import { MainMenuPost } from './components';

// Configure the app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

// Add menu action for creating the main Galaxy Explorer menu
Devvit.addMenuItem({
  label: 'Create Galaxy Explorer Menu',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    const post = await reddit.submitPost({
      title: 'Galaxy Explorer - Main Menu',
      subredditName: context.subredditName!,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="navy">
          <text size="xxlarge" weight="bold" color="white">
            🌌 Galaxy Explorer
          </text>
          <text size="medium" color="lightblue">
            Build epic space levels and share them with the community
          </text>
        </vstack>
      ),
    });

    ui.showToast({ text: `Created Galaxy Explorer main menu: ${post.id}` });
  },
});

// Main app component - Galaxy Explorer Main Menu
Devvit.addCustomPostType({
  name: 'Galaxy Explorer',
  height: 'regular',
  render: (context) => {
    return <MainMenuPost context={context} />;
  },
});

export default Devvit;
