import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost } from './core/post';

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
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
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

    console.log(`Processing score ${score} for user ${username}.`);

    // Use optimized Redis operations for better performance
    try {
      // Store individual user score with TTL for performance
      await redis.set(`score:${username}`, score.toString());

      // Maintain JSON leaderboard for fast retrieval (recommended pattern)
      const leaderboardStr = await redis.get('leaderboard_json');
      let leaderboard: Score[] = [];
      if (leaderboardStr) {
        try {
          leaderboard = JSON.parse(leaderboardStr);
        } catch (e) {
          console.error('Failed to parse leaderboard, starting fresh.', e);
          leaderboard = [];
        }
      }

      // Update or add the user's score
      const existingIndex = leaderboard.findIndex((entry) => entry.username === username);
      if (existingIndex >= 0 && leaderboard[existingIndex]) {
        // Update existing score if it's higher
        if (leaderboard[existingIndex]!.score < score) {
          leaderboard[existingIndex]!.score = score;
          console.log(`Updated high score for ${username}: ${score}`);
        } else {
          console.log(
            `Score ${score} not higher than existing ${leaderboard[existingIndex]!.score} for ${username}`
          );
        }
      } else {
        // Add new score
        leaderboard.push({ username, score });
        console.log(`Added new score for ${username}: ${score}`);
      }

      // Sort by score descending and keep top 50 for performance
      leaderboard.sort((a, b) => b.score - a.score);
      const trimmedLeaderboard = leaderboard.slice(0, 50);

      // Save optimized leaderboard back to Redis
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
  async (_req, res): Promise<void> => {
    try {
      console.log('Fetching leaderboard...');
      const leaderboardStr = await redis.get('leaderboard_json');

      if (!leaderboardStr) {
        console.log('No leaderboard found.');
        res.json({ scores: [] });
        return;
      }

      const leaderboard: Score[] = JSON.parse(leaderboardStr);
      const topScores = leaderboard.slice(0, 3);

      console.log('Top leaderboard scores:', topScores);
      res.json({ scores: topScores });
    } catch (error) {
      console.error('Error in /api/leaderboard:', error);
      res.status(500).json({ scores: [] });
    }
  }
);

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
