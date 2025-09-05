
import { makeAPICall } from './api';

export const submitScore = async (score: number): Promise<void> => {
  await makeAPICall('/api/submit-score', {
    method: 'POST',
    body: JSON.stringify({ score }),
  });
};

export const getLeaderboard = async (): Promise<{ scores: { username: string; score: number }[] }> => {
  return makeAPICall('/api/leaderboard', {
    method: 'GET',
  });
};
