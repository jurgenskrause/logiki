import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, scheduler } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/admin-nuclear-reset', async (c) => {
  try {
    const jobs = await scheduler.listJobs();
    for (const job of jobs) {
      await scheduler.cancelJob(job.id);
    }
    // Fire the install initializer manually
    await scheduler.runJob({ name: 'initialize_game_state', data: {}, runAt: new Date() });
    return c.json<UiResponse>({ showToast: { text: `Purged ${jobs.length} jobs. Scheduled Init.`, appearance: 'success' } }, 200);
  } catch (e) {
    return c.json<UiResponse>({ showToast: 'Failed to reset scheduler' }, 400);
  }
});

menu.post('/admin-content-override', async (c) => {
  return c.json<UiResponse>({ 
    showForm: { 
      name: 'adminContentOverrideForm', 
      form: {
        title: 'Override Post Level',
        acceptLabel: 'Set Data',
        fields: [
          { type: 'string', name: 'gameDate', label: 'Game Date (YYYY-MM-DD)' },
          { type: 'string', name: 'seed', label: 'Puzzle Seed String' }
        ]
      },
      data: { postId: context.postId } 
    } 
  }, 200);
});

menu.post('/admin-score-moderation', async (c) => {
  return c.json<UiResponse>({ 
    showForm: { 
      name: 'adminScoreModerationForm', 
      form: {
        title: 'Moderator Ban/Removal',
        acceptLabel: 'Wipe User Record',
        fields: [
          { type: 'string', name: 'username', label: 'Reddit Username to Remove', required: true }
        ]
      },
      data: { postId: context.postId } 
    } 
  }, 200);
});

menu.post('/admin-manual-trigger', async (c) => {
  try {
    await scheduler.runJob({ name: 'daily_puzzle_post', data: {}, runAt: new Date() });
    return c.json<UiResponse>({ showToast: { text: 'Daily Post worker queued immediately.', appearance: 'success' } }, 200);
  } catch (e) {
    return c.json<UiResponse>({ showToast: 'Failed to trigger post manually' }, 400);
  }
});
