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
  devOverrideTimeMs?: number;
  penaltyMs?: number;
};

import type { GameSnapshot, ExportedGameState } from './engine/GameState';

export type GameStateSyncRequest = {
  puzzleId: string;
  boardState: GameSnapshot;
  fullState?: ExportedGameState;
  timestamp: number;
  binnedClues: string[];
  elapsedSeconds: number;
};

export type GameStateSyncResponse = {
  status: 'success' | 'not_found' | 'completed' | 'non_compete';
  puzzleId?: string;
  boardState?: GameSnapshot;
  fullState?: ExportedGameState;
  timestamp?: number;
  binnedClues?: string[];
  elapsedSeconds?: number;
};

export type GameSubmitResponse = {
  status: 'verified' | 'ghosted';
  elapsedTimeMs?: number;
  message?: string;
  rank?: number;
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

export type DevResetResponse = {
  status: 'success' | 'error';
  message?: string;
};
