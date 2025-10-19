import { context, reddit } from '@devvit/web/server';

export async function createPost() {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'drawwitetha3',
    },
    subredditName,
    title: 'drawwitetha3',
  });
}
