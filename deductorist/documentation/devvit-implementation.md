# Deductorist on Devvit: Developer Implementation Guide

This guide breaks down the `devvit.md` strategic plan into an actionable, phase-by-phase implementation manual for developers. It ensures strict adherence to Devvit platform capabilities, optimal usage of the built-in Redis KV store, and strict enforcement of the Anti-Cheat Silent Validation Pipeline.

---

## Phase 1: Devvit Initialization & App Scaffold

### Sub-phase 1.1: Environment & Authentication
Before touching any code, establish the Devvit environment.
1. **Install CLI**: Ensure Node.js (v18+) is installed, then run `npm install -g @devvit/cli`.
2. **Authenticate**: Run `npx devvit login` and authorize via the browser using a Reddit account with proper permissions.
3. **Initialize App**: Run `npx devvit new` to create a fresh Devvit block/webview structure, or transition the existing Deductorist directory into a Devvit-compatible workspace.

### Sub-phase 1.2: Capability Configuration
Devvit requires explicit declaration of capabilities.
1. Open `devvit.yaml` (or `devvit.json`).
2. Add the `redis` permission block, as our entire state and leaderboard logic relies heavily on Devvit Redis:
   ```json
   {
     "permissions": {
       "redis": true
     }
   }
   ```

### Sub-phase 1.3: Webview Wrapper Creation
Deductorist is an existing web game. The Devvit implementation will utilize a Webview.
1. Create a Custom Post block using `Devvit.addCustomPostType`.
2. The block renders a "Play Daily Puzzle" UI, which upon interaction, launches the Deductorist UI inside a Devvit Webview using `context.ui.webView`.
3. Set up two-way messaging (`postMessage` from web app, `onMessage` in Devvit `blocks` code) to pass data like puzzle configuration and finish events back to the secure Reddit server environment.

---

## Phase 2: Redis State & Puzzle Management

### Sub-phase 2.1: Structuring Keys
Define strict constants in your backend code for Devvit Redis key formats:
- `DAILY_KEY(size, date)` -> `daily_puzzle:${size}:${YYYY-MM-DD}` (e.g., `4x4`, `6x6`, `8x8`)
- `ACTIVE_GAME_KEY(userId)` -> `active_game:${userId}`
- `LEADERBOARD_KEY(size, date)` -> `leaderboard:daily:${size}:${YYYY-MM-DD}`

### Sub-phase 2.2: Loading the Daily Puzzle
1. **Date Resolution**: On startup, the server uses UTC to determine the `{YYYY-MM-DD}` string.
2. **Fetching Data**: Call `context.redis.get(DAILY_KEY('4x4', date))` as the primary default.
3. **Payload Construction**: The fetched JSON should contain the initializing board state, clues, and `solutionHash`. Do **not** send the `solutionHash` to the client Webview. Keep it strictly in backend memory/state during validation.

### Sub-phase 2.3: Cross-Device Sync & TTL
Ensure a player can resume their puzzle, but restrict them to one active game session without bloating Redis memory.
1. **Load Resume Data**: Before passing the raw daily puzzle to the Webview, check `context.redis.get(ACTIVE_GAME_KEY(context.reddit.getCurrentUser().id))`.
2. **Pass to Client**: If it exists, inject this raw JSON state into the Webview so it resumes visually.
3. **Set Expiry (TTL)**: To prevent Redis bloat, whenever saving the `ACTIVE_GAME_KEY`, use Devvit's TTL mechanics to expire the key automatically after 24 hours. `context.redis.set(key, value, { expirationTime: Date.now() + 86400000 })`.

---

## Phase 3: The Stateful Game Loop & Anti-Cheat Validation

This phase moves game execution authority from the client to the server. Implement three distinct message handlers in the Devvit backend listening to the Webview.

### Sub-phase 3.1: Server-Side Stopwatch (Event: `GAME_START`)
- **Action**: When the Webview sends a `GAME_START` message, note the exact server time.
- **Why**: Prevents memory/clock tampering on the phone. Store the `Start_Timestamp` in a quick Redis hash or temporary session object associated with the `userId`.

### Sub-phase 3.2: Sync & Resume (Event: `GAME_PAUSE`)
- **Batch Constraint**: Never send every cell click over the network. Network calls on Devvit are expensive.
- **Action**: The Webview explicitly fires `GAME_PAUSE` on backgrounding or exiting.
- **Validation**: Ensure no overlapping saves occur rapidly. Write the provided JSON graph to `ACTIVE_GAME_KEY(userId)`.

### Sub-phase 3.3: The Validation Sieve (Event: `GAME_SUBMIT`)
When the Webview fires `GAME_SUBMIT`, it must send `finalBoardState` and `moveLog` (an array of `[move_id, timestamp_offset]`).
Execute the following Sieves synchronously, failing silently (return a standard "Success!" to the client regardless of failure to enforce the Silent Pipeline).

#### Sieve 1: Integrity Check & Mechanical Floor
1. **The Hash**: Hash the submitted `finalBoardState` using `sha256`. Does it match the daily puzzle `solutionHash` from Redis? If not -> `is_verified = false`.
2. **The Floor**: Take the Server `End_Time` MINUS `Start_Timestamp`. Is it under the Theoretical Minimum Time (TMT)? Example: 4x4 requires 16 clicks * 0.3s = 4.8 seconds minimal. If faster -> `is_verified = false`.

#### Sieve 2: Cadence Analysis
1. Loop over the `moveLog`. Calculate the exact delta between every move.
2. **Variance Check**: Is the standard deviation of input timing extremely low (e.g., clicking exactly every 500ms)? If it strongly resembles automated macro timing -> `is_verified = false`.
3. **Clue Check**: Did the player fill a square requiring complex derivation without expanding the UI for the relevant clue? Treat as memory peeking -> `is_verified = false`.

#### Sieve 3: Statistical Outliers
1. When submitting the score, fetch recent leaderboard entries.
2. If the user's score sits completely disconnected from the human "hump" cluster (e.g., scoring 15s when median is 60s and top 10 is 55s), flag them -> `is_verified = false`.

---

## Phase 4: The "Ghost" Leaderboard Logic

### Sub-phase 4.1: Submitting the Score
1. Combine the score and the `is_verified` flag. Since Devvit Redis sorted sets (`zAdd`) only take a single numerical score per member, you must store the metadata separately or manipulate the member string.
2. **Pattern**: `context.redis.zAdd(LEADERBOARD_KEY(size, date), { member: userId, score: finalTimeSeconds })`.
3. **Ghost Tracking**: Store the verification flag in a separate Hash map: `context.redis.hSet(`ghosted_users:${date}`, { [userId]: String(is_verified) })`.

### Sub-phase 4.2: Client-Side Ghost Rendering (Leaderboard View)
When loading the leaderboard UI:
1. Fetch top scores using `context.redis.zRange`.
2. Fetch the Ghost Map: `context.redis.hGetAll(ghosted_users:${date})`.
3. **Filtering**:
   - For regular users: Only serve leaderboard entries where `Ghost Map[member] === 'true'`.
   - For the requesting user: Serve entries where `Ghost Map[member] === 'true'` **PLUS** their own entry (even if false).
4. The client now naturally sees themselves at the top if they cheated, while real users never see that entry.

---

## Phase 5: Client-Side (React/Web) Adaptations

### Sub-phase 5.1: Devvit Detection & Layout Constraints
1. Create an environment toggle `const isDevvit = !!window.reddit;` (or whatever specific Devvit Webview postMessage signature you attach).
2. **Hide UI**: Conditionally hide "Random Game" buttons.
3. **Lock Modes**: Force the app into the "Daily Mode". Limit puzzle selectability to `4x4` (Default), `6x6`, and `8x8`. Remove custom size options.

### Sub-phase 5.2: Payload Logging Engine
1. Attach a lightweight hook to the `BoardCell` input function.
2. Keep an in-memory array summing the time elapsed relative to `Start`.
3. Send this array inside `GAME_SUBMIT`. Do **not** process complex cadence math on the client; leave it entirely for the server Sieve.

---

## Phase 6: Publishing & Review

### Sub-phase 6.1: Playtest
1. Run `devvit playtest <r/your_test_subreddit>`.
2. Open Reddit on desktop/mobile and access the test subreddit.
3. Verify that the UI webview renders, Redis sync occurs properly across app restarts, and that purposely submitting an incorrect payload successfully triggers a "Ghost" ban instead of a hard crash.

### Sub-phase 6.2: Final Upload
1. Build the production standard of the web app and pack it securely into the Devvit `assets` folder.
2. Run `devvit upload`.
3. Run `devvit publish` (or `devvit publish --public`) to kick off the Reddit safety review.
