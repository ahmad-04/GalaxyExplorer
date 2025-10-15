import { context, reddit } from '@devvit/web/server';
import { JsonValue } from '@devvit/shared-types/json.js';
import { BlockService } from '../blocks/services/BlockService.js';
import { BlockConfig, BlockAction } from '../../shared/types/blocks.js';

// Shared background image for Devvit splash (allowed domain: i.redd.it)
const SPLASH_BACKGROUND_URI = 'https://i.redd.it/71i7wq0xripf1.gif';

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
      backgroundUri: SPLASH_BACKGROUND_URI,
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
 * Create a Reddit post for a published level with devvit block support.
 * Can use either splash screen (legacy) or devvit blocks (new).
 */
export const createLevelPost = async (args: {
  title: string;
  splash: { heading: string; description?: string; buttonLabel?: string };
  postData: PostProperties;
  useBlocks?: boolean;
  levelData?: {
    levelId: string;
    creator: string;
    difficulty?: number;
    description?: string;
  };
}) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required to create a level post');

  // Create the post with splash screen for backward compatibility
  const post = await reddit.submitCustomPost({
    subredditName,
    title: args.title,
    splash: {
      appDisplayName: 'Galaxy Explorer',
      backgroundUri: SPLASH_BACKGROUND_URI,
      heading: args.splash.heading,
      description: args.splash.description ?? 'Play a custom mission created by the community.',
      buttonLabel: args.splash.buttonLabel ?? 'Start Game',
    },
    postData: args.postData,
  });

  // If blocks are enabled and level data is provided, store block configuration
  if (args.useBlocks && args.levelData) {
    const blockData = BlockService.createLevelBlockData({
      levelId: args.levelData.levelId,
      title: args.splash.heading,
      creator: args.levelData.creator,
      difficulty: args.levelData.difficulty ?? 1,
      ...(args.levelData.description && { description: args.levelData.description }),
      ...(!args.levelData.description &&
        args.splash.description && { description: args.splash.description }),
    });

    const blockActions: BlockAction[] = [
      {
        id: 'play-now',
        label: args.splash.buttonLabel || 'Play Now',
        type: 'primary',
        handler: 'launchWebview',
        data: { levelId: args.levelData.levelId },
      },
      {
        id: 'view-details',
        label: 'View Details',
        type: 'secondary',
        handler: 'showDetails',
        data: { levelId: args.levelData.levelId },
      },
    ];

    const blockConfig: BlockConfig = {
      type: 'level-preview',
      postId: post.id,
      data: blockData,
      actions: blockActions,
    };

    await BlockService.storeBlockConfig(post.id, blockConfig);
    console.log('[createLevelPost] Block configuration stored for post:', post.id);
  }

  console.log('[createLevelPost] Level post created:', post.id);
  return post;
};

/**
 * Create a Landing post with branded splash and optional devvit block support.
 */
export const createLandingPost = async (useBlocks?: boolean) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required to create a landing post');

  const post = await reddit.submitCustomPost({
    subredditName,
    title: 'Galaxy Explorer — Play, Build, Share',
    splash: {
      appDisplayName: 'Galaxy Explorer',
      backgroundUri: SPLASH_BACKGROUND_URI,
      heading: 'Build epic space levels',
      description: 'Create levels in your browser and share them with the community.',
      buttonLabel: 'Open App',
    },
    postData: {
      type: 'landing',
      version: 1,
    },
  });

  // If blocks are enabled, store block configuration
  if (useBlocks) {
    const blockData = BlockService.createLandingBlockData();

    const blockActions: BlockAction[] = [
      {
        id: 'open-app',
        label: 'Open App',
        type: 'primary',
        handler: 'launchWebview',
      },
      {
        id: 'view-tutorial',
        label: 'How to Play',
        type: 'secondary',
        handler: 'showTutorial',
      },
    ];

    const blockConfig: BlockConfig = {
      type: 'landing',
      postId: post.id,
      data: blockData,
      actions: blockActions,
    };

    await BlockService.storeBlockConfig(post.id, blockConfig);
    console.log('[createLandingPost] Block configuration stored for post:', post.id);
  }

  console.log('[createLandingPost] Landing post created:', post.id);
  return post;
};

/**
 * Create a Weekly Challenge post for the current ISO week with optional devvit block support.
 * Includes a deterministic weekId in postData so the client can derive the seed.
 */
export const createWeeklyChallengePost = async (useBlocks?: boolean) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required to create weekly post');

  const now = new Date();
  const year = now.getUTCFullYear();
  // ISO week number calculation
  const firstThursday = new Date(Date.UTC(year, 0, 1));
  const day = firstThursday.getUTCDay();
  const offset = day <= 4 ? 4 - day : 11 - day;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + offset);
  const week = Math.floor((now.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
  const weekId = `${year}-W${String(week).padStart(2, '0')}`;

  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Galaxy Explorer Weekly Challenge — ${weekId}`,
    splash: {
      appDisplayName: 'Galaxy Explorer',
      backgroundUri: SPLASH_BACKGROUND_URI,
      heading: `Weekly Challenge ${weekId}`,
      description: 'Play the seeded mission and try to top the leaderboard!',
      buttonLabel: 'Play Now',
    },
    postData: {
      type: 'weekly-challenge',
      version: 1,
      weekId,
    },
  });

  // If blocks are enabled, store block configuration
  if (useBlocks) {
    const blockData = BlockService.createChallengeBlockData(weekId);

    const blockActions: BlockAction[] = [
      {
        id: 'join-challenge',
        label: 'Join Challenge',
        type: 'primary',
        handler: 'launchWebview',
        data: { weekId, challengeMode: true },
      },
      {
        id: 'view-leaderboard',
        label: 'View Leaderboard',
        type: 'secondary',
        handler: 'showLeaderboard',
        data: { weekId },
      },
    ];

    const blockConfig: BlockConfig = {
      type: 'weekly-challenge',
      postId: post.id,
      data: blockData,
      actions: blockActions,
    };

    await BlockService.storeBlockConfig(post.id, blockConfig);
    console.log('[createWeeklyChallengePost] Block configuration stored for post:', post.id);
  }

  console.log('[createWeeklyChallengePost] Weekly post created:', post.id, weekId);
  return post;
};

/**
 * Create a Community Showcase post with devvit block support.
 */
export const createCommunityShowcasePost = async (useBlocks?: boolean) => {
  const { subredditName } = context;
  if (!subredditName)
    throw new Error('subredditName is required to create community showcase post');

  const post = await reddit.submitCustomPost({
    subredditName,
    title: 'Galaxy Explorer — Community Showcase',
    splash: {
      appDisplayName: 'Galaxy Explorer',
      backgroundUri: SPLASH_BACKGROUND_URI,
      heading: 'Community Showcase',
      description: 'Discover amazing levels created by our community and meet top creators.',
      buttonLabel: 'Explore Community',
    },
    postData: {
      type: 'community-showcase',
      version: 1,
    },
  });

  // If blocks are enabled, store block configuration
  if (useBlocks) {
    const blockData = BlockService.createCommunityBlockData();

    const blockActions: BlockAction[] = [
      {
        id: 'explore-community',
        label: 'Explore Community',
        type: 'primary',
        handler: 'launchWebview',
        data: { section: 'community' },
      },
      {
        id: 'view-creators',
        label: 'Top Creators',
        type: 'secondary',
        handler: 'showCreators',
      },
    ];

    const blockConfig: BlockConfig = {
      type: 'community-showcase',
      postId: post.id,
      data: blockData,
      actions: blockActions,
    };

    await BlockService.storeBlockConfig(post.id, blockConfig);
    console.log('[createCommunityShowcasePost] Block configuration stored for post:', post.id);
  }

  console.log('[createCommunityShowcasePost] Community showcase post created:', post.id);
  return post;
};
