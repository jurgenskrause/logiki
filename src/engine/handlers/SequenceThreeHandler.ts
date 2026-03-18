import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.6: SEQUENCE_THREE Logic Handler
 * 
 * A SEQUENCE_THREE(A, B, C) ensures that Col(B) is the arithmetic mean of Col(A) and Col(C):
 * |Col(A) - Col(B)| = 1, |Col(C) - Col(B)| = 1, |Col(A) - Col(C)| = 2
 * The sequence is reversible: (A, B, C) or (C, B, A). Item B is always the pivot.
 *
 * @param clue The SEQUENCE_THREE clue to process. 
 *             targets[0]=A (flank), targets[1]=B (pivot), targets[2]=C (flank).
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleSequenceThree(clue: ActiveClue, canvas: LogicCanvas): boolean {
    if (clue.targets.length < 3) return false;

    const itemA = clue.targets[0];
    const itemB = clue.targets[1];
    const itemC = clue.targets[2];
    let hasChanged = false;

    // ----------------------------------------------------------------------
    // Pattern A: Static Boundary Pruning for B
    // ----------------------------------------------------------------------
    // B must have a neighbor on both sides, so it cannot be in col 0 or N-1.
    if (canvas.prune(itemB.row, 0, itemB.item)) hasChanged = true;
    if (canvas.prune(itemB.row, canvas.width - 1, itemB.item)) hasChanged = true;

    for (let i = 0; i < canvas.width; i++) {
        const possibleA = canvas.isPossible(itemA.row, i, itemA.item);
        const possibleB = canvas.isPossible(itemB.row, i, itemB.item);
        const possibleC = canvas.isPossible(itemC.row, i, itemC.item);

        // ----------------------------------------------------------------------
        // Pattern B & C: Pivot Viability
        // ----------------------------------------------------------------------
        // B is only possible at i if (A at i-1 AND C at i+1) OR (C at i-1 AND A at i+1)
        if (possibleB) {
            const validLeft = (i - 1 >= 0 && i + 1 < canvas.width) && 
                              ((canvas.isPossible(itemA.row, i - 1, itemA.item) && canvas.isPossible(itemC.row, i + 1, itemC.item)) ||
                               (canvas.isPossible(itemC.row, i - 1, itemC.item) && canvas.isPossible(itemA.row, i + 1, itemA.item)));
            
            if (!validLeft) {
                if (canvas.prune(itemB.row, i, itemB.item)) hasChanged = true;
            }
        }

        // ----------------------------------------------------------------------
        // Pattern E: Flank Viability
        // ----------------------------------------------------------------------
        // A is only possible at i if B is at i+1 AND C at i+2, OR B is at i-1 AND C at i-2
        if (possibleA) {
            const validRightSeq = (i + 2 < canvas.width) && 
                                  canvas.isPossible(itemB.row, i + 1, itemB.item) && 
                                  canvas.isPossible(itemC.row, i + 2, itemC.item);
            const validLeftSeq = (i - 2 >= 0) && 
                                 canvas.isPossible(itemB.row, i - 1, itemB.item) && 
                                 canvas.isPossible(itemC.row, i - 2, itemC.item);
            
            if (!validRightSeq && !validLeftSeq) {
                if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
            }
        }

        // C is only possible at i if B is at i+1 AND A at i+2, OR B is at i-1 AND A at i-2
        if (possibleC) {
             const validRightSeq = (i + 2 < canvas.width) && 
                                   canvas.isPossible(itemB.row, i + 1, itemB.item) && 
                                   canvas.isPossible(itemA.row, i + 2, itemA.item);
             const validLeftSeq = (i - 2 >= 0) && 
                                  canvas.isPossible(itemB.row, i - 1, itemB.item) && 
                                  canvas.isPossible(itemA.row, i - 2, itemA.item);
             
             if (!validRightSeq && !validLeftSeq) {
                 if (canvas.prune(itemC.row, i, itemC.item)) hasChanged = true;
             }
        }

        // ----------------------------------------------------------------------
        // Pattern D: Anchor Propagation / Flank Restrictions
        // ----------------------------------------------------------------------
        // If A is solved at i, B must be exactly 1 away
        if (canvas.isItemSolvedAt(itemA.row, i, itemA.item)) {
            // Prune B from anywhere that is not distance 1
            for (let bCol = 0; bCol < canvas.width; bCol++) {
                if (Math.abs(bCol - i) !== 1) {
                    if (canvas.prune(itemB.row, bCol, itemB.item)) hasChanged = true;
                }
            }
            // Strict Linkage: If A is on an edge, B is forced, and C is forced.
            if (i === 0) {
                if (canvas.isolateItem(itemB.row, 1, itemB.item)) hasChanged = true;
                if (canvas.isolateItem(itemC.row, 2, itemC.item)) hasChanged = true;
            } else if (i === canvas.width - 1) {
                if (canvas.isolateItem(itemB.row, canvas.width - 2, itemB.item)) hasChanged = true;
                if (canvas.isolateItem(itemC.row, canvas.width - 3, itemC.item)) hasChanged = true;
            }
        }

        // If C is solved at i, B must be exactly 1 away
        if (canvas.isItemSolvedAt(itemC.row, i, itemC.item)) {
            for (let bCol = 0; bCol < canvas.width; bCol++) {
                if (Math.abs(bCol - i) !== 1) {
                    if (canvas.prune(itemB.row, bCol, itemB.item)) hasChanged = true;
                }
            }
            // Strict Linkage: If C is on an edge, B is forced, and A is forced.
            if (i === 0) {
                if (canvas.isolateItem(itemB.row, 1, itemB.item)) hasChanged = true;
                if (canvas.isolateItem(itemA.row, 2, itemA.item)) hasChanged = true;
            } else if (i === canvas.width - 1) {
                if (canvas.isolateItem(itemB.row, canvas.width - 2, itemB.item)) hasChanged = true;
                if (canvas.isolateItem(itemA.row, canvas.width - 3, itemA.item)) hasChanged = true;
            }
        }

        // If B is solved at i, A and C must be exactly 1 away
        if (canvas.isItemSolvedAt(itemB.row, i, itemB.item)) {
             for (let colA = 0; colA < canvas.width; colA++) {
                  if (Math.abs(colA - i) !== 1) {
                       if (canvas.prune(itemA.row, colA, itemA.item)) hasChanged = true;
                  }
             }
             for (let colC = 0; colC < canvas.width; colC++) {
                  if (Math.abs(colC - i) !== 1) {
                       if (canvas.prune(itemC.row, colC, itemC.item)) hasChanged = true;
                  }
             }
        }
    }


    return hasChanged;
}
