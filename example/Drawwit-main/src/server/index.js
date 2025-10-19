// src/server/index.js
import express from 'express';
import { createServer, getServerPort, reddit, redis, context} from '@devvit/web/server';
import { media } from '@devvit/media';

const app = express();
app.use(express.json());

const router = express.Router();

app.post('/api/upload-image', async (req, res) => {
  const { url, type } = req.body;
  if (!url || !type) {
    return res.status(400).send('Missing url or type');
  }
  try {
    const response = await media.upload({
      url: url,
      type: type
    });
    res.status(200).send(response.mediaUrl); // Send the URL as plain text
  } catch (err) {
    res.status(500).send(`something went wrong while uploading image ${err.message}`);
  }
});

const drawwitCreatePost = async (aleph,contestTheme, screen, deadlineDays, deadlineHours, deadlineMinutes, kickoffDate, drawing) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required');

  const post = await reddit.submitCustomPost({
    splash: { appDisplayName: `${aleph}-${contestTheme}` },
    subredditName,
    title: `${aleph}-${contestTheme}`,
  });
  //
  console.log(drawing); 
  // 
  await redis.set(`${post.id}-aleph`, String(aleph));
  await redis.set(`${post.id}-contestTheme`, String(contestTheme));
  await redis.set(`${post.id}-screen`, String(screen));
  await redis.set(`${post.id}-deadlineDays`, String(deadlineDays));
  await redis.set(`${post.id}-deadlineHours`, String(deadlineHours));
  await redis.set(`${post.id}-deadlineMinutes`, String(deadlineMinutes));
  await redis.set(`${post.id}-kickoffYear`, String(kickoffDate.year));
  await redis.set(`${post.id}-kickoffMonth`, String(kickoffDate.month));
  await redis.set(`${post.id}-kickoffDay`, String(kickoffDate.day));
  await redis.set(`${post.id}-kickoffHour`, String(kickoffDate.hour));
  await redis.set(`${post.id}-kickoffMinute`, String(kickoffDate.minute));
  await redis.set(`${post.id}-drawing`, String(drawing));

  await redis.set(`${post.id}-entries`, "0");
  await redis.set(`${post.id}-entry`, "0")
  await redis.set(`${post.id}-alephPost`, String(post.id));

  //
  return {id:post.id, url: post.url}
};


const guessitCreatePost = async (aleph,contestTheme, screen, deadlineDays, deadlineHours, deadlineMinutes, kickoffDate, drawing) => {
  const { subredditName } = context;
  if (!subredditName) throw new Error('subredditName is required');

  const post = await reddit.submitCustomPost({
    splash: { appDisplayName: `${aleph}-${contestTheme}` },
    subredditName,
    title: `${aleph}-${contestTheme}`,
  });
  //
  console.log(drawing);
  //
  await redis.set(`${post.id}-aleph`, String(aleph));
  await redis.set(`${post.id}-contestTheme`, String(contestTheme));
  await redis.set(`${post.id}-screen`, String(screen));
  await redis.set(`${post.id}-deadlineDays`, String(deadlineDays));
  await redis.set(`${post.id}-deadlineHours`, String(deadlineHours));
  await redis.set(`${post.id}-deadlineMinutes`, String(deadlineMinutes));
  await redis.set(`${post.id}-kickoffYear`, String(kickoffDate.year));
  await redis.set(`${post.id}-kickoffMonth`, String(kickoffDate.month));
  await redis.set(`${post.id}-kickoffDay`, String(kickoffDate.day));
  await redis.set(`${post.id}-kickoffHour`, String(kickoffDate.hour));
  await redis.set(`${post.id}-kickoffMinute`, String(kickoffDate.minute));
  await redis.set(`${post.id}-drawing`, String(drawing));

  await redis.set(`${post.id}-guesses`, "0");
  await redis.set(`${post.id}-alephPost`, String(post.id));

  //
  return {id:post.id, url: post.url}
};

router.get('/api/current-username', async (_req, res) => {
  const username = await reddit.getCurrentUsername(); // undefined when logged out
  if (!username) return res.status(200).json({ error: 'No logged-in user' });
  res.json({ username });
});

router.post('/api/log-message', async (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);
  res.status(200).json({ status: 'logged' });
});

router.post('/api/drawwit/set', async (req, res) => {
  try {
    const { motherHash, drawing } = req.body;
    if (
      !motherHash ||
      !motherHash.aleph ||
      !motherHash.contestTheme ||
      !motherHash.screen ||
      motherHash.deadlineDays == null ||
      motherHash.deadlineHours == null ||
      motherHash.deadlineMinutes == null ||
      !motherHash.kickoffDate ||
      !drawing
    ) {
      return res.status(400).json({ error: 'Missing required contest data or drawing' });
    }

    // Crear post y guardar datos
    const post = await drawwitCreatePost(
      motherHash.aleph,
      motherHash.contestTheme,
      motherHash.screen,
      motherHash.deadlineDays,
      motherHash.deadlineHours,
      motherHash.deadlineMinutes,
      motherHash.kickoffDate,
      drawing
    );

    // Confirmar existencia en Redis
    const keysToCheck = [
      `${post.id}-aleph`,
      `${post.id}-contestTheme`,
      `${post.id}-screen`,
      `${post.id}-deadlineDays`,
      `${post.id}-deadlineHours`,
      `${post.id}-deadlineMinutes`,
      `${post.id}-kickoffYear`,
      `${post.id}-kickoffMonth`,
      `${post.id}-kickoffDay`,
      `${post.id}-kickoffHour`,
      `${post.id}-kickoffMinute`,
      `${post.id}-drawing`,
      `${post.id}-entries`,
      `${post.id}-entry`,
      `${post.id}-alephPost`,
    ];

    const existResults = await Promise.all(keysToCheck.map(k => redis.exists(k)));
    const allExist = existResults.every(v => v === 1);

    res.status(200).json({
      ok: true,
      postId: post.id,
      allExist: allExist,
      details: keysToCheck.map((k, i) => ({ key: k, exists: existResults[i] === 1 })),
      postUrl: post.url
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/api/guessit/set', async (req, res) => {
  try {
    const { motherHash, drawing } = req.body;
    if (
      !motherHash ||
      !motherHash.aleph ||
      !motherHash.contestTheme ||
      !motherHash.screen ||
      motherHash.deadlineDays == null ||
      motherHash.deadlineHours == null ||
      motherHash.deadlineMinutes == null ||
      !motherHash.kickoffDate ||
      !drawing
    ) {
      return res.status(400).json({ error: 'Missing required contest data or drawing' });
    }

    const post = await guessitCreatePost(
      motherHash.aleph,
      motherHash.contestTheme,
      motherHash.screen,
      motherHash.deadlineDays,
      motherHash.deadlineHours,
      motherHash.deadlineMinutes,
      motherHash.kickoffDate,
      drawing
    );

    const keysToCheck = [
      `${post.id}-aleph`,
      `${post.id}-contestTheme`,
      `${post.id}-screen`,
      `${post.id}-deadlineDays`,
      `${post.id}-deadlineHours`,
      `${post.id}-deadlineMinutes`,
      `${post.id}-kickoffYear`,
      `${post.id}-kickoffMonth`,
      `${post.id}-kickoffDay`,
      `${post.id}-kickoffHour`,
      `${post.id}-kickoffMinute`,
      `${post.id}-drawing`,
      `${post.id}-guesses`,
      `${post.id}-alephPost`,
    ];

    const existResults = await Promise.all(keysToCheck.map(k => redis.exists(k)));
    const allExist = existResults.every(v => v === 1);

    res.status(200).json({
      ok: true,
      postId: post.id,
      allExist: allExist,
      details: keysToCheck.map((k, i) => ({ key: k, exists: existResults[i] === 1 })),
      postUrl: post.url
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/api/post-id', async (req, res) => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ ok: false, error: 'postId not available in this context' });
      return;
    }
    res.status(200).json({ ok: true, postId: postId });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/api/redis/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await redis.get(key);
    res.status(200).json({ ok: true, key: key, value: value });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});


app.use(router);

const server = createServer(app);
server.listen(getServerPort(), () => {});
