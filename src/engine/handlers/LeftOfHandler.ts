import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.4: LEFT_OF Logic Handler
 * 
 * A LEFT_OF(A, B) ensures that A is immediately to the left of B:
 * Col(B) = Col(A) + 1.
 *
 * @param clue The LEFT_OF clue to process. params[0]=A, params[1]=B.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleLeftOf(clue: ActiveClue, canvas: LogicCanvas): boolean {
    if (clue.params.length < 2) return false;

    const itemA = clue.params[0];
    const itemB = clue.params[1];
    let hasChanged = false;

    // v7.0: a is Left Of b (cA < cB)
    
    // 1. Find min possible column for A
    let minColA = -1;
    for (let c = 0; c < canvas.width; c++) {
      if (canvas.isPossible(itemA.row, c, itemA.item)) {
        minColA = c;
        break;
      }
    }

    // 2. Find max possible column for B
    let maxColB = -1;
    for (let c = canvas.width - 1; c >= 0; c--) {
      if (canvas.isPossible(itemB.row, c, itemB.item)) {
        maxColB = c;
        break;
      }
    }

    if (minColA === -1 || maxColB === -1) return false;

    // ----------------------------------------------------------------------
    // v7.0: Shifts relative boundaries
    // ----------------------------------------------------------------------
    
    // b is pruned from columns <= minColA (Because b must be to the right of A's HOME)
    for (let c = 0; c <= minColA; c++) {
      if (canvas.prune(itemB.row, c, itemB.item)) hasChanged = true;
    }

    // a is pruned from columns >= maxColB (Because a must be to the left of B's HOME)
    for (let c = maxColB; c < canvas.width; c++) {
      if (canvas.prune(itemA.row, c, itemA.item)) hasChanged = true;
    }

    return hasChanged;
}
