import { Solver, SolverResult } from './Solver';
import type { ActiveClue } from './Solver';
import { LogicCanvas } from './LogicCanvas';
import type { GameState } from './GameState';
import { describeClue } from './ClueDescriber';

export interface HintResult {
  /** The weakest clue that produces a deduction on the current board */
  clue: ActiveClue;
  /** IDs of cells affected (that lose at least one possibility) */
  affectedCells: string[];
  /** English-language description of what the clue tells you */
  text: string;
}

export interface AnalysisResult {
  /** Whether the current board state is a logical contradiction */
  isContradiction: boolean;
  /** The best (weakest) hint found, or null if puzzle is already solved */
  hint: HintResult | null;
}

const solver = new Solver();

/**
 * Seeds a LogicCanvas from the current GameState bitmask grid.
 * Bridges the GameState (player) representation to the solver's canvas.
 */
function canvasFromGameState(gs: GameState): LogicCanvas {
  const canvas = new LogicCanvas(gs.rows, gs.cols);
  const gridSnapshot = gs.grid; // already a copy
  for (let r = 0; r < gs.rows; r++) {
    for (let c = 0; c < gs.cols; c++) {
      const idx = r * gs.cols + c;
      const mask = gridSnapshot[idx];
      // Apply the player's current bitmask to the canvas
      // The full mask is (1 << cols) - 1; we restrict by AND-ing with player mask
      const fullMask = (1 << gs.cols) - 1;
      canvas.applyMask(r, c, mask & fullMask);
    }
  }
  return canvas;
}

/**
 * Computes the cells that would be altered if the given clue is applied to the canvas.
 */
function getAffectedCells(clue: ActiveClue, canvas: LogicCanvas): string[] {
  const tryCanvas = canvas.clone();
  solver.solve([clue], tryCanvas);

  const affected: string[] = [];
  for (let r = 0; r < canvas.height; r++) {
    for (let c = 0; c < canvas.width; c++) {
      if (tryCanvas.getMask(r, c) !== canvas.getMask(r, c)) {
        affected.push(`${r}-${c}`);
      }
    }
  }
  return affected;
}

/**
 * Runs a full analysis of the current game state:
 * 1. Checks for contradictions (unsolvable state)
 * 2. Finds the weakest clue that still yields new information
 */
export function analyzeState(gs: GameState, clues: ActiveClue[]): AnalysisResult {
  const canvas = canvasFromGameState(gs);

  // 1. Full solve to detect contradiction
  const fullCanvas = canvas.clone();
  const fullResult = solver.solve(clues, fullCanvas);
  if (fullResult === SolverResult.CONTRADICTION) {
    return { isContradiction: true, hint: null };
  }

  // 2. Find weakest productive clue (skip ANCHOR clues — those are already applied)
  const nonAnchorClues = clues.filter(c => c.type !== 'ANCHOR' && c.type !== 'NEGATIVE_ANCHOR');

  // Attempt clues in order (they come ordered simple→complex from the manifest)
  for (const clue of nonAnchorClues) {
    const productive = solver.testClue(clue, canvas);
    if (productive) {
      const affectedCells = getAffectedCells(clue, canvas);
      return {
        isContradiction: false,
        hint: {
          clue,
          affectedCells,
          text: describeClue(clue),
        },
      };
    }
  }

  // No hint found (puzzle is fully solved or no clue helps)
  return { isContradiction: false, hint: null };
}
