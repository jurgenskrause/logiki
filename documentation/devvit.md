# Logiki Devvit Conversion Plan

This document outlines the detailed plan to convert the Logiki game to run on Devvit (Reddit's Developer Platform). The Devvit version of Logiki will serve primarily as a daily competitive puzzle environment.

## 1. Core Experience & Constraints
- **Daily Focus**: The default game mode will strictly be the "Daily Puzzle", prioritizing the 4x4 grid as the main daily challenge.
- **Grid Restriction**: The daily puzzles will be generated for 4x4 (primary default), 6x6, and 8x8 grids to cater to more adventurous users.
- **Random Games**: The option to generate and play random games will be hidden/disabled in the Devvit build. The underlying generation code will remain intact in the shared codebase for use on other platforms.
- **Environment Detection**: We will implement a build flag or environment variable (e.g., `isDevvit = true`) to conditionally render UI elements (hiding the "Random Game" generating features and difficulty selectors).

## 2. Devvit Storage & State Management (Redis)
Devvit relies on its built-in Redis KV store for persistent data. This will be accessed via `context.redis`.

### Daily Puzzle Storage
- Puzzles will be pre-generated and stored in Devvit Redis for each grid size.
- **Key Format**: `daily_puzzle:{size}:{YYYY-MM-DD}` (e.g., `daily_puzzle:4x4:2026-04-06`)
- **Data**: JSON string representing the initialized board state, clues, configuration, and a **sha256 hash of the solution matrix**. This hash is essential to securely verify a user's submitted response against the true solution on the server without exposing the plaintext solution to the client.
- **Retrieval**: The Devvit app will check the current UTC date, format it, and default to fetching `daily_puzzle:4x4:{YYYY-MM-DD}` upon load. Users can manually switch to the 6x6 or 8x8 variants.

### Cross-Device Game Resume
- Players must be able to securely resume an active game.
- Only one active game per player is allowed.
- **Key Format**: `active_game:{userId}` (where `{userId}` obtained via `context.reddit.getCurrentUser()`)
- **Data**: JSON string of the current playing state (elapsed time, grid markings, binned clues).
- **Behavior**: Upon launching Logiki, if an active game state exists for the user, it will load immediately. Once the puzzle is completed or abandoned, this key gets cleared.

## 3. Leaderboards
- Leaderboards will track verified completion times, structured by grid size for the current daily puzzle.
- **Implementation**: Utilizes Devvit Redis Sorted Sets (`zAdd`, `zRange`).
- **Key Format**: `leaderboard:daily:{size}:{YYYY-MM-DD}` (e.g., `leaderboard:daily:4x4:2026-04-06`)
- **Submitting Score**:
  - When the user solves the puzzle, the Devvit backend function receives a completion event with the final submitted board state and time.
  - Verification: The server generates a hash of the submitted final board and compares it against the stored solution hash in Redis. A match verifies the solution before writing the time to the leaderboard.
  - Command: `context.redis.zAdd('leaderboard:daily:{size}:{YYYY-MM-DD}', { member: username, score: timeInSeconds })`
- **Viewing Scores**:
  - Command: `context.redis.zRange('leaderboard:daily:{size}:{YYYY-MM-DD}', 0, 9, { by: 'rank' })` (fetching top 10 fastest times).
  - The UI will include a "Leaderboard" tab or button to display these scores natively.

## 4. History Vault (Past Daily Puzzles)
- Players can browse and play historical daily puzzles.
- **Retrieval**: Queries `daily_puzzle:{size}:{YYYY-MM-DD}` for past dates.
- **Constraint**: If the selected puzzle date does not match the current active day, the score submission logic will explicitly skip adding the score to the leaderboard. Historic games are purely for practice/enjoyment.

## 5. Anti-Cheat Strategic Framework for Devvit Planners

This section outlines a Silent Validation Pipeline for the game logic. The goal is to maintain leaderboard integrity by "Ghosting" (Shadow Banning) cheaters—allowing them to see their own scores at the top while hiding them from legitimate players.

### Phase 1: The "Stateful" Game Loop
To prevent local clock manipulation and "Memory Peeking," the game must be server-authoritative regarding time.
- **Server-Side Stopwatch**: When a player clicks "Start," the server records a `Start_Timestamp`. The final time is calculated by the server at submission, not the client’s phone clock.
- **Sync & Resume**: Every "Pause" or "Device Switch" must trigger a state-save to Redis. If a user tries to play the same puzzle on two devices simultaneously, the session is flagged as "Compromised."
- **The Payload**: Upon winning, the client sends a single package containing:
  - **The Solution Hash**: A digital fingerprint of their solved board.
  - **The Move Log**: A chronological list of every deduction made and the exact millisecond it occurred.

### Phase 2: The Validation Sieve (The Filter)
Once a score is submitted, it must pass through criteria. If it fails any, it is silently marked as unverified.
- **Sieve 1: Integrity Check**: Does their board match the actual solution (Hash Match)? If no, they forced a "Win" screen via code.
- **The "Mechanical Floor"**: Based on the puzzle size, we set a Theoretical Minimum Time (TMT). (e.g., if a 6x6 requires 36 minimum clicks at 0.3s each, under 10.8s is physically impossible).
- **Sieve 2: Cadence Analysis (The "Bot" Trap)**: Look for input variance. If gaps between clicks are identical (e.g., exactly 500ms), it’s a macro. Also flags instant solutions without opening required clues.
- **Sieve 3: Statistical Outliers**: Using Median Absolute Deviation (MAD), anomalous times (e.g., a 12-second solve in an empty valley of a 30–90s human hump) are flagged.

### Phase 3: The "Ghost" Leaderboard Logic
This is the psychological deterrent. We do not ban the user; we isolate them.
- **The `is_verified` Flag**: Every score in the database has a hidden True/False status.
- **Conditional Visibility**: Normal Users only see scores where `is_verified = True`. The Cheater sees all True scores PLUS their own False score.
- **Result**: The cheater sees themselves at #1 and stops trying to break the system. The community sees a fair, clean leaderboard.

### Phase 4: Platform Compliance (Devvit Limits)
To ensure the app isn't throttled or cancelled by Reddit for excessive resource use:
- **Batch Processing**: We do not talk to the server for every mouse click. We only communicate on Start, Pause, and Finish.
- **Data Expiry**: We set a 24-hour "Time-to-Live" (TTL) on game states. Once the daily puzzle resets, the old "Resume" data is deleted automatically to keep storage footprints small.
- **Lightweight Logic**: The "Sieve" is designed to stop immediately if a check fails, saving precious server processing time.

### Summary for Planners
| Rule | Action |
|--- |--- |
| **Never trust the client** | The server decides when the game started and ended. |
| **Silence is golden** | Never tell a cheater they are caught. Let them win a "private" race. |
| **Physics matters** | Use the "Mechanical Floor" to auto-flag anything faster than human fingers can move. |

## 6. Devvit Account Setup & Publishing Guidelines

To publish Logiki on Devvit, follow these steps:

### Prerequisites
1. Ensure you have Node.js (v18+) installed.
2. Install the Devvit CLI globally:
   ```bash
   npm install -g @devvit/cli
   ```

### Authentication
1. Authenticate the CLI with your Reddit account:
   ```bash
   devvit login
   ```
2. Follow the browser prompt to authorize the Devvit CLI. Ensure you are using an account with appropriate permissions (you may want to use a developer-specific account or subreddit).

### App Initialization & Configuration
1. Since the core game is already built, you will initialize a Devvit app wrapper around the existing web app using Devvit Webviews or Blocks.
2. In the Devvit project directory, define required capabilities in `devvit.yaml` (or `devvit.json` based on version):
   ```json
   {
     "permissions": {
       "redis": true
     }
   }
   ```

### Execution & Testing (Playtest)
1. To test the app securely in a private subreddit where you are a moderator:
   ```bash
   devvit playtest <r/your_test_subreddit>
   ```
2. This creates a hot-reloading environment on your test subreddit to verify Redis states and UI rendering.

### Uploading & Publishing
1. Upload the bundled project to Reddit's servers:
   ```bash
   devvit upload
   ```
2. To submit the app for official review and make it available:
   ```bash
   devvit publish
   ```
   *Note: If you want the app to be widely available in the App Directory (public), use `devvit publish --public`.*
   *Publishing triggers a safety and policy review by Reddit, which generally takes 1-2 business days.*

For the most up-to-date API references and guides, refer to the [official Reddit Developer Portal](https://developers.reddit.com/docs/).
