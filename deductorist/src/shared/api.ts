export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
};

export type GameStartRequest = {
  puzzleId: string;
};

export type GameStartResponse = {
  status: 'started';
  timestamp: number;
};

export type MoveLogEntry = {
  cellIndex: number;
  timeOffsetMs: number;
};

export type GameSubmitRequest = {
  puzzleId: string;
  boardState: number[]; // the grid masks from GameState
  moveLog: MoveLogEntry[];
  isDevBuild?: boolean;
};

export type GameSubmitResponse = {
  status: 'verified' | 'ghosted' | 'error';
  elapsedTimeMs?: number;
  message?: string;
};

export type LeaderboardEntry = {
  member: string;
  score: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  distribution?: Record<string, number>;
  totalSolvers?: number;
  type: 'leaderboard';
};
