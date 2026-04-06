import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  GameStartRequest,
  GameStartResponse,
  GameSubmitRequest,
  GameSubmitResponse,
  LeaderboardResponse
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

// Minimum time threshold (e.g. 100ms per cell interaction)
const MIN_REALISTIC_TIME_MS = 1500;

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing postId in devvit context' }, 400);
  }

  try {
    const username = await reddit.getCurrentUsername() ?? 'anonymous';

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username,
    });
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Initialization failed' }, 400);
  }
});

api.post('/game/start', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

    const now = Date.now();
    await redis.set(`session:start:${username}`, now.toString()); // Could add puzzleId

    return c.json<GameStartResponse>({
      status: 'started',
      timestamp: now,
    });
  } catch (e) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to start game' }, 500);
  }
});

api.post('/game/submit', async (c) => {
  try {
    const body: GameSubmitRequest = await c.req.json();
    const username = await reddit.getCurrentUsername();
    if (!username) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

    const startTimeStr = await redis.get(`session:start:${username}`);
    if (!startTimeStr) {
      // Missing start session (ghosted to prevent direct API injects)
      await redis.hSet('ghosted_users_v1', { [username]: 'true' });
      return c.json<GameSubmitResponse>({ status: 'ghosted', message: 'Invalid session' });
    }

    const startTime = parseInt(startTimeStr, 10);
    const now = Date.now();
    const durationMs = now - startTime;
    await redis.del(`session:start:${username}`);

    let isVerified = true;

    // Sieve 1: Theoretical Floor
    if (durationMs < MIN_REALISTIC_TIME_MS) {
      isVerified = false;
    }

    // Sieve 2: Cadence Analysis (Variance check on MoveLog)
    if (isVerified && body.moveLog && body.moveLog.length > 5) {
      const gaps = [];
      for (let i = 1; i < body.moveLog.length; i++) {
        gaps.push(body.moveLog[i].timeOffsetMs - body.moveLog[i-1].timeOffsetMs);
      }
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / gaps.length;
      
      // If the variance is incredibly tight, it's a scripted bot
      if (variance < 25) { 
        isVerified = false;
      }
    }

    // (Integrity Hash Match logic omitted or placeholder for Phase 3.5)

    if (isVerified) {
      const today = new Date().toISOString().split('T')[0];
      await redis.zAdd(`leaderboard:daily:${today}`, { member: username, score: durationMs });
    } else {
      // Ghost them
      await redis.hSet('ghosted_users_v1', { [username]: 'true' });
    }

    return c.json<GameSubmitResponse>({
      status: isVerified ? 'verified' : 'ghosted',
      elapsedTimeMs: durationMs
    });
    
  } catch (e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to process submission' }, 500);
  }
});

api.get('/game/leaderboard', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    // For now hardcoded daily size / structure
    const today = new Date().toISOString().split('T')[0];
    
    const [rawLeaderboard, ghostMap] = await Promise.all([
      redis.zRange(`leaderboard:daily:${today}`, 0, 49, { by: 'rank' }),
      redis.hGetAll('ghosted_users_v1')
    ]);

    const filteredLeaderboard = rawLeaderboard.filter(entry => {
      const isGhosted = ghostMap[entry.member] === 'true';
      if (isGhosted) {
        return entry.member === username;
      }
      return true;
    });

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      entries: filteredLeaderboard
    });
  } catch(e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to fetch leaderboard' }, 500);
  }
});
