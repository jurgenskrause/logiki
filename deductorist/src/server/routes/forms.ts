import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

type ExampleFormValues = {
  message?: string;
};

import { context, redis } from '@devvit/web/server';

export const forms = new Hono();

forms.post('/admin-override-submit', async (c) => {
  try {
    const data = await c.req.json();
    const postId = data.postId;
    const { gameDate, seed } = data as { gameDate?: string; seed?: string };
    
    if (gameDate) {
       await redis.hSet(`post_metadata:${postId}`, { gameDate });
    }
    if (seed) {
       await redis.hSet(`post_metadata:${postId}`, { seed });
    }

    return c.json<UiResponse>({ showToast: { text: 'Content Override applied successfully.', appearance: 'success' } }, 200);
  } catch (e) {
    return c.json<UiResponse>({ showToast: 'Failed to apply overrides.' }, 400);
  }
});

forms.post('/admin-score-submit', async (c) => {
  try {
    const data = await c.req.json();
    const { username } = data as { username: string };
    const dateQuery = await redis.get(`post_date:${context.postId}`);
    const actualDate = dateQuery || new Date().toISOString().split('T')[0];

    // Wipe from all configured sizes in both cleanly and tainted lists
    await Promise.all(['4x4', '6x6', '8x8'].flatMap(size => [
      redis.zRem(`leaderboard:daily:${actualDate}:${size}:clean`, [username]),
      redis.zRem(`leaderboard:daily:${actualDate}:${size}:tainted`, [username])
    ]));

    return c.json<UiResponse>({ showToast: { text: `User ${username} wiped from ${actualDate} leaderboard.`, appearance: 'success' } }, 200);
  } catch (e) {
    return c.json<UiResponse>({ showToast: 'Failed to moderate score.' }, 400);
  }
});

import { reddit } from '@devvit/web/server';

forms.post('/admin-dev-reset-submit', async (c) => {
  try {
    const data = await c.req.json();
    const { targetDate } = data as { targetDate: string };
    const username = await reddit.getCurrentUsername();

    console.log(`[Dev Reset] Initiating explicit cache wipe for date: ${targetDate}, admin: ${username || 'anonymous'}`);

    for (let level = 1; level <= 5; level++) {
       const size = level + 3;
       const puzzleId = `${targetDate}-${size}x${size}-${level}`;
       
       console.log(`[Dev Reset] Deleting leaderboard and distribution for ${size}x${size}...`);
       
       // Nuke the global leaderboards completely from both buckets
       await redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:clean`);
       await redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:dist:clean`);
       await redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:tainted`);
       await redis.del(`leaderboard:daily:${targetDate}:${size}x${size}:dist:tainted`);
       
       // Wipe the local testing game state
       if (username) {
           console.log(`[Dev Reset] Deleting active gameState for ${username} on puzzle ${puzzleId}...`);
           await redis.del(`gameState:${username}:${puzzleId}`);
       }
    }
    console.log(`[Dev Reset] Reset completed successfully for ${targetDate}`);
    return c.json<UiResponse>({ showToast: { text: `Global leaderboards annihilated for ${targetDate}.`, appearance: 'success' } }, 200);
  } catch (e: any) {
    console.error(`[Dev Reset] Error during reset operation:`, e?.message || e);
    return c.json<UiResponse>({ showToast: 'Failed to reset leaderboards.' }, 400);
  }
});
