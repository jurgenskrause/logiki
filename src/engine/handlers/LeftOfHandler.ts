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

    // ----------------------------------------------------------------------
    // Pattern 1: Boundary Pruning
    // ----------------------------------------------------------------------
    // A cannot be in the last column.
    if (canvas.prune(itemA.row, canvas.width - 1, itemA.item)) hasChanged = true;
    
    // B cannot be in the first column.
    if (canvas.prune(itemB.row, 0, itemB.item)) hasChanged = true;

    for (let i = 0; i < canvas.width; i++) {
        const canA = canvas.isPossible(itemA.row, i, itemA.item);
        const canB = canvas.isPossible(itemB.row, i, itemB.item);

        // ----------------------------------------------------------------------
        // Pattern 2: Shadow Pruning (Forward: A -> B)
        // ----------------------------------------------------------------------
        // If A is in column i, B must be possible in i+1.
        if (canA && i + 1 < canvas.width) {
            if (!canvas.isPossible(itemB.row, i + 1, itemB.item)) {
                if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
            }
        }

        // ----------------------------------------------------------------------
        // Pattern 3: Shadow Pruning (Backward: B -> A)
        // ----------------------------------------------------------------------
        // If B is in column i, A must be possible in i-1.
        if (canB && i - 1 >= 0) {
            if (!canvas.isPossible(itemA.row, i - 1, itemA.item)) {
                if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
            }
        }

        // ----------------------------------------------------------------------
        // Pattern 4: Anchor Propagation (Solved State)
        // ----------------------------------------------------------------------
        // If A is solved at i, B is ABSOLUTELY forced into i+1.
        if (canvas.isItemSolvedAt(itemA.row, i, itemA.item)) {
            if (i + 1 < canvas.width) {
                if (canvas.isolateItem(itemB.row, i + 1, itemB.item)) hasChanged = true;
            }
        }

        // If B is solved at i, A is ABSOLUTELY forced into i-1.
        if (canvas.isItemSolvedAt(itemB.row, i, itemB.item)) {
            if (i - 1 >= 0) {
                if (canvas.isolateItem(itemA.row, i - 1, itemA.item)) hasChanged = true;
            }
        }
    }

    return hasChanged;
}
