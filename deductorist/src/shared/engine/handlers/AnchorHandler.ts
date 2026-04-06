import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.6: ANCHOR Logic Handler
 * 
 * An ANCHOR clue effectively states: "This item definitively belongs in this specific column."
 * It forces the specified item index's bit to be the ONLY allowed possibility in that cell.
 * 
 * @param clue The ANCHOR clue. params[0].row = Category, params[0].item = Item Index.
 *             clue.targetCol = The global column constraint.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleAnchor(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.params.length < 1 || clue.targetCol === undefined) return false;

  const targetCategory = clue.params[0].row;
  const targetItem = clue.params[0].item;
  let hasChanged = false;

  // We isolate this specific item at the specific column
  if (canvas.isolateItem(targetCategory, clue.targetCol, targetItem)) {
    hasChanged = true;
  }

  // Row Cleansing: Prune this item from all other columns in this category
  for (let c = 0; c < canvas.width; c++) {
    if (c !== clue.targetCol) {
      if (canvas.prune(targetCategory, c, targetItem)) hasChanged = true;
    }
  }

  return hasChanged;
}
