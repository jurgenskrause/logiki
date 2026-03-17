/**
 * Phase 3.1.2: Rule Template Definition — The Mathematical Grammar
 *
 * Pure mathematical descriptor functions. Each function operates ONLY on the
 * row (r) and column (c) properties of the Slot objects passed to them.
 * These are positional truths — no items, no categories, no game state.
 */

import type { Slot } from './CoordinateSpace';

// ---------------------------------------------------------------------------
// 1. IS_ADJACENT(slotA, slotB)
//    |cA - cB| = 1
//    True when two slots are in neighbouring columns (any rows).
// ---------------------------------------------------------------------------
export function IS_ADJACENT(slotA: Slot, slotB: Slot): boolean {
  return Math.abs(slotA.c - slotB.c) === 1;
}

// ---------------------------------------------------------------------------
// 2. IS_VERTICAL(slotA, slotB)
//    cA = cB  AND  rA ≠ rB
//    True when two slots share the same column but are in different rows.
// ---------------------------------------------------------------------------
export function IS_VERTICAL(slotA: Slot, slotB: Slot): boolean {
  return slotA.c === slotB.c && slotA.r !== slotB.r;
}

// ---------------------------------------------------------------------------
// 3. IS_LEFT_OF(slotA, slotB)
//    cA < cB
//    True when slotA is strictly to the left of slotB.
// ---------------------------------------------------------------------------
export function IS_LEFT_OF(slotA: Slot, slotB: Slot): boolean {
  return slotA.c < slotB.c;
}

// ---------------------------------------------------------------------------
// 4. IS_SEQUENCE_THREE(slotA, slotB, slotC)
//    |cA - cB| = 1  AND  |cB - cC| = 1
//    AND  (cA < cB < cC  OR  cC < cB < cA)
//
//    True when B is the centre of a contiguous horizontal run A–B–C.
//    The run may be ordered left-to-right OR right-to-left.
// ---------------------------------------------------------------------------
export function IS_SEQUENCE_THREE(slotA: Slot, slotB: Slot, slotC: Slot): boolean {
  const abAdjacent = Math.abs(slotA.c - slotB.c) === 1;
  const bcAdjacent = Math.abs(slotB.c - slotC.c) === 1;
  if (!abAdjacent || !bcAdjacent) return false;

  const leftToRight = slotA.c < slotB.c && slotB.c < slotC.c;
  const rightToLeft = slotC.c < slotB.c && slotB.c < slotA.c;
  return leftToRight || rightToLeft;
}

// ---------------------------------------------------------------------------
// 5. IS_GAPPED_EXCLUSION(slotA, slotC, slotB)
//    |cA - cC| = 2  AND  cB = (cA + cC) / 2
//
//    True when A and C are exactly two columns apart and B is the unique
//    middle column between them.  rB is unconstrained — B can be any row.
//
//    Clue intent (applied later during hydration):
//      "Item A and Item C have exactly one column between them,
//       and Item B is NOT placed in that middle column."
// ---------------------------------------------------------------------------
export function IS_GAPPED_EXCLUSION(slotA: Slot, slotC: Slot, slotB: Slot): boolean {
  if (Math.abs(slotA.c - slotC.c) !== 2) return false;
  const midCol = (slotA.c + slotC.c) / 2;
  return slotB.c === midCol;
}
