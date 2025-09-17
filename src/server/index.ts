import express from 'express';
import crypto from 'node:crypto';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  PublishLevelRequest,
  PublishLevelResponse,
  GetLevelResponse,
} from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost, createLevelPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      console.log(`[API] /api/init for postId=${postId}`);
      const count = await redis.get('count');

      // If this app is opened from a Reddit post, we may have a published level stored
      let publishedLevel: InitResponse['publishedLevel'] | undefined = undefined;
      if (postId) {
        const levelExists = await redis.exists(`level:${postId}`);
        console.log(`[API] /api/init: level exists for postId=${postId}? ${!!levelExists}`);
        if (levelExists) {
          // Try to fetch a compact title we stored alongside the level
          const title = (await redis.get(`level:title:${postId}`)) || 'Published Level';
          publishedLevel = { postId, title };
          console.log('[API] /api/init: returning publishedLevel pointer', publishedLevel);
        }
      }

      const base = {
        type: 'init' as const,
        postId: postId,
        count: count ? parseInt(count) : 0,
        ...(publishedLevel ? { publishedLevel } : {}),
      };
      console.log('[API] /api/init response:', base);
      res.json(base);
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

// Publish a level: create a Reddit post and store level JSON in Redis
router.post<
  Record<string, never>,
  PublishLevelResponse | { status: string; message: string; code?: string },
  PublishLevelRequest
>('/api/publish-level', async (req, res): Promise<void> => {
  try {
    const { subredditName, userId } = context;
    if (!subredditName) {
      res
        .status(400)
        .json({ status: 'error', message: 'Missing subreddit context', code: 'no_subreddit' });
      return;
    }
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated', code: 'no_user' });
      return;
    }

    const { levelId, name, description, authorDisplay, levelData, clientPublishToken } =
      req.body || {};
    if (!levelId || !name || !levelData) {
      res
        .status(400)
        .json({ status: 'error', message: 'Missing required fields', code: 'bad_request' });
      return;
    }

    // Idempotency: if a token is provided, check if we already published for it
    if (clientPublishToken) {
      const existingPostId = await redis.get(`publish:token:${clientPublishToken}`);
      if (existingPostId) {
        // Return existing record if possible
        const permalink = await redis.get(`level:permalink:${existingPostId}`);
        const title = (await redis.get(`level:title:${existingPostId}`)) || `${name}`;
        res.status(200).json({
          postId: existingPostId,
          permalink: permalink || '',
          title,
          createdAt: new Date().toISOString(),
        });
        return;
      }
    }

    // Size guard: prevent huge payloads
    const rawSize = Buffer.byteLength(JSON.stringify(levelData), 'utf8');
    const MAX_BYTES = 200 * 1024; // 200 KB
    if (rawSize > MAX_BYTES) {
      res.status(413).json({
        status: 'error',
        message: 'Level too large to publish',
        code: 'payload_too_large',
      });
      return;
    }

    // Derive username for title
    let username = 'Anonymous';
    try {
      const user = await reddit.getCurrentUser();
      if (user?.username) username = user.username;
    } catch {
      /* ignore */
    }
    const author = (authorDisplay || username).replace(/^u\//, '');
    const title = `${author} (u/${author})’s ${name}`; // uses right single quote

    // Create a temporary key for level; postId not known yet, so store after creation
    // Create the Reddit post first (postData must be tiny)
    const post = await createLevelPost({
      title,
      splash: {
        heading: name,
        description: description || `Play ${name} by u/${author}`,
        buttonLabel: 'Start Game',
      },
      postData: { type: 'published-level' },
    });

    // Persist level JSON keyed by postId; also store helpers
    const postId = post.id;
    const permalink = `https://www.reddit.com${post.permalink}`;
    await redis.set(`level:${postId}`, JSON.stringify(levelData));
    await redis.set(`level:title:${postId}`, title);
    await redis.set(`level:permalink:${postId}`, permalink);
    // Optional TTL
    const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
    await redis.expire(`level:${postId}`, TTL_SECONDS);
    await redis.expire(`level:title:${postId}`, TTL_SECONDS);
    await redis.expire(`level:permalink:${postId}`, TTL_SECONDS);
    if (clientPublishToken) {
      await redis.set(`publish:token:${clientPublishToken}`, postId);
      await redis.expire(`publish:token:${clientPublishToken}`, TTL_SECONDS);
    }

    const response: PublishLevelResponse = {
      postId,
      permalink,
      title,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error: unknown) {
    console.error('[API] Error in /api/publish-level:', error);
    // Best-effort error mapping
    let code = 'unknown_error';
    let message = 'Failed to publish level';
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      message = (error as { message: string }).message;
    }
    if (/rate|quota/i.test(message)) code = 'rate_limited';
    if (/auth|permission/i.test(message)) code = 'auth_error';
    res.status(code === 'rate_limited' ? 429 : 500).json({ status: 'error', message, code });
  }
});

// Fetch stored level JSON for a given post
router.get<Record<string, never>, GetLevelResponse | { status: string; message: string }, unknown>(
  '/api/level',
  async (req, res): Promise<void> => {
    try {
      const query = req.query as { postId?: string };
      const effectivePostId = query.postId || context.postId;
      console.log('[API] /api/level request:', {
        queryPostId: query.postId,
        contextPostId: context.postId,
        effectivePostId,
      });
      if (!effectivePostId) {
        res.status(400).json({ status: 'error', message: 'postId is required' });
        return;
      }
      const levelStr = await redis.get(`level:${effectivePostId}`);
      if (!levelStr) {
        console.warn(`[API] /api/level: no level found for postId=${effectivePostId}`);
      }
      if (!levelStr) {
        res.status(404).json({ status: 'error', message: 'Level not found' });
        return;
      }
      const size = Buffer.byteLength(levelStr, 'utf8');
      const hash = crypto.createHash('sha1').update(levelStr).digest('hex');
      const etag = `W/"${size}-${hash}"`;
      res.setHeader('ETag', etag);
      console.log('[API] /api/level: generated ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        console.log('[API] /api/level: returning 304 Not Modified');
        res.status(304).end();
        return;
      }
      console.log('[API] /api/level: returning level json for postId', effectivePostId);
      res.json({ postId: effectivePostId, level: JSON.parse(levelStr), etag });
    } catch (error) {
      console.error('[API] Error in /api/level:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load level' });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost('Welcome to the Starfield App!');

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost('Create a new Starfield');

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});
import { LeaderboardResponse, Score } from '../shared/types/api';

// ... existing code ...

import { Request, Response } from 'express';

router.post('/api/submit-score', async (req: Request, res: Response): Promise<void> => {
  try {
    const { score } = req.body;
    console.log('Received score submission with score:', score);
    const { postId } = context;

    if (!postId) {
      console.error('Missing postId in context');
      res.status(400).json({ error: 'Missing postId' });
      return;
    }

    if (typeof score !== 'number') {
      console.error('Invalid score:', { score });
      res.status(400).json({ error: 'Invalid score' });
      return;
    }

    // Get username - check for Reddit username first, fallback to userId
    let username = 'Anonymous';
    try {
      // Debug: log all available context properties
      console.log('Available context properties:', Object.keys(context));
      console.log('Context userId:', context.userId);
      console.log('Full context:', JSON.stringify(context, null, 2));

      // Try to get actual Reddit username if available
      const extendedContext = context as { username?: string; user?: { username?: string } };
      if (extendedContext.username) {
        username = extendedContext.username;
        console.log('Using Reddit username:', username);
      } else if (extendedContext.user?.username) {
        username = extendedContext.user.username;
        console.log('Using Reddit user.username:', username);
      } else if (context.userId) {
        // Fallback: Clean up the userId format for better display
        // Convert "user_t2_8e82mu8g" to "Player_8e82mu8g" for better readability
        const cleanId = context.userId.replace(/^(user_)?t2_/, '');
        username = `Player_${cleanId}`;
        console.log('Using cleaned userId format (dev mode):', username);
      } else {
        // Generate a consistent guest ID for the session
        username = `Guest_${Date.now().toString().slice(-6)}`;
        console.log('No userId, using guest format:', username);
      }
    } catch (err) {
      console.log('Error processing userId, using fallback:', err);
      username = `Guest_${Date.now().toString().slice(-6)}`;
    }

    console.log(`Processing score ${score} for user ${username} on post ${postId}.`);

    // Use optimized Redis operations for better performance
    try {
      // Store individual user score with TTL for performance
      await redis.set(`score:${postId}:${username}`, score.toString());

      // Use a post-specific leaderboard key
      const leaderboardKey = `leaderboard_json:${postId}`;

      // Maintain JSON leaderboard for fast retrieval (recommended pattern)
      const leaderboardStr = await redis.get(leaderboardKey);
      let leaderboard: Score[] = [];
      if (leaderboardStr) {
        try {
          leaderboard = JSON.parse(leaderboardStr);
        } catch (e) {
          console.error('Failed to parse leaderboard, starting fresh.', e);
          leaderboard = [];
        }
      }

      // Generate a unique identifier for this specific score entry
      // This allows multiple scores from the same user to be displayed
      const timestamp = Date.now();
      const uniqueUsername = `${username}_${timestamp}`;

      // Always add the new score as a fresh entry
      leaderboard.push({ username, score });
      console.log(`Added new score for ${username}: ${score}`);

      // Also store this score with the timestamp for reference
      await redis.set(`score:${postId}:${uniqueUsername}`, score.toString());

      // Sort by score descending and keep top 50 for performance
      leaderboard.sort((a, b) => b.score - a.score);
      const trimmedLeaderboard = leaderboard.slice(0, 50);

      // Save optimized leaderboard back to Redis
      await redis.set(leaderboardKey, JSON.stringify(trimmedLeaderboard));

      // Also update the global leaderboard for backward compatibility
      await redis.set('leaderboard_json', JSON.stringify(trimmedLeaderboard));

      console.log('Leaderboard updated successfully with', trimmedLeaderboard.length, 'entries');
    } catch (redisError) {
      console.error('Error updating leaderboard in Redis:', redisError);
      throw redisError; // Re-throw to trigger error response
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error in /api/submit-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get<Record<string, never>, LeaderboardResponse>(
  '/api/leaderboard',
  async (req, res): Promise<void> => {
    try {
      const { postId } = context; // Get the current post ID from context

      if (!postId) {
        console.error('Missing postId in context');
        res.status(400).json({ scores: [], error: 'Missing postId' });
        return;
      }

      console.log(`Fetching leaderboard for post ${postId}...`);

      // Use the post-specific leaderboard key
      const leaderboardKey = `leaderboard_json:${postId}`;
      let leaderboardStr = await redis.get(leaderboardKey);

      // If no post-specific leaderboard exists, try the global one as fallback
      if (!leaderboardStr) {
        console.log(
          `No post-specific leaderboard found for ${postId}, checking global leaderboard...`
        );
        leaderboardStr = await redis.get('leaderboard_json');

        if (!leaderboardStr) {
          console.log('No leaderboard found at all.');
          res.json({ scores: [] });
          return;
        }
      }

      const leaderboard: Score[] = JSON.parse(leaderboardStr);

      // Parse query parameters for limit (default to 10)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // Get the top scores based on limit - we're already sorting by score in the submit endpoints
      const topScores = leaderboard.slice(0, limit);

      console.log(`Returning top ${limit} score(s) for post ${postId}:`, topScores);
      res.json({ scores: topScores });
    } catch (error) {
      console.error('Error in /api/leaderboard:', error);
      res.status(500).json({ scores: [] });
    }
  }
);

// Development-only endpoint for adding test scores to the leaderboard
router.post('/api/submit-test-score', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, score } = req.body;
    console.log('[DEV] Received test score submission:', { username, score });

    if (!username || typeof username !== 'string' || typeof score !== 'number') {
      console.error('[DEV] Invalid test score submission:', { username, score });
      res.status(400).json({ error: 'Invalid username or score' });
      return;
    }

    const { postId } = context;
    if (!postId) {
      console.error('[DEV] Missing postId in context');
      res.status(400).json({ error: 'Missing postId' });
      return;
    }

    console.log(`[DEV] Processing test score ${score} for user ${username} on post ${postId}`);

    // Use optimized Redis operations for better performance
    try {
      // Store individual user score
      await redis.set(`score:${postId}:${username}`, score.toString());

      // Use a post-specific leaderboard key
      const leaderboardKey = `leaderboard_json:${postId}`;

      // Maintain JSON leaderboard for fast retrieval
      const leaderboardStr = await redis.get(leaderboardKey);
      let leaderboard: Score[] = [];
      if (leaderboardStr) {
        try {
          leaderboard = JSON.parse(leaderboardStr);
        } catch (e) {
          console.error('[DEV] Failed to parse leaderboard, starting fresh.', e);
          leaderboard = [];
        }
      }

      // Generate a unique identifier for this specific test score
      const timestamp = Date.now();
      const uniqueUsername = `${username}_${timestamp}`;

      // Always add the new score as a fresh entry for test data
      leaderboard.push({ username, score });
      console.log(`[DEV] Added new score for ${username}: ${score}`);

      // Also store this score with timestamp for reference
      await redis.set(`score:${postId}:${uniqueUsername}`, score.toString()); // Sort by score descending and keep top 50 for performance
      leaderboard.sort((a, b) => b.score - a.score);
      const trimmedLeaderboard = leaderboard.slice(0, 50);

      // Save optimized leaderboard back to Redis
      await redis.set(leaderboardKey, JSON.stringify(trimmedLeaderboard));

      // Also update the global leaderboard for backward compatibility
      await redis.set('leaderboard_json', JSON.stringify(trimmedLeaderboard));

      console.log(
        '[DEV] Leaderboard updated successfully with',
        trimmedLeaderboard.length,
        'entries'
      );
    } catch (redisError) {
      console.error('[DEV] Error updating leaderboard in Redis:', redisError);
      throw redisError;
    }

    res.status(200).send();
  } catch (error) {
    console.error('[DEV] Error in /api/submit-test-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/share-background', async (req: Request, res: Response): Promise<void> => {
  console.log('[API] Received /api/share-background request');
  try {
    const { density, speed, color } = req.body;
    console.log('[API] Request body:', req.body);

    if (typeof density !== 'number' || typeof speed !== 'number' || typeof color !== 'string') {
      console.error('[API] Invalid background configuration received.');
      res.status(400).json({ message: 'Invalid background configuration.' });
      return;
    }

    // The user's custom configuration is now the properties of the new post.
    const properties = {
      density,
      speed,
      color,
    };
    console.log('[API] Constructed properties for new post:', properties);

    // Get the current user's name to personalize the post title.
    const user = await reddit.getCurrentUser();
    const title = user
      ? `${user.username} created a custom starfield!`
      : 'A new custom starfield was created!';
    console.log(`[API] Generated post title: "${title}"`);

    console.log('[API] Calling createPost...');
    const post = await createPost(title, properties);
    console.log('[API] Successfully created post:', post.id);

    // Respond with the URL of the new post so the client can navigate to it.
    const newPostUrl = `https://www.reddit.com${post.permalink}`;
    console.log(`[API] Responding with new post URL: ${newPostUrl}`);
    res.json({
      status: 'success',
      message: `Post created with id ${post.id}`,
      url: newPostUrl,
    });
  } catch (error) {
    console.error('[API] Error in /api/share-background:', error);
    res.status(500).json({ message: 'Failed to create post.' });
  }
});

router.post('/api/save-user-config', async (req: Request, res: Response): Promise<void> => {
  console.log('[API] Received /api/save-user-config request');
  try {
    const { userId } = context;
    if (!userId) {
      console.warn('[API] Attempted to save config without a userId.');
      // Silently fail for non-logged-in users, or send a specific status
      res.status(204).send(); // 204 No Content
      return;
    }

    const config = req.body;
    console.log(`[API] Saving config for userId: ${userId}`, config);

    // Validate config object
    if (!config || typeof config.density !== 'number') {
      res.status(400).json({ message: 'Invalid configuration provided.' });
      return;
    }

    await redis.set(`user-config:${userId}`, JSON.stringify(config));
    console.log(`[API] Successfully saved config for userId: ${userId}`);
    res.status(200).json({ message: 'Configuration saved.' });
  } catch (error) {
    console.error('[API] Error in /api/save-user-config:', error);
    res.status(500).json({ message: 'Failed to save configuration.' });
  }
});

router.get('/api/load-user-config', async (_req: Request, res: Response): Promise<void> => {
  console.log('[API] Received /api/load-user-config request');
  try {
    const { userId } = context;
    if (!userId) {
      console.log('[API] No userId found, cannot load config.');
      res.status(404).json({ message: 'User not logged in.' });
      return;
    }

    console.log(`[API] Loading config for userId: ${userId}`);
    const configStr = await redis.get(`user-config:${userId}`);

    if (configStr) {
      console.log(`[API] Found config for userId: ${userId}`);
      res.status(200).json(JSON.parse(configStr));
    } else {
      console.log(`[API] No config found for userId: ${userId}`);
      res.status(404).json({ message: 'No configuration found.' });
    }
  } catch (error) {
    console.error('[API] Error in /api/load-user-config:', error);
    res.status(500).json({ message: 'Failed to load configuration.' });
  }
});

// ... existing code ...

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
