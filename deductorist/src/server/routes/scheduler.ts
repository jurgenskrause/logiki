import { Hono } from 'hono';
import { ensurePuzzle } from '../core/puzzle';
import { reddit, redis, scheduler } from '@devvit/web/server';

export const schedulerRoutes = new Hono();

// Extract robustly handles Devvit webhook nested { data: { ... } } structure
const extractDate = async (c: any) => {
    let targetDate = undefined;
    try {
        const payload = await c.req.json();
        targetDate = payload?.targetDate || payload?.data?.targetDate;
    } catch(e) {}
    return targetDate;
};

// STAGE 1: ORCHESTRATOR
schedulerRoutes.post('/orchestrate', async (c) => {
    console.log('[Stage 1] ORCHESTRATOR INVOKED VIA HTTP Webhooks');
    let targetDate = await extractDate(c);
    if (!targetDate) targetDate = new Date().toISOString().split('T')[0];
    
    const lockKey = `daily_post_last_run:${targetDate}`;
    
    // TEMPORARY BYPASS FOR PLAYTESTING
    if (await redis.get(lockKey) === 'true') {
        console.log(`[Stage 1] Warning: ${targetDate} was already locked, but bypassing for Devvit testing...`);
    }

    try {
      await redis.set(lockKey, 'true');
      
      // Initialize status tracking
      await redis.set(`daily_puzzle_status:${targetDate}`, 'orchestrating');
      
      console.log(`\n\n======================================================`);
      console.log(`[Stage 1] Pre-generation sequence initiated for ${targetDate}`);
      console.log(`======================================================\n\n`);
      
      // Chain to Stage 2
      await scheduler.runJob({
        name: 'generate_small_puzzles',
        data: { targetDate },
        runAt: new Date()
      });
      return c.json({ status: 'ok' }, 200);
    } catch (e) {
      console.error(`[Stage 1] Failed orchestrating sequence for ${targetDate}`, e);
      await redis.del(lockKey);
      return c.json({ error: 'Failed orchestration' }, 500);
    }
});

// STAGE 2: SMALL puzzles
schedulerRoutes.post('/generate-small', async (c) => {
    const targetDate = await extractDate(c);
    if (!targetDate) return c.json({ error: 'Missing logic target format' }, 400);

    try {
      console.log(`[Stage 2] Generating Easy/Medium (4/6) for ${targetDate}...`);
      const start = Date.now();
      await ensurePuzzle(targetDate, 1); // Easy (4x4)
      await ensurePuzzle(targetDate, 2); // Medium (6x6)
      const duration = Date.now() - start;
      console.log(`[Stage 2] Generated 4x4 and 6x6 in ${duration}ms.`);
      
      await redis.set(`daily_puzzle_status:${targetDate}`, 'small_ready');
      
      // Chain to Stage 3 for the heavy lifing
      await scheduler.runJob({
        name: 'generate_large_puzzles',
        data: { targetDate },
        runAt: new Date()
      });
      return c.json({ status: 'ok' }, 200);
    } catch (e) {
      console.error(`[Stage 2] Small workers failed for ${targetDate}`, e);
      return c.json({ error: 'Failed' }, 500);
    }
});

// STAGE 3: LARGE puzzles
schedulerRoutes.post('/generate-large', async (c) => {
    const targetDate = await extractDate(c);
    if (!targetDate) return c.json({ error: 'Missing logic target format' }, 400);

    try {
      console.log(`[Stage 3] Generating Hard (8x8) for ${targetDate}...`);
      const start = Date.now();
      await ensurePuzzle(targetDate, 3); // Hard (8x8)
      const duration = Date.now() - start;
      console.log(`[Stage 3] Generated 8x8 in ${duration}ms.`);
      
      await redis.set(`daily_puzzle_status:${targetDate}`, 'generation_complete');
      console.log(`[Stage 3] Complete. All puzzles ready for ${targetDate}. Chaining Publisher.`);

      // Generation 100% complete. Now trigger the post explicitly.
      await scheduler.runJob({
        name: 'publish_daily_post',
        data: { targetDate },
        runAt: new Date()
      });
      return c.json({ status: 'ok' }, 200);
    } catch (e) {
      console.error(`[Stage 3] Large worker failed for ${targetDate}`, e);
      return c.json({ error: 'Failed' }, 500);
    }
});

// STAGE 4: PUBLISHER
schedulerRoutes.post('/publish-daily', async (c) => {
    const targetDate = await extractDate(c);
    if (!targetDate) return c.json({ error: 'Missing logic target format' }, 400);

    try {
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitCustomPost({
        title: `Deductorist Daily Puzzle - ${targetDate}`,
        subredditName: subreddit.name,
        postData: { gameDate: targetDate }
      });

      // Link postId to gameDate for API lookup
      await redis.set(`post_date:${post.id}`, targetDate);

      // Finalize global status
      await redis.set(`daily_puzzle_status:${targetDate}`, 'ready');
      
      console.log(`\n\n🚨🚨[Stage 4] ATTENTION: DISPATCHING POST TO REDDIT FOR ${targetDate}🚨🚨`);
      console.log(`✅✅[SUCCESS] Custom Post deployed at https://www.reddit.com/r/${subreddit.name}/comments/${post.id}\n\n`);
      return c.json({ status: 'ok' }, 200);
    } catch (e) {
      console.error(`[Stage 4] Failed to publish post for ${targetDate}`, e);
      return c.json({ error: 'Failed' }, 500);
    }
});
