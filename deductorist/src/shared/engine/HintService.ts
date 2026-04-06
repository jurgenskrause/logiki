import { Solver, SolverResult } from './Solver';
import type { ActiveClue } from './Solver';
import { LogicCanvas } from './LogicCanvas';
import type { GameState } from './GameState';
import { describeDeduction } from './ClueDescriber';

export interface HintAction {
  cellId: string;
  row: number;
  col: number;
  itemIndex: number;
  type: 'eliminate' | 'confirm';
}

export interface HintResult {
  clue: ActiveClue;
  action: HintAction;
  text: string;
}

export interface AnalysisResult {
  isContradiction: boolean;
  isSolvable: boolean;
  hint: HintResult | null;
}

const solver = new Solver();

function bitCount(mask: number): number {
  let count = 0;
  let m = mask;
  while (m > 0) { count += m & 1; m >>= 1; }
  return count;
}

/**
 * Seeds a LogicCanvas from the current GameState bitmask grid.
 */
function canvasFromGameState(gs: GameState): LogicCanvas {
  const canvas = new LogicCanvas(gs.rows, gs.cols);
  const gridSnapshot = gs.grid;
  const fullMask = (1 << gs.cols) - 1;
  for (let r = 0; r < gs.rows; r++) {
    for (let c = 0; c < gs.cols; c++) {
      const idx = r * gs.cols + c;
      canvas.applyMask(r, c, gridSnapshot[idx] & fullMask);
    }
  }
  return canvas;
}

/**
 * Runs the clue on a dry-run canvas and picks the SINGLE best action:
 * - Prefers 'confirm' (cell solved to one value) over 'eliminate'
 * - Returns only the first such action found
 */
function pickBestAction(clue: ActiveClue, canvas: LogicCanvas): HintAction | null {
  const tryCanvas = canvas.clone();
  solver.solve([clue], tryCanvas);

  let firstEliminate: HintAction | null = null;

  for (let r = 0; r < canvas.height; r++) {
    for (let c = 0; c < canvas.width; c++) {
      const before = canvas.getMask(r, c);
      const after = tryCanvas.getMask(r, c);
      if (before === after) continue;

      const afterCount = bitCount(after);
      const beforeCount = bitCount(before);

      // Prefer confirms (went from >1 to exactly 1)
      if (afterCount === 1 && beforeCount > 1) {
        const itemIndex = Math.log2(after);
        if (Number.isInteger(itemIndex)) {
          return { cellId: `${r}-${c}`, row: r, col: c, itemIndex, type: 'confirm' };
        }
      }

      // Track first eliminate
      if (!firstEliminate) {
        const eliminated = before & ~after;
        for (let i = 0; i < canvas.width; i++) {
          if (eliminated & (1 << i)) {
            firstEliminate = { cellId: `${r}-${c}`, row: r, col: c, itemIndex: i, type: 'eliminate' };
            break;
          }
        }
      }
    }
  }

  return firstEliminate;
}

/**
 * Full analysis of current game state:
 * 1. Checks for contradictions (full solve)
 * 2. Finds the weakest clue and the single best action it enables
 */
export function analyzeState(gs: GameState, clues: ActiveClue[]): AnalysisResult {
  const canvas = canvasFromGameState(gs);

  // 1. Contradiction check
  const fullCanvas = canvas.clone();
  const fullResult = solver.solve(clues, fullCanvas);
  
  const isSolvable = fullResult === SolverResult.SOLVED;

  if (fullResult === SolverResult.CONTRADICTION) {
    return { isContradiction: true, isSolvable, hint: null };
  }

  // 2. Find weakest productive clue (skip anchors — already applied)
  const nonAnchorClues = clues.filter(c => c.type !== 'ANCHOR' && c.type !== 'NEGATIVE_ANCHOR');

  for (const clue of nonAnchorClues) {
    if (!solver.testClue(clue, canvas)) continue;

    const action = pickBestAction(clue, canvas);
    if (!action) continue;

    return {
      isContradiction: false,
      isSolvable,
      hint: {
        clue,
        action,
        text: describeDeduction(clue, action),
      },
    };
  }

  return { isContradiction: false, isSolvable, hint: null };
}

/**
 * Applies a hint action directly to the GameState.
 * For eliminates: only toggles if the bit is currently set (avoids re-enabling).
 * Cascades happen naturally through GameState's autoPrune.
 */
export function applyHint(gs: GameState, action: HintAction): void {
  if (action.type === 'confirm') {
    gs.confirmCell(action.row, action.col, action.itemIndex);
  } else {
    const idx = action.row * gs.cols + action.col;
    const currentMask = gs.grid[idx];
    if (currentMask & (1 << action.itemIndex)) {
      gs.toggleBit(action.row, action.col, action.itemIndex);
    }
  }
}
