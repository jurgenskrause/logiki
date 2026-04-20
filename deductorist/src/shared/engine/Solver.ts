import { LogicCanvas } from './LogicCanvas';
import { handleAnchor } from './handlers/AnchorHandler';
import { handleNegativeAnchor } from './handlers/NegativeAnchorHandler';
import { handleVerticalPair } from './handlers/VerticalPairHandler';
import { handleVerticalNot } from './handlers/VerticalNotHandler';
import { handleVerticalTrio } from './handlers/VerticalTrioHandler';
import { handleGappedNotMiddle } from './handlers/GappedNotMiddleHandler';
import { handleVerticalDisjunctiveXor } from './handlers/VerticalDisjunctiveXorHandler';
import { handleSequenceThree } from './handlers/SequenceThreeHandler';
import { handleAdjacent } from './handlers/AdjacentHandler';
import { handleLeftOf } from './handlers/LeftOfHandler';
import { handleVerticalNotTrio } from './handlers/VerticalNotTrioHandler';
import type { CategoryIndex, ItemIndex } from '../types';

/**
 * Result of a solver execution.
 */
export const SolverResult = {
  SOLVED: 'SOLVED',
  AMBIGUOUS: 'AMBIGUOUS',
  CONTRADICTION: 'CONTRADICTION',
  TIMEOUT: 'TIMEOUT',
} as const;

// eslint-disable-next-line no-redeclare
export type SolverResult = (typeof SolverResult)[keyof typeof SolverResult];

/**
 * Represents a hydrated clue targeted at specific items.
 */
export interface ActiveClue {
  id: string; // Unique identifier for binning and tracking
  type: string;
  params: Array<{
    row: CategoryIndex;
    item: ItemIndex;
  }>;
  targetCol?: number; // Used exclusively for ANCHOR/NEGATIVE_ANCHOR clues.
}

/**
 * Phase 3.2.2: Fixed-Point Iteration (The Engine Loop)
 *
 * The Solver coordinates the LogicCanvas and the set of Active Clues.
 * It simulates human deduction by repeatedly passing through all clues
 * until no further information can be pruned (a "Fixed Point" is reached).
 */
export class Solver {
  /**
   * Phase 3.3.1: The Fixed-Point Solver Engine
   * 
   * Iterates until the LogicCanvas reaches a stable state (Zero further prunes).
   * 
   * @param clues The set of Active Clues to apply.
   * @param canvas The possibility matrix to solve.
   * @param maxIterations The safety ceiling to prevent infinite loops (Defaults to 200).
   * @returns SolverResult based on the final convergent state.
   */
  public solve(clues: ActiveClue[], canvas: LogicCanvas, maxIterations: number = 200): SolverResult {
    let iterationCount = 0;

    while (iterationCount < maxIterations) {
      let hasChangedInThisPass = false;

      // ----------------------------------------------------------------------
      // Step 1: External Clue Pass
      // ----------------------------------------------------------------------
      for (const clue of clues) {
        // Handlers return true ONLY if they prune/modify the canvas
        if (this.executeClueHandler(clue, canvas)) {
          hasChangedInThisPass = true;
        }
      }

      // ----------------------------------------------------------------------
      // Step 2: Internal Inference Pass (Phase 3.3.3)
      // ----------------------------------------------------------------------
      if (this.applyInferences(canvas)) {
        hasChangedInThisPass = true;
      }

      // ----------------------------------------------------------------------
      // Step 3: Cross-Category Cleaning (Phase 3.3.4)
      // ----------------------------------------------------------------------
      if (this.applyCleaning(canvas)) {
        hasChangedInThisPass = true;
      }

      // ----------------------------------------------------------------------
      // Step 4: Check for Contradictions
      // ----------------------------------------------------------------------
      if (canvas.hasAnyInvalidCells()) {
        return SolverResult.CONTRADICTION;
      }

      // ----------------------------------------------------------------------
      // Step 4: Check for Convergence
      // If no handler modified the canvas, we have reached the fixed point.
      // ----------------------------------------------------------------------
      if (!hasChangedInThisPass) {
        break;
      }

      iterationCount++;
    }

    if (iterationCount >= maxIterations) {
      console.warn(`Solver exceeded structural bounds (${maxIterations} iterations). Flagging TIMEOUT.`);
      return SolverResult.TIMEOUT;
    }

    // Determine final state
    return canvas.isFullySolved() ? SolverResult.SOLVED : SolverResult.AMBIGUOUS;
  }

  /**
   * Phase 3.3.2: Topological Logic Switchboard (The Router)
   * 
   * Routes a clue to its specific topological logic handler.
   * Returns true if the canvas was modified.
   */
  private executeClueHandler(clue: ActiveClue, canvas: LogicCanvas): boolean {
    switch (clue.type) {
      case 'ANCHOR':
        return handleAnchor(clue, canvas);
      case 'NEGATIVE_ANCHOR':
        return handleNegativeAnchor(clue, canvas);
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return handleVerticalPair(clue, canvas);
      case 'VERTICAL_NOT':
        return handleVerticalNot(clue, canvas);
      case 'VERTICAL_TRIO':
        return handleVerticalTrio(clue, canvas);
      case 'VERTICAL_NOT_TRIO':
        return handleVerticalNotTrio(clue, canvas);
      case 'ADJACENT':
        return handleAdjacent(clue, canvas);
      case 'LEFT_OF':
        return handleLeftOf(clue, canvas);
      case 'SEQUENCE_THREE':
        return handleSequenceThree(clue, canvas);
      case 'GAPPED_EXCLUSION':
        // Note: In our current engine, this handles the A (!B) C relationship
        return handleGappedNotMiddle(clue, canvas);
      case 'GAPPED_NOT_MIDDLE':
        return handleGappedNotMiddle(clue, canvas);
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
      case 'DISJUNCTIVE_XOR':
        return handleVerticalDisjunctiveXor(clue, canvas);
      default:
        console.warn(`Unknown clue type: ${clue.type}`);
        return false;
    }
  }

  /**
   * Phase 3.3.2: Topological Logic Dry Run
   * 
   * Tests whether accepting a clue would produce NEW information WITHOUT causing a
   * contradiction. Runs the full fixed-point solve loop on a canvas clone so that 
   * inference and cleaning cascades are accounted for — a clue that passes a single
   * handler pass can still cause a contradiction when inferences propagate.
   * 
   * Returns true only if:
   *   1. The clue prunes at least one bit (new information), AND
   *   2. The resulting fixed-point state has no invalid cells (no contradiction).
   * 
   * @param clue The clue to test
   * @param canvas The current true puzzle state
   */
  public testClue(clue: ActiveClue, canvas: LogicCanvas): boolean {
    const dryRunCanvas = canvas.clone();

    // Run the full fixed-point loop, not just a single handler pass
    const result = this.solve([clue], dryRunCanvas);

    // Reject if it produced no new information or caused a contradiction
    if (result === SolverResult.CONTRADICTION) return false;

    // Verify that at least one bit actually changed
    for (let r = 0; r < canvas.height; r++) {
      for (let c = 0; c < canvas.width; c++) {
        if (dryRunCanvas.getMask(r, c) !== canvas.getMask(r, c)) return true;
      }
    }
    return false;
  }

  /**
   * Phase 3.3.3: Internal Inference Handlers
   * 
   * These logic patterns represent the "Rules of the Universe" for a logic grid.
   * They scan the LogicCanvas for bitmask patterns across category rows.
   * 
   * @param canvas The logic canvas to prune.
   * @returns true if any bits were pruned.
   */
  private applyInferences(canvas: LogicCanvas): boolean {
    let hasChanged = false;

    for (let r = 0; r < canvas.height; r++) {
      // ----------------------------------------------------------------------
      // Pattern A: Naked Singles (Horizontal Exhaustion)
      // Logic: If item confirmed in Col X, it cannot be in any other column.
      // ----------------------------------------------------------------------
      for (let c = 0; c < canvas.width; c++) {
        if (canvas.isSolved(r, c)) {
          const solvedBit = canvas.getMask(r, c);
          // Prune this bit from all other columns in this row
          for (let targetCol = 0; targetCol < canvas.width; targetCol++) {
            if (targetCol !== c) {
              if (canvas.pruneByMask(r, targetCol, solvedBit)) {
                hasChanged = true;
              }
            }
          }
        }
      }
    }

    // ----------------------------------------------------------------------
    // Pattern B: Hidden Singles (Columnar Necessity)
    // Logic: If bit for Item I appears in only one column, that cell is solved.
    // ----------------------------------------------------------------------
    if (canvas.rowSweep()) {
      hasChanged = true;
    }

    return hasChanged;
  }

  /**
   * Phase 3.3.4: Cross-Category Cleaning (Vertical Isolation)
   * 
   * Manages the vertical integrity of "Slots." 
   * If two items from different categories are "locked" into the same column,
   * any restriction applied to one must be applied to the other.
   * 
   * @param canvas The logic canvas to sync.
   * @returns true if any bits were pruned.
   */
  private applyCleaning(canvas: LogicCanvas): boolean {
    let hasChanged = false;

    // Pattern A: The Solved Slot Linkage
    // Logic: If Item A and Item B are solved in the SAME column, 
    // their possibility patterns across the board should be identical.
    for (let c = 0; c < canvas.width; c++) {
      const solvedItemsInCol: Array<{ row: number; item: number }> = [];
      
      for (let r = 0; r < canvas.height; r++) {
        const solvedIdx = canvas.getSolvedItemIndex(r, c);
        if (solvedIdx !== -1) {
          solvedItemsInCol.push({ row: r, item: solvedIdx });
        }
      }

      // If we have multiple identities in this slot, they are effectively the same entity.
      if (solvedItemsInCol.length > 1) {
        for (let i = 0; i < solvedItemsInCol.length; i++) {
          for (let j = 0; j < solvedItemsInCol.length; j++) {
            if (i === j) continue;
            const item1 = solvedItemsInCol[i];
            const item2 = solvedItemsInCol[j];

            // Sync: If Item 1 cannot be in Col K, then Item 2 cannot be in Col K.
            // This propagates spatial clues (LeftOf, Adjacent) across solved column mates.
            for (let k = 0; k < canvas.width; k++) {
              if (k === c) continue;
              if (!canvas.isPossible(item1.row, k, item1.item)) {
                if (canvas.prune(item2.row, k, item2.item)) hasChanged = true;
              }
              if (!canvas.isPossible(item2.row, k, item2.item)) {
                if (canvas.prune(item1.row, k, item1.item)) hasChanged = true;
              }
            }
          }
        }
      }
    }

    return hasChanged;
  }
}
