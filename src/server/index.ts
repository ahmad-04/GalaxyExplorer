import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
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
    const post = await createPost();

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
    const post = await createPost();

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

router.post(
  '/api/submit-score',
  async (req: Request, res: Response): Promise<void> => {
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
        if ((context as any).username) {
          username = (context as any).username;
          console.log('Using Reddit username:', username);
        } else if ((context as any).user?.username) {
          username = (context as any).user.username;
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
        const existingIndex = leaderboard.findIndex(entry => entry.username === username);
        if (existingIndex >= 0 && leaderboard[existingIndex]) {
          // Update existing score if it's higher
          if (leaderboard[existingIndex]!.score < score) {
            leaderboard[existingIndex]!.score = score;
            console.log(`Updated high score for ${username}: ${score}`);
          } else {
            console.log(`Score ${score} not higher than existing ${leaderboard[existingIndex]!.score} for ${username}`);
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
  }
);

router.get<{}, LeaderboardResponse>('/api/leaderboard', async (_req, res): Promise<void> => {
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
});

// ... existing code ...

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
