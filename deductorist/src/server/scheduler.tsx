import { Devvit } from '@devvit/public-api';
import { ensurePuzzle } from './core/puzzle';
import { reddit, redis, scheduler } from '@devvit/web/server';

/**
 * STAGE 1: ORCHESTRATOR
 * Sets up the locking mechanism and immediately kicks off
 * the puzzle generation sequence BEFORE any Reddit post drops.
 */
Devvit.addSchedulerJob({
  name: 'orchestrate_daily_puzzles',
  onRun: async (event) => {
    const targetDate = (event.data?.targetDate as string) || new Date().toISOString().split('T')[0];
    const lockKey = `daily_post_last_run:${targetDate}`;
    
    if (await redis.get(lockKey) === 'true') return;

    try {
      await redis.set(lockKey, 'true');
      
      // Initialize status tracking
      await redis.set(`daily_puzzle_status:${targetDate}`, 'orchestrating');
      
      console.log(`[Stage 1] Pre-generation sequence initiated for ${targetDate}. Worker chained.`);
      
      // Chain to Stage 2
      await scheduler.runJob({
        name: 'generate_small_puzzles',
        data: { targetDate },
        runAt: new Date()
      });
    } catch (e) {
      console.error(`[Stage 1] Failed orchestrating sequence for ${targetDate}`, e);
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
      
      await redis.set(`daily_puzzle_status:${targetDate}`, 'generation_complete');
      console.log(`[Stage 3] Complete. All puzzles ready for ${targetDate}. Chaining Publisher.`);

      // Generation 100% complete. Now trigger the post explicitly.
      await scheduler.runJob({
        name: 'publish_daily_post',
        data: { targetDate },
        runAt: new Date()
      });
    } catch (e) {
      console.error(`[Stage 3] Large worker failed for ${targetDate}`, e);
    }
  }
});

/**
 * STAGE 4: PUBLISHER
 * Finally submits the post to Reddit so users can access 
 * the fully pre-generated and cached daily puzzles without loading.
 */
Devvit.addSchedulerJob({
  name: 'publish_daily_post',
  onRun: async (event) => {
    const targetDate = event.data?.targetDate as string;
    if (!targetDate) return;

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
      
      console.log(`[Stage 4] Custom Post deployed: ${post.id}. Fully Tethered.`);
    } catch (e) {
      console.error(`[Stage 4] Failed to publish post for ${targetDate}`, e);
    }
  }
});
