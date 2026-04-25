import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  const targetDate = new Date().toISOString().split('T')[0];
  const subreddit = await reddit.getCurrentSubreddit();
  return await reddit.submitCustomPost({
    title: `Deductorist Daily Puzzle - ${targetDate}`,
    subredditName: subreddit.name,
    postData: { gameDate: targetDate }
  });
};
