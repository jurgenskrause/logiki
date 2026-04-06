import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.2: VERTICAL_NOT Logic Handler
 * 
 * A VERTICAL_NOT(A, B) ensures that Col(A) != Col(B).
 * This handler invalidates a column for one item based on the confirmed presence of the other.
 *
 * @param clue The VERTICAL_NOT clue to process.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleVerticalNot(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.params.length < 2) return false;

  const itemA = clue.params[0];
  const itemB = clue.params[1];
  let hasChanged = false;

  // Check every column for a "Found" state
  for (let col = 0; col < canvas.width; col++) {
    
    // Pattern A: If Item A is solved here, Item B cannot be here
    if (canvas.isItemSolvedAt(itemA.row, col, itemA.item)) {
      if (canvas.prune(itemB.row, col, itemB.item)) {
        hasChanged = true;
      }
    }

    // Pattern B: If Item B is solved here, Item A cannot be here
    if (canvas.isItemSolvedAt(itemB.row, col, itemB.item)) {
      if (canvas.prune(itemA.row, col, itemA.item)) {
        hasChanged = true;
      }
    }
  }

  return hasChanged;
}
