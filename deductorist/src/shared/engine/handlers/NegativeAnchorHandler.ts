import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.7: NEGATIVE_ANCHOR Logic Handler
 * 
 * A NEGATIVE_ANCHOR clue effectively states: "This item definitively DOES NOT belong in this specific column."
 * It prunes the specified item index's bit from the designated cell.
 * 
 * @param clue The NEGATIVE_ANCHOR clue. params[0].row = Category, params[0].item = Item Index.
 *             clue.targetCol = The global column constraint.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleNegativeAnchor(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.params.length < 1 || clue.targetCol === undefined) return false;

  const targetCategory = clue.params[0].row;
  const targetItem = clue.params[0].item;

  // Simply prune the item from the specified column
  return canvas.prune(targetCategory, clue.targetCol, targetItem);
}
