import { LogicCanvas } from './LogicCanvas';
import { handleVerticalPair } from './handlers/VerticalPairHandler';
import { handleVerticalNot } from './handlers/VerticalNotHandler';
import { handleVerticalTrio } from './handlers/VerticalTrioHandler';
import { handleGappedNotMiddle } from './handlers/GappedNotMiddleHandler';
import { handleVerticalDisjunctiveXor } from './handlers/VerticalDisjunctiveXorHandler';
import { handleSequenceThree } from './handlers/SequenceThreeHandler';
import type { CategoryIndex, ItemIndex } from '../types';

/**
 * Result of a solver execution.
 */
export const SolverResult = {
  SOLVED: 'SOLVED',
  AMBIGUOUS: 'AMBIGUOUS',
  CONTRADICTION: 'CONTRADICTION',
} as const;

export type SolverResult = (typeof SolverResult)[keyof typeof SolverResult];

/**
 * Represents a hydrated clue targeted at specific items.
 */
export interface ActiveClue {
  type: string;
  targets: {
    row: CategoryIndex;
    item: ItemIndex;
  }[];
}

/**
 * Phase 3.2.2: Fixed-Point Iteration (The Engine Loop)
 *
 * The Solver coordinates the LogicCanvas and the set of Active Clues.
 * It simulates human deduction by repeatedly passing through all clues
 * until no further information can be pruned (a "Fixed Point" is reached).
 */
export class Solver {
  private readonly MAX_ITERATIONS = 100; // Performance Circuit Breaker

  /**
   * Solves the given puzzle state using recursive fixed-point iteration.
   * @param clues The set of hydrated clues to apply.
   * @param canvas The logic canvas representing the current superposition of truths.
   * @returns The final verdict of the solver.
   */
  public solve(clues: ActiveClue[], canvas: LogicCanvas): SolverResult {
    let hasChanged = true;
    let iterationCount = 0;

    // The Deduction Cycle: Continues until the matrix reaches a Fixed Point.
    while (hasChanged && iterationCount < this.MAX_ITERATIONS) {
      hasChanged = false;
      iterationCount++;

      // 1. External Clue Pass
      // Dispatch every clue to its rule handler.
      for (const clue of clues) {
        if (this.applyRule(clue, canvas)) {
          hasChanged = true;
        }
      }

      // 2. Internal Inference Pass (Grid Constraints)
      // Handles logical constraints like Naked Singles and Hidden Singles.
      if (this.applyInferences(canvas)) {
        hasChanged = true;
      }

      // 3. Early Exit on Contradiction
      // If any cell becomes empty, the current state is logically impossible.
      if (canvas.hasAnyInvalidCells()) {
        return SolverResult.CONTRADICTION;
      }
    }

    // 4. Final Verdict
    // If the loop stabilizes, we check if we've reached a unique solution.
    return canvas.isFullySolved() ? SolverResult.SOLVED : SolverResult.AMBIGUOUS;
  }

  /**
   * Central dispatcher for individual clue rules.
   * To be populated with handlers in Phase 3.2.3.
   * @returns true if at least one bit was pruned.
   */
  private applyRule(clue: ActiveClue, canvas: LogicCanvas): boolean {
    // Dispatch logic based on clue type.
    // Specific handlers like VERTICAL_NOT and GAPPED_EXCLUSION go here.
    switch (clue.type) {
      case 'VERTICAL_PAIR':
        return handleVerticalPair(clue, canvas);
      case 'VERTICAL_NOT':
        return handleVerticalNot(clue, canvas);
      case 'VERTICAL_TRIO':
        return handleVerticalTrio(clue, canvas);
      case 'GAPPED_EXCLUSION':
        return handleGappedNotMiddle(clue, canvas);
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return handleVerticalDisjunctiveXor(clue, canvas);
      case 'SEQUENCE_THREE':
        return handleSequenceThree(clue, canvas);
      default:
        return false;
    }
  }

  /**
   * Applies global grid inferences (Naked Singles, Hidden Singles, etc.).
   * To be populated in Phase 3.2.4.
   * @returns true if at least one bit was pruned.
   */
  private applyInferences(canvas: LogicCanvas): boolean {
    // Implementation coming in Phase 3.2.4
    return false;
  }
}
