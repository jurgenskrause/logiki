import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.5: VERTICAL_DISJUNCTIVE_XOR Logic Handler
 * 
 * A VERTICAL_DISJUNCTIVE_EXCLUSION(A, B, C) ensures that Col(A) = Col(B) XOR Col(A) = Col(C).
 * Item A must share a column with exactly one of the target items (B or C).
 * Consequence: B and C can never occupy the same column.
 *
 * @param clue The VERTICAL_DISJUNCTIVE_EXCLUSION clue to process.
 *             targets[0]=A, targets[1]=B, targets[2]=C.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleVerticalDisjunctiveXor(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.targets.length < 3) return false;

  const itemA = clue.targets[0];
  const itemB = clue.targets[1];
  const itemC = clue.targets[2];
  let hasChanged = false;

  for (let col = 0; col < canvas.width; col++) {
    const possibleA = canvas.isPossible(itemA.row, col, itemA.item);
    const possibleB = canvas.isPossible(itemB.row, col, itemB.item);
    const possibleC = canvas.isPossible(itemC.row, col, itemC.item);

    const aSolved = canvas.isItemSolvedAt(itemA.row, col, itemA.item);
    const bSolved = canvas.isItemSolvedAt(itemB.row, col, itemB.item);
    const cSolved = canvas.isItemSolvedAt(itemC.row, col, itemC.item);

    // ----------------------------------------------------------------------
    // Pattern A: The Double Negative (Starvation)
    // ----------------------------------------------------------------------
    // If neither B nor C is possible in this column, A cannot be here.
    if (!possibleB && !possibleC) {
      if (canvas.prune(itemA.row, col, itemA.item)) hasChanged = true;
    }

    // ----------------------------------------------------------------------
    // Pattern B: The "Elimination" Trigger (Forced Pairing)
    // ----------------------------------------------------------------------
    if (possibleA) {
      // If A is solved here, and B is impossible, C MUST be here.
      if (aSolved && !possibleB) {
        if (canvas.isolateItem(itemC.row, col, itemC.item)) hasChanged = true;
      }
      
      // If A is solved here, and C is impossible, B MUST be here.
      if (aSolved && !possibleC) {
        if (canvas.isolateItem(itemB.row, col, itemB.item)) hasChanged = true;
      }
    }

    // ----------------------------------------------------------------------
    // Pattern C: The "Solved" Trigger (Exclusion)
    // ----------------------------------------------------------------------
    // If the A-B pair is successfully anchored here, XOR is met. C cannot be here.
    if (aSolved && bSolved) {
      if (canvas.prune(itemC.row, col, itemC.item)) hasChanged = true;
    }

    // If the A-C pair is successfully anchored here, XOR is met. B cannot be here.
    if (aSolved && cSolved) {
      if (canvas.prune(itemB.row, col, itemB.item)) hasChanged = true;
    }

    // ----------------------------------------------------------------------
    // Pattern D: The Inherent VERTICAL_NOT (B != C)
    // ----------------------------------------------------------------------
    // Because A cannot be with both B and C, B and C are mutually exclusive grid-wide.
    // If B is solved here, prune C.
    if (bSolved) {
      if (canvas.prune(itemC.row, col, itemC.item)) hasChanged = true;
    }

    // If C is solved here, prune B.
    if (cSolved) {
      if (canvas.prune(itemB.row, col, itemB.item)) hasChanged = true;
    }
  }

  return hasChanged;
}
