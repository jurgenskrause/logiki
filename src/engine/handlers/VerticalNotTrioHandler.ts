import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3: VERTICAL_NOT_TRIO Logic Handler
 *
 * A VERTICAL_NOT_TRIO(A, B, C) enforces:
 *   - Col(A) = Col(B)  [A and B share a column — a positive anchor]
 *   - Col(C) ≠ Col(A)  [C is forbidden from the A/B column]
 *
 * This is a hybrid constraint: it is both a vertical pair link (A↔B)
 * and a vertical exclusion (A/B ⊕ C).
 *
 * @param clue The VERTICAL_NOT_TRIO clue. params[0]=A, params[1]=B, params[2]=C.
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleVerticalNotTrio(clue: ActiveClue, canvas: LogicCanvas): boolean {
    if (clue.params.length < 3) return false;

    const itemA = clue.params[0];
    const itemB = clue.params[1];
    const itemC = clue.params[2];
    let hasChanged = false;

    for (let i = 0; i < canvas.width; i++) {

        // ----------------------------------------------------------------------
        // Pattern A: Vertical Anchor — Synchronize A and B
        // (Identical to VERTICAL_PAIR logic)
        // ----------------------------------------------------------------------
        // If A is impossible at column i, B must also be impossible there.
        if (!canvas.isPossible(itemA.row, i, itemA.item)) {
            if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
        }
        // And symmetrically: if B is impossible, prune A.
        if (!canvas.isPossible(itemB.row, i, itemB.item)) {
            if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
        }

        // ----------------------------------------------------------------------
        // Pattern B: Direct Exclusion — A/B solved forces C out
        // If A is solved at column i, C cannot be there.
        // ----------------------------------------------------------------------
        if (canvas.isItemSolvedAt(itemA.row, i, itemA.item) ||
            canvas.isItemSolvedAt(itemB.row, i, itemB.item)) {
            if (canvas.prune(itemC.row, i, itemC.item)) hasChanged = true;
        }

        // ----------------------------------------------------------------------
        // Pattern C: Inverse Exclusion — C solved forces A and B out
        // If C is solved at column i, neither A nor B can be there.
        // ----------------------------------------------------------------------
        if (canvas.isItemSolvedAt(itemC.row, i, itemC.item)) {
            if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
            if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
        }

        // ----------------------------------------------------------------------
        // Pattern D: Shadow Pruning — Pre-emptive exclusion (column collapse)
        // If col i is the ONLY remaining column for C, then A and B are
        // pre-emptively pruned from col i (they can't share with C).
        // Conversely, if col i is the ONLY remaining column for the A-B pair,
        // C is pre-emptively pruned from that column.
        // ----------------------------------------------------------------------

        // Count possible columns for C to detect "last stand"
        let cPossibleCount = 0;
        for (let j = 0; j < canvas.width; j++) {
            if (canvas.isPossible(itemC.row, j, itemC.item)) cPossibleCount++;
        }
        if (cPossibleCount === 1 && canvas.isPossible(itemC.row, i, itemC.item)) {
            // Col i is C's only remaining column — purge A and B from it.
            if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
            if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
        }

        // Count possible columns for A (A and B are linked, so same count)
        let aPossibleCount = 0;
        for (let j = 0; j < canvas.width; j++) {
            if (canvas.isPossible(itemA.row, j, itemA.item)) aPossibleCount++;
        }
        if (aPossibleCount === 1 && canvas.isPossible(itemA.row, i, itemA.item)) {
            // Col i is A/B's only remaining column — purge C from it.
            if (canvas.prune(itemC.row, i, itemC.item)) hasChanged = true;
        }
    }

    return hasChanged;
}
