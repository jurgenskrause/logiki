import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.3: VERTICAL_TRIO Logic Handler
 * 
 * A VERTICAL_TRIO(A, B, C) ensures that Col(A) = Col(B) = Col(C).
 * This handler synchronizes the availability of three items across all columns.
 *
 * @param clue The VERTICAL_TRIO clue to process.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleVerticalTrio(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.params.length < 3) return false;

  const itemA = clue.params[0];
  const itemB = clue.params[1];
  const itemC = clue.params[2];
  let hasChanged = false;

  for (let col = 0; col < canvas.width; col++) {
    const possibleA = canvas.isPossible(itemA.row, col, itemA.item);
    const possibleB = canvas.isPossible(itemB.row, col, itemB.item);
    const possibleC = canvas.isPossible(itemC.row, col, itemC.item);

    // Pattern A: Triple Synchronization (The "All-or-Nothing" Rule)
    // If any one item is impossible in this column, all three are impossible.
    if (!possibleA || !possibleB || !possibleC) {
      if (canvas.prune(itemA.row, col, itemA.item)) hasChanged = true;
      if (canvas.prune(itemB.row, col, itemB.item)) hasChanged = true;
      if (canvas.prune(itemC.row, col, itemC.item)) hasChanged = true;
    }

    // Pattern B & C: Anchor Propagation and Row Cleansing
    // If any one of the three items is definitely solved in this column, 
    // force the other two into this column and prune them from all other columns.
    const items = [itemA, itemB, itemC];
    for (let i = 0; i < items.length; i++) {
      if (canvas.isItemSolvedAt(items[i].row, col, items[i].item)) {
        // Fix the other two items in this column
        const others = items.filter((_, idx) => idx !== i);
        others.forEach(other => {
          // Isolate Item in this column
          if (canvas.isolateItem(other.row, col, other.item)) {
            hasChanged = true;
          }

          // Row Cleansing: Prune this item from all other columns
          for (let c = 0; c < canvas.width; c++) {
            if (c !== col) {
              if (canvas.prune(other.row, c, other.item)) hasChanged = true;
            }
          }
        });

        // Also ensure the solved item is pruned from other columns
        for (let c = 0; c < canvas.width; c++) {
          if (c !== col) {
            if (canvas.prune(items[i].row, c, items[i].item)) hasChanged = true;
          }
        }
      }
    }
  }

  return hasChanged;
}
