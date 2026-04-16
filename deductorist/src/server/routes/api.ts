import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { buildTopologyLibrary } from '../../shared/engine/PermutationGenerator';
import { TieringService } from '../../shared/engine/TieringService';
import { StructuralSieve } from '../../shared/engine/StructuralSieve';

function seedRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296; 
  };
}
import type {
  InitResponse,
  GameStartRequest,
  GameStartResponse,
  GameSubmitRequest,
  GameSubmitResponse,
  LeaderboardResponse,
  GameStateSyncRequest,
  GameStateSyncResponse
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

api.get('/game/puzzle', async (c) => {
  try {
    const requestedDate = c.req.query('date') || 'today';
    const difficultyStr = c.req.query('difficulty') || '1';
    const difficulty = parseInt(difficultyStr, 10) || 1;

    let targetDateStr = requestedDate;
    const today = new Date().toISOString().split('T')[0];

    if (requestedDate === 'today') {
      targetDateStr = today;
    } else if (requestedDate > today) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Cannot access future puzzles' }, 403);
    }

    const cacheKey = `puzzle_v1:${targetDateStr}:${difficulty}`;
    const cachedPuzzle = await redis.get(cacheKey);

    if (cachedPuzzle) {
       return c.json(JSON.parse(cachedPuzzle.toString()));
    }

    const gridSize = difficulty + 3;
    const seed = `${targetDateStr}-${difficulty}`;
    const rng = seedRNG(seed);
    const sieve = new StructuralSieve();
    
    console.log(`[JIT] Generating puzzle ${cacheKey}...`);
    const topoReport = buildTopologyLibrary(gridSize, gridSize, false);
    const tiering = new TieringService(topoReport.library);
    tiering.shuffle(rng);

    const telemetry = await sieve.generateAsync(
        tiering, 
        gridSize, 
        gridSize, 
        async () => {}, 
        rng
    );

    const solGrid = (telemetry.solution as any).getRawSolution(gridSize, gridSize);
    const hashBuffer = await crypto.subtle.digest('SHA-256', solGrid as BufferSource);
    const integrityHash = Array.from(new Uint8Array(hashBuffer));
    
    const puzzleData = {
      rows: gridSize,
      cols: gridSize,
      difficulty,
      clues: telemetry.clues.map((clue: any) => sieve.toActiveClue(clue, telemetry.solution as any)),
      integrityHash,
      date: targetDateStr
    };

    await redis.set(cacheKey, JSON.stringify(puzzleData));
    
    return c.json(puzzleData);
  } catch (e: any) {
    console.error(`[JIT] Generate error: ${e.message}`);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to generate puzzle' }, 500);
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

    // Clear saved state since we submitted it
    await redis.del(`gameState:${username}:${body.puzzleId}`);

    let absoluteRank = 0;
    if (isVerified) {
      const effectiveUsername = body.isDevBuild ? `${username}_${Date.now()}` : username;
      const today = new Date().toISOString().split('T')[0];
      const gridSize = body.puzzleId.split('-')[0] || '4x4';
      const bucketSec = Math.floor(durationMs / 1000);
      
      const promises: Promise<any>[] = [
        redis.zAdd(`leaderboard:daily:${today}:${gridSize}`, { member: effectiveUsername, score: durationMs }),
        redis.hIncrBy(`leaderboard:daily:${today}:${gridSize}:dist`, bucketSec.toString(), 1)
      ];
      
      if (body.isDevBuild) {
        promises.push(redis.zAdd(`leaderboard:daily:${today}:${gridSize}`, { member: username, score: durationMs }));
      }
      
      await Promise.all(promises);
      const zScore = await redis.zRank(`leaderboard:daily:${today}:${gridSize}`, effectiveUsername);
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

api.post('/game/state/sync', async (c) => {
  try {
    const body: GameStateSyncRequest = await c.req.json();
    const username = await reddit.getCurrentUsername();
    if (!username) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

    await redis.set(
       `gameState:${username}:${body.puzzleId}`,
       JSON.stringify(body)
    );
    return c.json({ status: 'success' });
  } catch(e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to sync game state' }, 500);
  }
});

api.get('/game/state/sync', async (c) => {
  try {
    const puzzleId = c.req.query('puzzleId');
    if (!puzzleId) return c.json<ErrorResponse>({ status: 'error', message: 'Missing puzzleId' }, 400);

    const username = await reddit.getCurrentUsername();
    if (!username) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

    const gridMatch = puzzleId.match(/(\d+x\d+)/);
    const gridSize = gridMatch ? gridMatch[1] : '4x4';
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[GameState Sync] Checking leaderboard completion for ${username} on puzzle ${puzzleId} (grid: ${gridSize})`);
    const zScoreRaw = await redis.zScore(`leaderboard:daily:${today}:${gridSize}`, username);
    console.log(`[GameState Sync] zScore query result for ${username}:`, zScoreRaw);

    if (zScoreRaw !== undefined && zScoreRaw !== null) {
       console.log(`[GameState Sync] User ${username} has already completed this puzzle. Fast-forwarding to Win State.`);
       return c.json<GameStateSyncResponse>({
         status: 'completed',
         puzzleId,
         elapsedSeconds: Math.floor(Number(zScoreRaw) / 1000)
       });
    }

    const raw = await redis.get(`gameState:${username}:${puzzleId}`);
    console.log(`[GameState Sync] No completion found. Retrieving cached GameState: ${raw ? 'Exists (' + raw.length + ' bytes)' : 'Not Found'}`);
    if (!raw) return c.json<GameStateSyncResponse>({ status: 'not_found' });

    const state = JSON.parse(raw.toString());
    return c.json<GameStateSyncResponse>({
      status: 'success',
      ...state
    });
  } catch(e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to fetch game state' }, 500);
  }
});

api.get('/game/state/completed', async (c) => {
  try {
    const requestedDate = c.req.query('date');
    if (!requestedDate) return c.json<ErrorResponse>({ status: 'error', message: 'Missing date parameter' }, 400);

    const username = await reddit.getCurrentUsername();
    if (!username) return c.json({ completed: [] }); // Graceful degradation for unauthenticated

    const gridSizes = ['4x4', '5x5', '6x6', '7x7', '8x8'];
    const completedList: number[] = [];

    // Concurrently check all 5 grid sizes for completion
    const checks = await Promise.all(
      gridSizes.map(size => redis.zScore(`leaderboard:daily:${requestedDate}:${size}`, username))
    );

    checks.forEach((score, index) => {
      if (score !== undefined && score !== null) {
        completedList.push(index + 1); // 1-indexed difficulties
      }
    });

    return c.json({ completed: completedList });
  } catch(e) {
    console.error(e);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to check completions' }, 500);
  }
});

api.get('/game/leaderboard', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    const gridSize = c.req.query('gridSize') || '4x4';
    // For now hardcoded daily size / structure
    const today = new Date().toISOString().split('T')[0];
    
    const [rawLeaderboard, ghostMap, distributionRaw] = await Promise.all([
      redis.zRange(`leaderboard:daily:${today}:${gridSize}`, 0, 49, { by: 'rank' }),
      redis.hGetAll('ghosted_users_v1'),
      redis.hGetAll(`leaderboard:daily:${today}:${gridSize}:dist`)
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
    const username = await reddit.getCurrentUsername();

    const today = new Date().toISOString().split('T')[0];
    for (let level = 1; level <= 5; level++) {
       const size = level + 3;
       const puzzleId = `${today}-${size}x${size}-${level}`;
       
       // Nuke the global leaderboards completely
       await redis.del(`leaderboard:daily:${today}:${size}x${size}`);
       await redis.del(`leaderboard:daily:${today}:${size}x${size}:dist`);
       
       // Wipe the local testing game state
       if (username) {
           await redis.del(`gameState:${username}:${puzzleId}`);
       }
    }
    return c.json({ status: 'success', message: 'Global leaderboards annihilated' });
  } catch (e) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to reset leaderboard' }, 500);
  }
});
