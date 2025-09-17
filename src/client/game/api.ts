import {
  LeaderboardResponse,
  PublishLevelRequest,
  PublishLevelResponse,
  GetLevelResponse,
  InitResponse,
} from '../../shared/types/api';

export const submitScore = async (score: number): Promise<void> => {
  console.log(`[API] Submitting score: ${score}`);
  const startTime = performance.now();

  const response = await fetch('/api/submit-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify({ score }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = `Failed to submit score: ${errorText}`;
    console.error(`[API] ${error}`);
    throw new Error(error);
  }

  const endTime = performance.now();
  console.log(`[API] Score submission completed in ${(endTime - startTime).toFixed(2)}ms`);
};

export const getLeaderboard = async (limit: number = 10): Promise<LeaderboardResponse> => {
  console.log(`[API] Fetching leaderboard with limit=${limit}`);
  const startTime = performance.now();

  // Add a query parameter to specify how many top scores we want
  const response = await fetch(`/api/leaderboard?limit=${limit}`, {
    credentials: 'include', // Include cookies for authentication
  });
  if (!response.ok) {
    const errorText = await response.text();
    const error = `Failed to fetch leaderboard: ${errorText}`;
    console.error(`[API] ${error}`);
    throw new Error(error);
  }

  const data = await response.json();
  const endTime = performance.now();
  console.log(`[API] Leaderboard fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`[API] Retrieved ${data.scores.length} score entries`);

  return data;
};

export const publishLevelToReddit = async (
  req: PublishLevelRequest
): Promise<PublishLevelResponse> => {
  const response = await fetch('/api/publish-level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to publish level');
  }
  return (await response.json()) as PublishLevelResponse;
};

export const getPublishedLevel = async (postId?: string): Promise<GetLevelResponse> => {
  const url = postId ? `/api/level?postId=${encodeURIComponent(postId)}` : '/api/level';
  const startTime = performance.now();
  console.log(`[API] getPublishedLevel: GET ${url}`);
  const response = await fetch(url, { credentials: 'include' });
  console.log(`[API] getPublishedLevel: status ${response.status}`);
  if (response.status === 304) {
    console.log('[API] getPublishedLevel: 304 Not Modified');
    // Not modified; caller can decide what to do
    throw new Error('Not modified');
  }
  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] getPublishedLevel failed ${response.status}: ${text}`);
    throw new Error(text || 'Failed to fetch level');
  }
  const data = (await response.json()) as GetLevelResponse;
  const duration = (performance.now() - startTime).toFixed(2);
  console.log(
    `[API] getPublishedLevel: ok in ${duration}ms, postId=${data.postId}, hasLevel=${!!data.level}`
  );
  return data;
};

export const getInit = async (): Promise<InitResponse> => {
  const startTime = performance.now();
  console.log('[API] getInit: GET /api/init');
  const response = await fetch('/api/init', { credentials: 'include' });
  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] getInit failed ${response.status}: ${text}`);
    throw new Error(text || 'Failed to initialize');
  }
  const data = (await response.json()) as InitResponse;
  const duration = (performance.now() - startTime).toFixed(2);
  console.log(
    `[API] getInit: ok in ${duration}ms, publishedLevel=${data.publishedLevel ? data.publishedLevel.postId : 'none'}`
  );
  return data;
};
