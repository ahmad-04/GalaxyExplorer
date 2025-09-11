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
interface SplashOverrides {
  appDisplayName?: string;
  backgroundUri?: string;
  buttonLabel?: string;
  description?: string;
  entryUri?: string;
  heading?: string;
  appIconUri?: string;
}

/**
 * Create a post with a rich splash screen. Pass a `splash` object inside `properties` to override defaults.
 * Example override: { splash: { backgroundUri: 'my-bg.png', heading: 'Custom Heading' } }
 */
export const createPost = async (
  title: string,
  properties?: PostProperties,
  splashOverrides?: SplashOverrides
) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required to create a post');
  }

  const splashDefaults: Omit<SplashOverrides, 'appIconUri'> & { appIconUri?: string } = {
    appDisplayName: 'Galaxy Explorer',
    // Per Dev Platform docs: with media.dir = "assets" you reference files by filename with optional leading slash
    backgroundUri: '/bg.png',
    buttonLabel: 'Launch App',
    description: 'Pilot your ship, dodge enemies and top the leaderboard.',
    entryUri: 'index.html',
    heading: 'Welcome, Pilot!',
  };

  const splash: SplashOverrides = { ...splashDefaults, ...(splashOverrides || {}) };
  const postData = properties || {};

  const submissionPayload = { subredditName, title, splash, postData } as const;
  console.log('[createPost] Submitting custom post with splash:', JSON.stringify(splash));
  console.log('[createPost] Submission payload keys:', Object.keys(submissionPayload));
  return await reddit.submitCustomPost(submissionPayload);
};

// -------- Themed Splash Support --------

export type ThemeKey = 'starfield' | 'nebula' | 'dark' | 'void';

const themeCatalog: Record<ThemeKey, SplashOverrides> = {
  starfield: {
    backgroundUri: '/bg.png',
    heading: 'Welcome, Pilot!',
    description: 'Pilot your ship, dodge enemies and top the leaderboard.',
    buttonLabel: 'Enter Cockpit',
    appIconUri: '/ShipClassic.png',
  },
  nebula: {
    backgroundUri: '/nebula.png', // TODO: Add this asset to assets/ to activate
    heading: 'Into the Nebula',
    description: 'Cosmic clouds hide both danger and opportunity.',
    buttonLabel: 'Drift Inside',
    appIconUri: '/ShipClassic.png',
  },
  dark: {
    backgroundUri: '/dark-starfield.png', // TODO: Add file; use a vignette/gradient for text contrast
    heading: 'Silent Sector',
    description: 'Low visibility. High stakes. Trust your instincts.',
    buttonLabel: 'Engage Sensors',
    appIconUri: '/ShipClassic.png',
  },
  void: {
    backgroundUri: '/void.png', // TODO: Add file (subtle dim stars + radial glow center)
    heading: 'Edge of the Void',
    description: 'Few return from the frontier. Will you?',
    buttonLabel: 'Begin Descent',
    appIconUri: '/ShipClassic.png',
  },
};

/**
 * Create a themed post. Falls back to 'starfield' if theme asset missing.
 */
export const createThemedPost = async (
  theme: ThemeKey,
  title?: string,
  extra?: PostProperties,
  splash?: SplashOverrides
) => {
  const selected = themeCatalog[theme] || themeCatalog.starfield;
  const mergedSplash: SplashOverrides = { ...selected, ...(splash || {}) };

  const baseTitle = title || selected.heading || 'Galaxy Explorer';
  const rest = { ...(extra || {}), theme };
  return await createPost(baseTitle, rest, mergedSplash);
};
