import { LeaderboardResponse } from '../../shared/types/api';

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
