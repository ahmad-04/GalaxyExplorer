export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type Score = {
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  scores: Score[];
  error?: string; // Optional error message
};
