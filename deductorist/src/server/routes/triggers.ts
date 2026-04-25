import { Hono } from 'hono';
import type { OnAppInstallRequest, OnAppUpgradeRequest, TriggerResponse } from '@devvit/web/shared';
import { context, scheduler } from '@devvit/web/server';

export const triggers = new Hono();

const setupDailyCron = async () => {
    console.log('[Triggers] setupDailyCron invoked. Canceling existing jobs...');
    // Clear previously scheduled jobs to avoid duplicated crons
    const jobs = await scheduler.listJobs();
    for (const job of jobs) {
       await scheduler.cancelJob(job.id);
    }
    
    console.log('[Triggers] Firing immediate orchestrator job for today...');
    // Fire it once right now to prime today's puzzle immediately
    await scheduler.runJob({
       name: 'orchestrate_daily_puzzles',
       data: {},
       runAt: new Date()
    });

    console.log('[Triggers] Scheduling midnight recurrence...');
    // Schedule everyday at Midnight UTC
    await scheduler.runJob({
       name: 'orchestrate_daily_puzzles',
       cron: '0 0 * * *',
       data: {}
    });
};

triggers.post('/on-app-install', async (c) => {
  console.log('[Triggers] /on-app-install hook fired!');
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    await setupDailyCron();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Daily Cron successfully configured in subreddit ${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error hooking install cron: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to configure cron scheduler',
      },
      400
    );
  }
});

triggers.post('/on-app-upgrade', async (c) => {
  console.log('[Triggers] /on-app-upgrade hook fired!');
  try {
    const input = await c.req.json<OnAppUpgradeRequest>();
    await setupDailyCron();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Daily Cron successfully upgraded in subreddit ${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error hooking upgrade cron: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to configure cron scheduler',
      },
      400
    );
  }
});
