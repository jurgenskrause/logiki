import { Hono } from 'hono';
import { z } from 'zod';
import { ensurePuzzle } from '../core/puzzle';
import { context, redis, reddit } from '@devvit/web/server';
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
// Legacy tracking variables mapped inline


api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing postId in devvit context' }, 400);
  }

  try {
    const username = await reddit.getCurrentUsername() ?? 'anonymous';
    const gameDate = await redis.get(`post_date:${postId}`) || new Date().toISOString().split('T')[0];
    const puzzleStatus = (await redis.get(`daily_puzzle_status:${gameDate}`)) || 'ready';

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username,
      gameDate,
      puzzleStatus
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

    const puzzleData = await ensurePuzzle(targetDateStr, difficulty);
    return c.json(puzzleData);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[API] Puzzle hit error: ${msg}`);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to retrieve puzzle' }, 500);
  }
});

const GameSubmitSchema = z.object({
  puzzleId: z.string(),
  boardState: z.array(z.number()),
  moveLog: z.array(z.object({
    cellIndex: z.number(),
    timeOffsetMs: z.number()
  })),
  isDevBuild: z.boolean().optional(),
  devOverrideTimeMs: z.number().optional(),
  penaltyMs: z.number().optional()
});

api.post('/game/submit', async (c) => {
  try {
    const bodyRaw = await c.req.json();
    let body: z.infer<typeof GameSubmitSchema>;
    try {
      body = GameSubmitSchema.parse(bodyRaw);
    } catch(err) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Payload schema invalid' }, 400);
    }
    const username = await reddit.getCurrentUsername();
    if (!username) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

    const startTimeStr = await redis.get(`session:start:${username}`);
    if (!startTimeStr && !body.isDevBuild) {
      // Missing start session (ghosted to prevent direct API injects)
      const fallbackDate = new Date().toISOString().split('T')[0];
      await redis.hSet(`ghosted_users:${fallbackDate}`, { [username]: 'true' });
      await redis.expire(`ghosted_users:${fallbackDate}`, 86400 * 7);
      return c.json<GameSubmitResponse>({ status: 'ghosted', message: 'Invalid session' });
    }

    let durationMs = 0;
    if (body.isDevBuild && body.devOverrideTimeMs) {
      durationMs = body.devOverrideTimeMs;
    } else {
      const startTime = parseInt(startTimeStr as string, 10);
      const now = Date.now();
      durationMs = now - startTime + Math.max(0, body.penaltyMs || 0);
      await redis.del(`session:start:${username}`);
    }

    const gridMatch = body.puzzleId.match(/(\d+x\d+)/);
    const gridSize = gridMatch ? gridMatch[1] : '4x4';

    const dateMatch = body.puzzleId.match(/^(\d{4}-\d{2}-\d{2})/);
    const targetDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    const minTimeMap: Record<string, number> = {
       '4x4': 10000,
       '5x5': 15000,
       '6x6': 25000,
       '7x7': 35000,
       '8x8': 45000
    };
    
    // Absolute minimum theoretical clicks factoring in aggressive cascade auto-solves
    const minClicksMap: Record<string, number> = {
       '4x4': 3,
       '5x5': 4,
       '6x6': 5,
       '7x7': 6,
       '8x8': 7
    };

    const targetFloorMs = minTimeMap[gridSize] || 10000;
    const targetClicks = minClicksMap[gridSize] || 12;

    let isVerified = true;

    // Sieve 1: Theoretical Time Floor
    if (durationMs < targetFloorMs) {
      isVerified = false;
    }

    // Sieve 2: Absolute Action Boundary
    // We enforce that the user must have clicked at least the minimum mathematical structural paths.
    if (isVerified && body.moveLog.length < targetClicks) {
      isVerified = false;
    }

    // Sieve 3: Deterministic Structural Replay (Hash Match)
    if (isVerified) {
      const difficultyMatch = body.puzzleId.match(/-(\d+)$/);
      const difficulty = difficultyMatch ? parseInt(difficultyMatch[1], 10) : 1;
      
      try {
        const puzzleData = await ensurePuzzle(targetDate, difficulty);
        const submittedBuffer = new Uint16Array(body.boardState).buffer as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', submittedBuffer);
        const calculatedHash = Array.from(new Uint8Array(hashBuffer));
        
        const isHashMatched = calculatedHash.length === puzzleData.integrityHash.length &&
          calculatedHash.every((val: number, index: number) => val === puzzleData.integrityHash[index]);

        if (!isHashMatched && !body.isDevBuild) {
            isVerified = false;
            console.error(`[API] Integrity hash fault for ${username}.`);
        }
      } catch (err) {
        isVerified = false;
      }
    }

    // Clear saved state since we submitted it
    await redis.del(`gameState:${username}:${body.puzzleId}`);

    let absoluteRank = 0;
    if (isVerified) {
      const effectiveUsername = body.isDevBuild ? `${username}_${Date.now()}` : username;
      const bucketSec = Math.floor(durationMs / 1000);
      
      const promises: Promise<unknown>[] = [
        redis.zAdd(`leaderboard:daily:${targetDate}:${gridSize}:tainted`, { member: effectiveUsername, score: durationMs }),
        redis.hIncrBy(`leaderboard:daily:${targetDate}:${gridSize}:dist:tainted`, bucketSec.toString(), 1)
      ];
      
      if (isVerified) {
        promises.push(
          redis.zAdd(`leaderboard:daily:${targetDate}:${gridSize}:clean`, { member: effectiveUsername, score: durationMs }),
          redis.hIncrBy(`leaderboard:daily:${targetDate}:${gridSize}:dist:clean`, bucketSec.toString(), 1)
        );
        if (body.isDevBuild) {
          promises.push(
            redis.zAdd(`leaderboard:daily:${targetDate}:${gridSize}:clean`, { member: username, score: durationMs }),
            redis.zAdd(`leaderboard:daily:${targetDate}:${gridSize}:tainted`, { member: username, score: durationMs })
          );
        }
      } else {
        // Ghost them to preserve fast hGet checks later (skip if it was a dev script to prevent permabanning the dev)
        if (!body.isDevBuild) {
           await redis.hSet(`ghosted_users:${targetDate}`, { [username]: 'true' });
           await redis.expire(`ghosted_users:${targetDate}`, 86400 * 7);
        }
      }
      
      await Promise.all(promises);
      const targetBoard = isVerified ? 'clean' : 'tainted';
      const zScore = await redis.zRank(`leaderboard:daily:${targetDate}:${gridSize}:${targetBoard}`, effectiveUsername);
      absoluteRank = zScore !== undefined ? zScore + 1 : 0;
    } else {
      // Ghost them immediately during dev drops
      await redis.hSet(`ghosted_users:${targetDate}`, { [username]: 'true' });
      await redis.expire(`ghosted_users:${targetDate}`, 86400 * 7);
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

    console.log(`[GameState Sync POST] Saving ${JSON.stringify(body).length} bytes for ${username} on puzzle ${body.puzzleId}`);

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
    
    // Parse the date from `YYYY-MM-DD-4x4-1` or fallback to today if random
    const dateMatch = puzzleId.match(/^(\d{4}-\d{2}-\d{2})/);
    const targetDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
    
    let isGhostRaw = await redis.hGet(`ghosted_users:${targetDate}`, username);
    if (!isGhostRaw) isGhostRaw = await redis.hGet('ghosted_users_v1', username);
    const targetBoard = (isGhostRaw === 'true') ? 'tainted' : 'clean';

    console.log(`[GameState Sync] Checking leaderboard completion for ${username} on puzzle ${puzzleId} (grid: ${gridSize})`);
    const zScoreRaw = await redis.zScore(`leaderboard:daily:${targetDate}:${gridSize}:${targetBoard}`, username);
    console.log(`[GameState Sync] zScore query result for ${username}:`, zScoreRaw);

    if (zScoreRaw !== undefined && zScoreRaw !== null) {
       console.log(`[GameState Sync] User ${username} has already completed this puzzle. Fast-forwarding to Win State.`);
       
       // Preload Leaderboard data natively to bypass visual loading delays on historic boards
       let leaderboardData = undefined;
       try {
         const [rawLeaderboard, distributionRaw] = await Promise.all([
           redis.zRange(`leaderboard:daily:${targetDate}:${gridSize}:${targetBoard}`, 0, 49, { by: 'rank' }),
           redis.hGetAll(`leaderboard:daily:${targetDate}:${gridSize}:dist:${targetBoard}`)
         ]);

         const distribution: Record<string, number> = {};
         let totalSolvers = 0;
         for (const [bucket, countStr] of Object.entries(distributionRaw)) {
            const count = parseInt(countStr, 10) || 0;
            distribution[bucket] = count;
            totalSolvers += count;
         }

         leaderboardData = {
           type: 'leaderboard',
           entries: rawLeaderboard,
           distribution,
           totalSolvers
         };
       } catch (err) {
         console.error('[GameState Sync] Error preloading leaderboard:', err);
       }

       return c.json<GameStateSyncResponse>({
         status: 'completed',
         puzzleId,
         elapsedSeconds: Math.floor(Number(zScoreRaw) / 1000),
         // @ts-expect-error bundling extension payload
         leaderboardData
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

    const levels = [
      { id: 1, size: '4x4' },
      { id: 2, size: '6x6' },
      { id: 3, size: '8x8' }
    ];
    const completedList: number[] = [];

    // Check only the specific configured sizes for completion
    let isGhostRaw = await redis.hGet(`ghosted_users:${requestedDate}`, username);
    if (!isGhostRaw) isGhostRaw = await redis.hGet('ghosted_users_v1', username);
    const targetBoard = (isGhostRaw === 'true') ? 'tainted' : 'clean';

    const checks = await Promise.all(
      levels.map(level => redis.zScore(`leaderboard:daily:${requestedDate}:${level.size}:${targetBoard}`, username))
    );

    checks.forEach((score, index) => {
      if (score !== undefined && score !== null) {
        completedList.push(levels[index].id);
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
    // Extract requested date or fallback to today
    const targetDate = c.req.query('date') || new Date().toISOString().split('T')[0];
    
    let isGhostRaw = await redis.hGet(`ghosted_users:${targetDate}`, username);
    if (!isGhostRaw) isGhostRaw = await redis.hGet('ghosted_users_v1', username);
    const targetBoard = (isGhostRaw === 'true') ? 'tainted' : 'clean';

    const [rawLeaderboard, distributionRaw] = await Promise.all([
      redis.zRange(`leaderboard:daily:${targetDate}:${gridSize}:${targetBoard}`, 0, 49, { by: 'rank' }),
      redis.hGetAll(`leaderboard:daily:${targetDate}:${gridSize}:dist:${targetBoard}`)
    ]);

    const distribution: Record<string, number> = {};
    let totalSolvers = 0;
    
    for (const [bucket, countStr] of Object.entries(distributionRaw)) {
       const count = parseInt(countStr, 10) || 0;
       distribution[bucket] = count;
       totalSolvers += count;
    }

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      entries: rawLeaderboard,
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
    const user = await reddit.getCurrentUser();
    if (!user) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized access' }, 401);

    const subreddit = await reddit.getCurrentSubreddit();
    const moderators = await reddit.getModerators({ subredditName: subreddit.name }).all();
    const isMod = moderators.some(m => m.username === user.username);
    
    if (!isMod) {
      console.warn(`[Dev Reset] Unauthorized deletion attempt by: ${user.username}`);
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator privileges strictly required.' }, 403);
    }

    const reqDate = c.req.query('date');
    const targetDate = reqDate || new Date().toISOString().split('T')[0];

    console.log(`[Dev Reset] Authorized explicit cache wipe for date: ${targetDate}, admin: ${user.username}`);

    const resetPromises: Promise<unknown>[] = [];
    for (let level = 1; level <= 5; level++) {
       const size = level + 3;
       const puzzleId = `${targetDate}-${size}x${size}-${level}`;
       
       console.log(`[Dev Reset] Expurging dual-leaderboards entirely for ${size}x${size}...`);
       
       resetPromises.push(
         redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:clean`),
         redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:dist:clean`),
         redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:tainted`),
         redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:dist:tainted`),
         redis.del(`gameState:${user.username}:${puzzleId}`)
       );
    }
    await Promise.all(resetPromises);
    
    return c.json({ status: 'success', message: `Data eradicated securely for ${targetDate}` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[Dev Reset UI Route] Fault:`, msg);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to execute secure reset' }, 500);
  }
});



