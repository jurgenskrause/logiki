```typescript
import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.4: ADJACENT Logic Handler
 * 
 * A LEFT_OF(A, B) ensures that A is immediately to the left of B:
 * Col(B) = Col(A) + 1.
 * 
 * @param clue The LEFT_OF clue to process. params[0]=A, params[1]=B.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleAdjacent(clue: ActiveClue, canvas: LogicCanvas): boolean {
    if (clue.params.length < 2) return false;

    const itemA = clue.params[0];
    const itemB = clue.params[1];
    let hasChanged = false;

    for (let i = 0; i < canvas.width; i++) {
        const canA = canvas.isPossible(itemA.row, i, itemA.item);
        const canB = canvas.isPossible(itemB.row, i, itemB.item);

        // ----------------------------------------------------------------------
        // Pattern 1: Shadow Pruning (B's viability depends on A's presence)
        // ----------------------------------------------------------------------
        // If B is in column i, A MUST be possible in either i-1 or i+1.
        if (canB) {
            const neighborLeft = i - 1 >= 0 && canvas.isPossible(itemA.row, i - 1, itemA.item);
            const neighborRight = i + 1 < canvas.width && canvas.isPossible(itemA.row, i + 1, itemA.item);

            if (!neighborLeft && !neighborRight) {
                if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
            }
        }

        // Symmetrical Check: If A is in column i, B MUST be possible in either i-1 or i+1.
        if (canA) {
            const neighborLeft = i - 1 >= 0 && canvas.isPossible(itemB.row, i - 1, itemB.item);
            const neighborRight = i + 1 < canvas.width && canvas.isPossible(itemB.row, i + 1, itemB.item);

            if (!neighborLeft && !neighborRight) {
                if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
            }
        }

        // ----------------------------------------------------------------------
        // Pattern 2: Anchor Propagation (Solved State)
        // ----------------------------------------------------------------------
        // If A is solved at Col i, then B cannot be anywhere except i-1 and i+1.
        if (canvas.isItemSolvedAt(itemA.row, i, itemA.item)) {
            for (let j = 0; j < canvas.width; j++) {
                if (Math.abs(i - j) !== 1) {
                    if (canvas.prune(itemB.row, j, itemB.item)) hasChanged = true;
                }
            }
        }

        // Symmetrical: If B is solved at Col i, then A cannot be anywhere except i-1 and i+1.
        if (canvas.isItemSolvedAt(itemB.row, i, itemB.item)) {
            for (let j = 0; j < canvas.width; j++) {
                if (Math.abs(i - j) !== 1) {
                    if (canvas.prune(itemA.row, j, itemA.item)) hasChanged = true;
                }
            }
        }
    }

    return hasChanged;
}
