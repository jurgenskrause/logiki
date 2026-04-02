import type { CategoryIndex, ColumnIndex, Bitmask, ItemIndex, MutationTrace } from '../types';

/**
 * GameSnapshot — a complete deep copy of the mutable board state.
 * At ~144 bytes per snapshot (for a 6×6 grid), storing hundreds is negligible.
 */
interface GameSnapshot {
  grid: Uint16Array;
  confirmed: Uint8Array;
  noAutoSolve: Uint8Array;
}

/**
 * GameState Class
 * 
 * Uses a linear history model:
 * - _history[] stores post-cascade equilibrium snapshots
 * - _cursor points to "where we are" in history
 * - _lastGoodIndex marks the last known contradiction-free state
 * 
 * Undo/redo simply move _cursor and load the snapshot.
 * Restore jumps cursor to _lastGoodIndex and trims history above.
 */
export class GameState {
  private _rows: number;
  private _cols: number;
  private _grid: Uint16Array;
  private _confirmed: Uint8Array;
  private _solution: Uint8Array;
  private _noAutoSolve: Uint8Array;

  // Linear history
  private _history: GameSnapshot[] = [];
  private _cursor: number = -1;
  private _lastGoodIndex: number = -1;

  // Error State
  private _isError: boolean = false;

  constructor(rows: CategoryIndex, cols: ColumnIndex) {
    this._rows = rows;
    this._cols = cols;
    this._grid = new Uint16Array(rows * cols);
    this._confirmed = new Uint8Array(rows * cols);
    this._solution = new Uint8Array(rows * cols);
    this._noAutoSolve = new Uint8Array(rows * cols);
    const initialMask: Bitmask = (1 << cols) - 1;
    this._grid.fill(initialMask);
    this._confirmed.fill(0);
    this._noAutoSolve.fill(0);
  }

  public setSolution(data: Uint8Array): void {
    if (data.length !== this._rows * this._cols) {
      throw new Error(`Invalid solution length`);
    }
    this._solution = new Uint8Array(data);
  }

  private _getIndex(row: CategoryIndex, col: ColumnIndex): number {
    return row * this._cols + col;
  }

  private _isValid(row: CategoryIndex, col: ColumnIndex, itemIndex?: ItemIndex): boolean {
    const rowOk = row >= 0 && row < this._rows;
    const colOk = col >= 0 && col < this._cols;
    const itemOk = itemIndex === undefined || (itemIndex >= 0 && itemIndex < this._cols);
    return rowOk && colOk && itemOk;
  }

  // ─── Snapshot Helpers ──────────────────────────────────────────────────────

  private _createSnapshot(): GameSnapshot {
    return {
      grid: new Uint16Array(this._grid),
      confirmed: new Uint8Array(this._confirmed),
      noAutoSolve: new Uint8Array(this._noAutoSolve)
    };
  }

  private _loadSnapshot(snapshot: GameSnapshot): void {
    this._grid = new Uint16Array(snapshot.grid);
    this._confirmed = new Uint8Array(snapshot.confirmed);
    this._noAutoSolve = new Uint8Array(snapshot.noAutoSolve);
  }

  // ─── History System ────────────────────────────────────────────────────────

  /**
   * Captures the current board state as a new history entry.
   * Called AFTER user action + cascade have fully completed (equilibrium state).
   * Trims any redo history above the cursor.
   */
  public pushHistory(): void {
    // Trim redo entries above cursor
    this._history = this._history.slice(0, this._cursor + 1);
    // Push current state
    this._history.push(this._createSnapshot());
    this._cursor = this._history.length - 1;
    // Safety: if lastGoodIndex was in trimmed range, clamp it
    if (this._lastGoodIndex >= this._history.length) {
      this._lastGoodIndex = this._cursor;
    }
  }

  /**
   * Step back one entry in history. Returns true if successful.
   * Each entry represents one complete user action + cascade, so this
   * atomically undoes everything.
   */
  public undo(): boolean {
    if (this._cursor <= 0) return false;
    this._cursor--;
    this._loadSnapshot(this._history[this._cursor]);
    this._isError = false;
    return true;
  }

  /**
   * Step forward one entry in history. Returns true if successful.
   */
  public redo(): boolean {
    if (this._cursor >= this._history.length - 1) return false;
    this._cursor++;
    this._loadSnapshot(this._history[this._cursor]);
    return true;
  }

  /**
   * Reloads the snapshot at the current cursor position without moving the cursor.
   * Used by the warning system to silently discard an invalid move.
   */
  public revertToCurrentCheckpoint(): void {
    if (this._cursor >= 0 && this._cursor < this._history.length) {
      this._loadSnapshot(this._history[this._cursor]);
    }
  }

  // ─── Error & Good-State Tracking ───────────────────────────────────────────

  /**
   * Marks the current history position as the last known valid state.
   * Called when analysis confirms no contradiction.
   * Guarded: does not update while in error state.
   */
  public saveGoodState(): void {
    if (!this._isError) {
      this._lastGoodIndex = this._cursor;
    }
  }

  /**
   * Flags that the board is in a contradiction state.
   * Only fires once — subsequent calls while already in error are ignored.
   */
  public markError(): void {
    if (!this._isError) {
      this._isError = true;
    }
  }

  public clearError(): void {
    this._isError = false;
  }

  /**
   * Jumps the cursor back to the last known good state.
   * Trims all history above that point (erases the mistake timeline).
   * Preserves history below (user can still undo further).
   */
  public restoreToLastValid(): void {
    if (this._isError && this._lastGoodIndex >= 0 && this._lastGoodIndex < this._history.length) {
      this._cursor = this._lastGoodIndex;
      this._loadSnapshot(this._history[this._cursor]);
      // Trim history above the good state
      this._history = this._history.slice(0, this._cursor + 1);
      this._isError = false;
    }
  }

  // ─── Public Accessors ──────────────────────────────────────────────────────

  public get rows(): number { return this._rows; }
  public get cols(): number { return this._cols; }
  public get grid(): Uint16Array { return this._grid.slice(); }
  public get canUndo(): boolean { return this._cursor > 0; }
  public get canRedo(): boolean { return this._cursor < this._history.length - 1; }
  public get isError(): boolean { return this._isError; }

  // Legacy compatibility
  public get undoStackLength(): number { return this._cursor; }

  public getConfirmedState(): Uint8Array {
    return this._confirmed.slice();
  }

  public isConfirmed(row: CategoryIndex, col: ColumnIndex): boolean {
    if (!this._isValid(row, col)) return false;
    return this._confirmed[this._getIndex(row, col)] === 1;
  }

  public isItemConfirmed(row: CategoryIndex, itemIndex: ItemIndex): boolean {
    if (row < 0 || row >= this._rows || itemIndex < 0 || itemIndex >= this._cols) return false;
    const bit = 1 << itemIndex;
    for (let c = 0; c < this._cols; c++) {
      const idx = this._getIndex(row, c as ColumnIndex);
      if (this._confirmed[idx] && this._grid[idx] === bit) return true;
    }
    return false;
  }

  public getPossibleCount(row: CategoryIndex, col: ColumnIndex): number {
    if (!this._isValid(row, col)) return 0;
    let mask = this._grid[this._getIndex(row, col)];
    let count = 0;
    while (mask > 0) { mask &= (mask - 1); count++; }
    return count;
  }

  public isCellCorrect(row: CategoryIndex, col: ColumnIndex): boolean {
    if (!this._isValid(row, col)) return false;
    const index = this._getIndex(row, col);
    if (this._confirmed[index] !== 1) return false;
    if (this.getPossibleCount(row, col) !== 1) return false;
    return this._grid[index] === (1 << this._solution[index]);
  }

  public isPuzzleComplete(): boolean {
    const totalCells = this._rows * this._cols;
    for (let i = 0; i < totalCells; i++) {
        if (!this.isCellCorrect(Math.floor(i / this._cols), i % this._cols)) return false;
    }
    return true;
  }

  // ─── Mutation Methods ──────────────────────────────────────────────────────
  // These directly mutate the live state. History is NOT pushed here —
  // the caller (GamePage) pushes history AFTER cascade completes.

  public toggleBit(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];
    if (this.isConfirmed(row, col)) return [];

    const index = this._getIndex(row, col);
    this._grid[index] ^= (1 << itemIndex);
    this._noAutoSolve[index] = 0;
    
    const trace: MutationTrace = { row, col, itemIndex, type: 'TOGGLE' };
    return [trace];
  }

  public confirmCell(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];
    const traces: MutationTrace[] = [];
    this._applyConfirmation(row, col, itemIndex, traces);
    return traces;
  }

  private _applyConfirmation(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex, traces: MutationTrace[]): void {
    const index = this._getIndex(row, col);
    if (this._confirmed[index] && this._grid[index] === (1 << itemIndex)) return;

    this._grid[index] = (1 << itemIndex);
    this._confirmed[index] = 1;
    this._noAutoSolve[index] = 0;
    traces.push({ row, col, itemIndex, type: 'CONFIRM' });

    const maskToExclude = (1 << itemIndex);
    const inverseMask = ~maskToExclude;
    for (let c = 0; c < this._cols; c++) {
      if (c === col) continue;
      const targetIndex = this._getIndex(row, c);
      if ((this._grid[targetIndex] & maskToExclude) !== 0) {
        this._grid[targetIndex] &= inverseMask;
        traces.push({ row, col: c as ColumnIndex, itemIndex, type: 'PRUNE' });
      }
    }
  }

  public findAndApplyNextDeduction(): MutationTrace[] | null {
    const traces: MutationTrace[] = [];

    // 1. Naked Singles
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const idx = this._getIndex(r as any, c as any);
        if (this._confirmed[idx]) continue;
        if (this._noAutoSolve[idx]) continue;
        
        const mask = this._grid[idx];
        if (this._getPossibleCountFromMask(mask) === 1) {
          const item = Math.log2(mask) as ItemIndex;
          this._applyConfirmation(r as any, c as any, item, traces);
          return traces;
        }
      }
    }

    // 2. Hidden Singles
    for (let r = 0; r < this._rows; r++) {
      for (let item = 0; item < this._cols; item++) {
        const bit = 1 << item;
        let possibleCols: number[] = [];
        let confirmedCol: number = -1;
        for (let c = 0; c < this._cols; c++) {
          const idx = this._getIndex(r as any, c as any);
          if (this._grid[idx] & bit) {
            possibleCols.push(c);
            if (this._confirmed[idx]) confirmedCol = c;
          }
        }
        if (possibleCols.length === 1 && confirmedCol === -1) {
          const targetCol = possibleCols[0];
          const targetIdx = this._getIndex(r as any, targetCol as any);
          if (this._noAutoSolve[targetIdx]) continue;
          
          this._applyConfirmation(r as any, targetCol as any, item as any, traces);
          return traces;
        }
      }
    }

    return null;
  }

  public resolveAllDeductions(): MutationTrace[] {
    const allTraces: MutationTrace[] = [];
    let step;
    while ((step = this.findAndApplyNextDeduction())) {
      allTraces.push(...step);
    }
    return allTraces;
  }

  private _getPossibleCountFromMask(mask: number): number {
    let count = 0;
    let m = mask;
    while (m > 0) { m &= (m - 1); count++; }
    return count;
  }

  public unconfirmCell(row: CategoryIndex, col: ColumnIndex): Bitmask {
    if (!this._isValid(row, col)) return 0;
    const index = this._getIndex(row, col);
    this._confirmed[index] = 0;
    this._noAutoSolve[index] = 0;
    // Restore to all possible
    this._grid[index] = (1 << this._cols) - 1;
    return this._grid[index];
  }
}
