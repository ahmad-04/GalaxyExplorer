import { context, reddit } from '@devvit/web/server';
import { JsonValue } from '@devvit/shared-types/json.js';

// Define a type that is compatible with what the Devvit API expects for postData
type PostProperties = { [key: string]: JsonValue };

/**
 * Creates a new custom post.
 * If properties are provided, they are embedded into the new post's `postData`.
 * This is used for both creating the initial app post and for sharing custom designs.
 * @param title The title of the new Reddit post.
 * @param properties An optional JSON-compatible object of data to embed in the post.
 * @returns The newly created post object.
 */
export const createPost = async (title: string, properties?: PostProperties) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required to create a post');
  }

  return await reddit.submitCustomPost({
    subredditName: subredditName,
    title: title,
    // Use a more descriptive name for the app in the splash screen
    splash: {
      appDisplayName: 'Galaxy Explorer',
    },
    // Embed the provided data directly into the post's `postData`
    postData: properties || {},
  });
};
