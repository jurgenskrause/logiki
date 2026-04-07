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
    if (!startTimeStr && !body.isDevBuild) {
      // Missing start session (ghosted to prevent direct API injects)
      await redis.hSet('ghosted_users_v1', { [username]: 'true' });
      return c.json<GameSubmitResponse>({ status: 'ghosted', message: 'Invalid session' });
    }

    let durationMs = 0;
    if (body.isDevBuild && body.devOverrideTimeMs) {
      durationMs = body.devOverrideTimeMs;
    } else {
      const startTime = parseInt(startTimeStr as string, 10);
      const now = Date.now();
      durationMs = now - startTime + (body.penaltyMs || 0);
      await redis.del(`session:start:${username}`);
    }

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

    let absoluteRank = 0;
    if (isVerified) {
      const effectiveUsername = body.isDevBuild ? `${username}_${Date.now()}` : username;
      const today = new Date().toISOString().split('T')[0];
      const bucketSec = Math.floor(durationMs / 1000);
      
      await Promise.all([
        redis.zAdd(`leaderboard:daily:${today}`, { member: effectiveUsername, score: durationMs }),
        redis.hIncrBy(`leaderboard:daily:${today}:dist`, bucketSec.toString(), 1)
      ]);
      const zScore = await redis.zRank(`leaderboard:daily:${today}`, effectiveUsername);
      absoluteRank = zScore !== undefined ? zScore + 1 : 0;
    } else {
      // Ghost them
      await redis.hSet('ghosted_users_v1', { [username]: 'true' });
    }

    return c.json<GameSubmitResponse>({
      status: isVerified ? 'verified' : 'ghosted',
      elapsedTimeMs: durationMs,
      rank: isVerified ? absoluteRank : undefined
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
    
    const [rawLeaderboard, ghostMap, distributionRaw] = await Promise.all([
      redis.zRange(`leaderboard:daily:${today}`, 0, 49, { by: 'rank' }),
      redis.hGetAll('ghosted_users_v1'),
      redis.hGetAll(`leaderboard:daily:${today}:dist`)
    ]);

    const filteredLeaderboard = rawLeaderboard.filter(entry => {
      const baseName = entry.member.split('_')[0];
      const isGhosted = ghostMap[baseName] === 'true';
      if (isGhosted) {
        return baseName === username;
      }
      return true;
    });

    const distribution: Record<string, number> = {};
    let totalSolvers = 0;
    
    for (const [bucket, countStr] of Object.entries(distributionRaw)) {
       const count = parseInt(countStr, 10) || 0;
       distribution[bucket] = count;
       totalSolvers += count;
    }

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      entries: filteredLeaderboard,
      distribution,
      totalSolvers
    });
  } catch(e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to fetch leaderboard' }, 500);
  }
});

api.post('/game/share', async (c) => {
  try {
    const { postId } = context;
    if (!postId) return c.json<ErrorResponse>({ status: 'error', message: 'Missing active context' }, 400);

    const body: { message?: string } = await c.req.json();
    if (!body.message) return c.json<ErrorResponse>({ status: 'error', message: 'Payload message missing' }, 400);

    const post = await reddit.getPostById(postId);
    const permalink = post ? `https://reddit.com${post.permalink}` : '';

    await reddit.submitComment({
      id: postId,
      text: `${body.message}\n\n[Play Deductorist!](${permalink})`
    });

    return c.json({ status: 'success' });
  } catch (e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Network failure communicating via reddit api' }, 500);
  }
});

api.post('/game/dev/reset', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await redis.del(`leaderboard:daily:${today}`);
    await redis.del(`leaderboard:daily:${today}:dist`);
    return c.json({ status: 'success', message: 'Leaderboard cleared' });
  } catch (e) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to reset leaderboard' }, 500);
  }
});
