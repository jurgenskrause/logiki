import { Devvit } from '@devvit/public-api';
import { ensurePuzzle } from './core/puzzle';
import { reddit, redis } from '@devvit/web/server';

Devvit.addSchedulerJob({
  name: 'daily_puzzle_post',
  onRun: async (event) => {

    // Determine target date from scheduled invocation override or standard runtime date
    const targetDate = (event.data?.targetDate as string) || new Date().toISOString().split('T')[0];

    // Idempotency Mutex Lock
    const lockKey = `daily_post_last_run:${targetDate}`;
    const alreadyRun = await redis.get(lockKey);
    
    if (alreadyRun === 'true') {
      console.log(`[Scheduler] Aborting duplicate run for ${targetDate}`);
      return;
    }

    try {
      // Set the lock immediately prior to network call to prevent immediate race conditions
      await redis.set(lockKey, 'true');

      // PRE-GENERATE the puzzle before making the post live
      console.log(`[Scheduler] Pre-generating puzzle for ${targetDate}...`);
      await ensurePuzzle(targetDate, 1); // Default difficulty
      
      const subreddit = await reddit.getCurrentSubreddit();
      const post = await reddit.submitCustomPost({
        title: `Deductorist Daily Puzzle - ${targetDate}`,
        subredditName: subreddit.name,
        postData: { gameDate: targetDate }
      });
      
      console.log(`[Scheduler] Successfully deployed Daily Post for ${targetDate}: ${post.id}`);
    } catch (e) {
      console.error(`[Scheduler] Failed to submit custom post for ${targetDate}`, e);
      // If the submission actually failed on Reddit's end, unlock the mutex so the process can be safely retried.
      await redis.del(lockKey);
    }
  }
});
