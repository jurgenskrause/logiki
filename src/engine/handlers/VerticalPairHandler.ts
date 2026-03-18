import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.1: VERTICAL_PAIR Logic Handler
 * 
 * A VERTICAL_PAIR(A, B) ensures that Col(A) = Col(B).
 * This handler synchronizes the availability of Item A and Item B across all columns.
 *
 * @param clue The VERTICAL_PAIR clue to process.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleVerticalPair(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.targets.length < 2) return false;

  const itemA = clue.targets[0];
  const itemB = clue.targets[1];
  let hasChanged = false;

  for (let col = 0; col < canvas.width; col++) {
    const canBeA = canvas.isPossible(itemA.row, col, itemA.item);
    const canBeB = canvas.isPossible(itemB.row, col, itemB.item);

    // 1. Column Synchronization (Pattern A & C)
    // If Item A cannot be in this column, Item B cannot be in this column.
    if (!canBeA && canBeB) {
      if (canvas.prune(itemB.row, col, itemB.item)) hasChanged = true;
    }

    // If Item B cannot be in this column, Item A cannot be in this column.
    if (!canBeB && canBeA) {
      if (canvas.prune(itemA.row, col, itemA.item)) hasChanged = true;
    }

    // 2. Found State Propagation (Pattern B)
    // If Item A is definitely located in this column, then Item B must be in this column.
    if (canvas.isItemSolvedAt(itemA.row, col, itemA.item)) {
      // Isolate Item B in this column (prune all other items from this cell).
      if (canvas.isolateItem(itemB.row, col, itemB.item)) hasChanged = true;

      // Clean Row B: Since Item B is now "Found" in this column, prune it from all other columns.
      for (let c = 0; c < canvas.width; c++) {
        if (c !== col) {
          if (canvas.prune(itemB.row, c, itemB.item)) hasChanged = true;
        }
      }
    }

    // Inverse: If Item B is definitely located in this column, then Item A must be in this column.
    if (canvas.isItemSolvedAt(itemB.row, col, itemB.item)) {
      if (canvas.isolateItem(itemA.row, col, itemA.item)) hasChanged = true;

      // Clean Row A: Since Item A is now "Found" in this column, prune it from all other columns.
      for (let c = 0; c < canvas.width; c++) {
        if (c !== col) {
          if (canvas.prune(itemA.row, c, itemA.item)) hasChanged = true;
        }
      }
    }
  }

  return hasChanged;
}
