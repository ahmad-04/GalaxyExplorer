
import { LeaderboardResponse } from '../../shared/types/api';

export const submitScore = async (score: number): Promise<void> => {
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
    throw new Error(`Failed to submit score: ${errorText}`);
  }
};

export const getLeaderboard = async (): Promise<LeaderboardResponse> => {
  const response = await fetch('/api/leaderboard', {
    credentials: 'include', // Include cookies for authentication
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch leaderboard: ${errorText}`);
  }
  return response.json();
};



