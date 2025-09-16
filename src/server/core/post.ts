import { context, reddit } from '@devvit/web/server';
import { JsonValue } from '@devvit/shared-types/json.js';

// Define a type that is compatible with what the Devvit API expects for postData
type PostProperties = { [key: string]: JsonValue };

/**
 * Simple post creation following basic Devvit docs pattern
 */
export const createPost = async (title: string, properties?: PostProperties) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required to create a post');
  }

  const postData = properties || {};

  // Simple splash screen as per docs - only required field is appDisplayName
  const post = await reddit.submitCustomPost({
    subredditName,
    title,
    splash: {
      appDisplayName: 'Galaxy Explorer', // only required field
      buttonLabel: 'Enter Space Battle',
      description: 'Pilot your ship, dodge enemies and top the leaderboard.',
      heading: 'Galaxy Explorer',
    },
    postData,
  });

  console.log('[createPost] Simple post created with basic splash screen');
  return post;
};

/**
 * Simple themed post creation - just an alias to createPost for backward compatibility
 */
export const createThemedPost = async (
  theme: string,
  title: string,
  properties?: PostProperties
) => {
  console.log(`[createThemedPost] Creating post with theme: ${theme}`);
  return createPost(title, properties);
};

/**
 * Create a Reddit post for a published level with a splash CTA.
 * Keeps postData tiny and returns the created post object.
 */
export const createLevelPost = async (args: {
  title: string;
  splash: { heading: string; description?: string; buttonLabel?: string };
  postData: PostProperties;
}) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required to create a level post');

  const post = await reddit.submitCustomPost({
    subredditName,
    title: args.title,
    splash: {
      appDisplayName: 'Galaxy Explorer',
      heading: args.splash.heading,
      description: args.splash.description ?? 'Play a custom mission created by the community.',
      buttonLabel: args.splash.buttonLabel ?? 'Start Game',
    },
    postData: args.postData,
  });

  console.log('[createLevelPost] Level post created:', post.id);
  return post;
};
