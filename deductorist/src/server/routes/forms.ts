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

    // Wipe from daily leaderboard
    await redis.zRem(`leaderboard:${actualDate}`, [username]);

    return c.json<UiResponse>({ showToast: { text: `User ${username} wiped from ${actualDate} leaderboard.`, appearance: 'success' } }, 200);
  } catch (e) {
    return c.json<UiResponse>({ showToast: 'Failed to moderate score.' }, 400);
  }
});
