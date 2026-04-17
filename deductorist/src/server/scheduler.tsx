import { Devvit } from '@devvit/public-api';
import { ensurePuzzle } from './core/puzzle';
import { reddit, redis, scheduler } from '@devvit/web/server';

/**
 * STAGE 1: ORCHESTRATOR
 * Submits the post instantly so users see content immediately,
 * then kicks off the background workers.
 */
Devvit.addSchedulerJob({
  name: 'daily_puzzle_post',
  onRun: async (event) => {
    const targetDate = (event.data?.targetDate as string) || new Date().toISOString().split('T')[0];
    const lockKey = `daily_post_last_run:${targetDate}`;
    
    if (await redis.get(lockKey) === 'true') return;

    try {
      await redis.set(lockKey, 'true');
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitCustomPost({
        title: `Deductorist Daily Puzzle - ${targetDate}`,
        subredditName: subreddit.name,
        postData: { gameDate: targetDate }
      });

      // Link postId to gameDate for API lookup
      await redis.set(`post_date:${post.id}`, targetDate);

      // Initialize status tracking
      await redis.set(`daily_puzzle_status:${targetDate}`, 'orchestrated');
      
      // Chain to Stage 2
      await scheduler.runJob({
        name: 'generate_small_puzzles',
        data: { targetDate },
        runAt: new Date()
      });

      console.log(`[Stage 1] Post deployed: ${post.id}. Worker chained.`);
    } catch (e) {
      console.error(`[Stage 1] Failed orchestrating post for ${targetDate}`, e);
      await redis.del(lockKey);
    }
  }
});

/**
 * STAGE 2: SMALL puzzles
 * Handles the "light" weight generation (Easy/Medium)
 */
Devvit.addSchedulerJob({
  name: 'generate_small_puzzles',
  onRun: async (event) => {
    const targetDate = event.data?.targetDate as string;
    if (!targetDate) return;

    try {
      console.log(`[Stage 2] Generating Easy/Medium (4/6) for ${targetDate}...`);
      await ensurePuzzle(targetDate, 1); // Easy (4x4)
      await ensurePuzzle(targetDate, 2); // Medium (6x6)
      
      await redis.set(`daily_puzzle_status:${targetDate}`, 'small_ready');
      
      // Chain to Stage 3 for the heavy lifing
      await scheduler.runJob({
        name: 'generate_large_puzzles',
        data: { targetDate },
        runAt: new Date()
      });
    } catch (e) {
      console.error(`[Stage 2] Small workers failed for ${targetDate}`, e);
    }
  }
});

/**
 * STAGE 3: LARGE puzzles
 * Dedicated window for heavy computation (Hard 8x8)
 */
Devvit.addSchedulerJob({
  name: 'generate_large_puzzles',
  onRun: async (event) => {
    const targetDate = event.data?.targetDate as string;
    if (!targetDate) return;

    try {
      console.log(`[Stage 3] Generating Hard (8x8) for ${targetDate}...`);
      await ensurePuzzle(targetDate, 3); // Hard (8x8)
      
      await redis.set(`daily_puzzle_status:${targetDate}`, 'ready');
      console.log(`[Stage 3] Complete. All puzzles ready for ${targetDate}.`);
    } catch (e) {
      console.error(`[Stage 3] Large worker failed for ${targetDate}`, e);
    }
  }
});
