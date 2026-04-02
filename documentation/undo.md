# Undo & Revert System — Technical Documentation

## Overview

The undo/revert system in Logiki is built on a **Linear History Model** using full atomic snapshots. This provides a clean mechanism to revert mistakes, natively bundles auto-deduction cascades into single undo steps, and robustly handles contradiction recovery.

Both systems live inside `GameState.ts` and are orchestrated by `GamePage.tsx`.

---

## Data Structures

### GameSnapshot
Every history entry is a complete deep copy of the mutable board state:

```typescript
interface GameSnapshot {
  grid: Uint16Array;        // Bitmask of remaining possibilities per cell
  confirmed: Uint8Array;    // Whether each cell is locked in
  noAutoSolve: Uint8Array;  // Flags to prevent immediate re-solving on manual edits
}
```
*Note:* At ~144 bytes per snapshot (for a 6×6 grid), storing hundreds of moves takes negligible memory.

### History Tiers & Variables

```typescript
_history: GameSnapshot[]   // Linear array of atomic equilibrium states
_cursor: number            // Points to the currently active snapshot in history
_lastGoodIndex: number     // Pointer to the last known contradiction-free snapshot

_isError: boolean          // Whether the board is currently in contradiction
```

---

## Mechanism 1: Undo

### How it works

History snapshots are **not** created midway through an action. Instead, `GamePage` waits until a user's action and its resulting **auto-deduction cascade** completely finish. Once the board reaches equilibrium, it calls `gameState.pushHistory()`.

1. `pushHistory()` truncates any Redo-future (entries above `_cursor`) and pushes the current board state onto `_history`.
2. `undo()` simply decrements the `_cursor` index and deeply loads the snapshot at that index back into the active board state variables.
3. `redo()` simply increments the `_cursor` index and loads the snapshot.

Because history is pushed *after* cascades complete, pressing Undo natively reverts both the cascade deductions and the user's action that triggered them, all in one click.

### Anti-Autosolve System
If an undo brings a cell back to a state where it has only 1 remaining possibility, the cascade engine might immediately "steal" that cell and re-solve it. To prevent this, `noAutoSolve` flags are meticulously cleared on manual interaction but preserved when capturing/loading snapshots, locking the auto-solver out from re-deducing a state the user explicitly requested to return to.

---

## Mechanism 2: Warning System (Instant Revert)

When `warningsEnabled` is `true`, every user action is immediately validated against an internal dry-run before visually applying:

```typescript
// In handleStateChange():
const result = analyzeState(gameState, activeClues);
if (!result.isSolvable) {
  gameState.revertToCurrentCheckpoint(); // Silently reload current cursor state
  triggerRedFlash();                     // Visual feedback (red border flash)
  setHintCount(c => c + 1);
  return;                                // Prevent cascade and history push
}
```

This is a **single-step instant undo/reload**, not the checkpoint system. The user never sees the invalid state on their screen.

---

## Mechanism 3: Restore to Last Valid State (Revert)

### The Flow

```
┌─────────────────────────────────────────────────────────┐
│ User makes move → handleStateChange() → cascade runs    │
│ → runAnalysis() called after equilibrium is reached      │
│                                                          │
│   analyzeState() returns:                                │
│                                                          │
│   ┌─ No contradiction ─────────────────────────────────┐ │
│   │  gameState.pushHistory()    ← history saved        │ │
│   │  gameState.saveGoodState()  ← checkpoint updated   │ │
│   │  setActiveHint(result.hint)                        │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                          │
│   ┌─ Contradiction detected ───────────────────────────┐ │
│   │  gameState.pushHistory()    ← mistake saved        │ │
│   │  gameState.markError()      ← locks checkpoint     │ │
│   │  Show "Restore" hint banner                        │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                          │
│ User clicks "Restore" hint banner:                       │
│   gameState.restoreToLastValid()                         │
│   → move _cursor back to _lastGoodIndex                  │
│   → Load the snapshot into the active grid               │
│   → Trim _history completely of all mistakes above       │
│   → Error state cleared                                  │
└─────────────────────────────────────────────────────────┘
```

### Key Design: `saveGoodState()` vs `markError()`

- `saveGoodState()` is called on **every successful analysis** (no contradiction). It updates `_lastGoodIndex = _cursor`.
- `markError()` is called when a contradiction is detected. **It only fires once** (guarded by `if (!_isError)`). Subsequent bad moves do not overwrite `_lastGoodIndex`.
- Therefore, no matter how many moves a user makes *after* causing a contradiction, `restoreToLastValid()` will instantly jump back through their timeline and erase all bad timelines.

---

## Edge Cases & Known Issues

### 1. Warning system uses filtered clues
**Scenario:** User has binned some clues. Warning system calls `analyzeState()` with only unbinned clues.
**What happens:** If the user bins a critical structural clue, the warning system might flash red on a perfectly legal move because it thinks the board is fully unsolvable without it.
**Severity:** Medium — this is by design (binned = "I am ignoring this"), but could confuse advanced players into thinking they made a logical flaw when they merely hid a constraint.

### 2. Manual Un-Solve (Unconfirm)
**Scenario:** A user clicks a confirmed/solved cell (`gameState.unconfirmCell`). 
**What happens:** The `unconfirmCell` action actively strips the "confirmed" flag and `noAutoSolve` flag, but does *not* recursively restore the pruned bitmasks for all its peer columns.
**Result:** Currently handled cleanly by calling `unconfirmCell` and immediately letting the engine `onStateChange()`. However, advanced un-solving of complex intersecting clues is best done strictly through the `undo()` system to accurately restore peer bitmasks.

---

## Summary Table

| Feature | Mechanism | Triggered By | Scope |
|---------|-----------|-------------|-------|
| Undo | `--_cursor`, load snapshot | Undo button | Single action (user action + full cascade) |
| Redo | `++_cursor`, load snapshot | Not exposed in UI | Single action |
| Warning revert | `revertToCurrentCheckpoint()` | `handleStateChange()` | Silent reload |
| Restore | `restoreToLastValid()`, trim history | "Restore" hint banner | Jump back to last valid checkpoint |
