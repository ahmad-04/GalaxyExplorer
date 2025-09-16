export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  // When opened from a published Reddit post, include a small pointer
  publishedLevel?: {
    postId: string;
    title: string;
  };
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

// New: Publish level request/response types
export type PublishLevelRequest = {
  levelId: string;
  name: string;
  description?: string;
  authorDisplay?: string;
  levelData: unknown; // keep generic to avoid tight coupling
  clientPublishToken?: string; // for idempotency
};

export type PublishLevelResponse = {
  postId: string;
  permalink: string;
  title: string;
  createdAt: string;
};

// New: Level fetch response type
export type GetLevelResponse = {
  postId: string;
  level: unknown;
  etag?: string;
};
