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
//    |cA - cC| = 2  AND  cB != (cA + cC) / 2
//
//    True when A and C are exactly two columns apart and B is ANY slot 
//    that does NOT sit in the unique middle column between them.
//
//    Clue intent (applied later during hydration):
//      "Item A and Item C have exactly one column between them,
//       and Item B is NOT placed in that middle column."
// ---------------------------------------------------------------------------
export function IS_GAPPED_EXCLUSION(slotA: Slot, slotC: Slot, slotB: Slot): boolean {
  if (Math.abs(slotA.c - slotC.c) !== 2) return false;
  // B cannot be A or C
  if (slotB === slotA || slotB === slotC) return false;
  
  const forbiddenCol = (slotA.c + slotC.c) / 2;
  return slotB.c !== forbiddenCol;
}

// ---------------------------------------------------------------------------
// 8. IS_VERTICAL_NOT(slotA, slotB)
//    cA ≠ cB  AND  rA ≠ rB
//
//    True when two slots are in different columns AND different rows.
//    Same-row exclusion: items in the same row belong to the same category
//    and can never share a column by rule, so such pairs carry zero solver value.
//
//    Clue intent (applied later during hydration):
//      "Item A is NOT in the same column as Item B."
// ---------------------------------------------------------------------------
export function IS_VERTICAL_NOT(slotA: Slot, slotB: Slot): boolean {
  return slotA.r !== slotB.r && slotA.c !== slotB.c;
}


// ---------------------------------------------------------------------------
// 6. IS_VERTICAL_TRIO(slotA, slotB, slotC)
//    cA = cB = cC  AND  rA ≠ rB  AND  rB ≠ rC  AND  rA ≠ rC
//
//    True when all three slots share exactly one column but occupy
//    three distinct rows.
//
//    Clue intent (applied later during hydration):
//      "Item A, Item B, and Item C are all in the same column."
//      Category Rule: A, B, C must belong to different categories.
// ---------------------------------------------------------------------------
export function IS_VERTICAL_TRIO(slotA: Slot, slotB: Slot, slotC: Slot): boolean {
  if (slotA.c !== slotB.c || slotB.c !== slotC.c) return false;
  return slotA.r !== slotB.r && slotB.r !== slotC.r && slotA.r !== slotC.r;
}

// ---------------------------------------------------------------------------
// 7. IS_VERTICAL_DISJUNCTIVE_EXCLUSION(slotA, slotB, slotC)
//    (cA = cB  XOR  cA = cC)  AND  cB ≠ cC  AND  rA ≠ rB  AND  rA ≠ rC
//
//    True when slot A shares a column with exactly one of B or C,
//    and B and C are themselves in different columns.
//
//    Clue intent (applied later during hydration):
//      "Item A is in the same column as Item B or Item C, but not both."
//      Category Rule: A must be from a different category than B and C.
//                     B and C may share a category.
// ---------------------------------------------------------------------------
export function IS_VERTICAL_DISJUNCTIVE_EXCLUSION(slotA: Slot, slotB: Slot, slotC: Slot): boolean {
  if (slotA.r === slotB.r || slotA.r === slotC.r) return false;
  if (slotB.c === slotC.c) return false; // B and C must be in different columns

  const aMatchesB = slotA.c === slotB.c;
  const aMatchesC = slotA.c === slotC.c;
  // XOR: exactly one must be true
  return aMatchesB !== aMatchesC;
}
