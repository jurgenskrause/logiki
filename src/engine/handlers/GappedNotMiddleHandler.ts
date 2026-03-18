import { LogicCanvas } from '../LogicCanvas';
import type { ActiveClue } from '../Solver';

/**
 * Phase 3.2.3.5: GAPPED_NOT_MIDDLE Logic Handler
 * 
 * A GAPPED_EXCLUSION(A, C, B) ensures two things:
 * 1. Gap: Items A and C are separated by exactly one column (|Col(A) - Col(C)| = 2).
 * 2. Exclusion: Item B is explicitly forbidden from occupying the column between them.
 * Note: The relationship between A and C is reversible.
 *
 * @param clue The GAPPED_EXCLUSION clue to process. 
 *             By convention, targets[0]=A, targets[1]=C (the bounds), and targets[2]=B (the exclusion).
 * @param canvas The logic canvas to prune.
 * @returns true if any bits were pruned.
 */
export function handleGappedNotMiddle(clue: ActiveClue, canvas: LogicCanvas): boolean {
  if (clue.targets.length < 3) return false;

  const itemA = clue.targets[0];
  const itemC = clue.targets[1]; // Target 1 is the other bound (C)
  const itemB = clue.targets[2]; // Target 2 is the excluded middle (B)
  let hasChanged = false;

  for (let i = 0; i < canvas.width; i++) {
    const possibleA = canvas.isPossible(itemA.row, i, itemA.item);
    const possibleC = canvas.isPossible(itemC.row, i, itemC.item);

    // ----------------------------------------------------------------------
    // Pattern A: The Gap Constraint (A and C Linkage)
    // ----------------------------------------------------------------------
    
    // Check A's required C anchors
    if (possibleA) {
      const cAtRight = (i + 2 < canvas.width) && canvas.isPossible(itemC.row, i + 2, itemC.item);
      const cAtLeft = (i - 2 >= 0) && canvas.isPossible(itemC.row, i - 2, itemC.item);
      if (!cAtRight && !cAtLeft) {
        if (canvas.prune(itemA.row, i, itemA.item)) hasChanged = true;
      }
    }

    // Check C's required A anchors
    if (possibleC) {
      const aAtRight = (i + 2 < canvas.width) && canvas.isPossible(itemA.row, i + 2, itemA.item);
      const aAtLeft = (i - 2 >= 0) && canvas.isPossible(itemA.row, i - 2, itemA.item);
      if (!aAtRight && !aAtLeft) {
        if (canvas.prune(itemC.row, i, itemC.item)) hasChanged = true;
      }
    }

    // ----------------------------------------------------------------------
    // Pattern C: The Ambiguous Middle (Superposition Pruning)
    // ----------------------------------------------------------------------
    // If Col(i) and Col(i+2) are the *only* valid locations left for A and C,
    // they are locked into this span. B cannot be in the middle (Col i+1).
    if (i + 2 < canvas.width) {
      const aOptions = canvas.getRemainingColumns(itemA.row, itemA.item);
      const cOptions = canvas.getRemainingColumns(itemC.row, itemC.item);
      
      const pairLocked = 
        aOptions.every(col => col === i || col === i + 2) &&
        cOptions.every(col => col === i || col === i + 2) &&
        aOptions.length > 0 && cOptions.length > 0;

      if (pairLocked) {
        // The pair bridges i+1. B cannot be here.
        if (canvas.prune(itemB.row, i + 1, itemB.item)) hasChanged = true;
      }
    }

    // ----------------------------------------------------------------------
    // Pattern D: The Middle Obstruction (B repels the Pair)
    // ----------------------------------------------------------------------
    // If B is solved at Col(i), A and C cannot occupy i-1 and i+1 simultaneously.
    if (canvas.isItemSolvedAt(itemB.row, i, itemB.item)) {
      if (i - 1 >= 0 && i + 1 < canvas.width) {
        // If A is solved at i-1, prune C from i+1
        if (canvas.isItemSolvedAt(itemA.row, i - 1, itemA.item)) {
          if (canvas.prune(itemC.row, i + 1, itemC.item)) hasChanged = true;
        }
        // If C is solved at i-1, prune A from i+1
        if (canvas.isItemSolvedAt(itemC.row, i - 1, itemC.item)) {
          if (canvas.prune(itemA.row, i + 1, itemA.item)) hasChanged = true;
        }
      }
    }
  }

  return hasChanged;
}
