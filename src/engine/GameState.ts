import type { CategoryIndex, ColumnIndex, Bitmask, ItemIndex, MutationTrace } from '../types';

/**
 * GameSnapshot Interface
 * Internal structure for history management.
 */
interface GameSnapshot {
  grid: Uint16Array;
  confirmed: Uint8Array;
}

/**
 * GameState Class
 * Encapsulates the mathematical state of the logic puzzle.
 * Uses a memory-efficient Uint16Array to track cell possibilities via bitmasks.
 * Strictly agnostic: No UI or theme-specific logic.
 */
export class GameState {
  private _rows: number;
  private _cols: number;
  private _grid: Uint16Array;
  private _confirmed: Uint8Array;
  private _solution: Uint8Array;

  // History Stacks
  private _undoStack: GameSnapshot[] = [];
  private _redoStack: GameSnapshot[] = [];
  private readonly _HISTORY_LIMIT = 50;

  // Error State
  private _isError: boolean = false;
  private _restoreSnapshot: GameSnapshot | null = null;

  /**
   * Initializes a new GameState instance.
   * @param rows Number of categories (rows)
   * @param cols Number of items per category (columns)
   */
  constructor(rows: CategoryIndex, cols: ColumnIndex) {
    this._rows = rows;
    this._cols = cols;
    
    // Memory-efficient 1D array to represent the 2D grid
    this._grid = new Uint16Array(rows * cols);
    // Parallel array for tracking explicitly confirmed solutions
    this._confirmed = new Uint8Array(rows * cols);
    // Source of truth solution key
    this._solution = new Uint8Array(rows * cols);
    
    // Initialize with the "Full Mask"
    const initialMask: Bitmask = (1 << cols) - 1;
    this._grid.fill(initialMask);
    this._confirmed.fill(0);
  }

  /**
   * Sets the target solution for the puzzle.
   * @param data Uint8Array containing the correct ItemIndex for every cell.
   * @throws Error if the solution length does not match the grid dimensions.
   */
  public setSolution(data: Uint8Array): void {
    if (data.length !== this._rows * this._cols) {
      throw new Error(`Invalid solution length: expected ${this._rows * this._cols}, got ${data.length}`);
    }
    this._solution = new Uint8Array(data);
  }

  /**
   * Maps 2D grid coordinates to the 1D Uint16Array index.
   */
  private _getIndex(row: CategoryIndex, col: ColumnIndex): number {
    return row * this._cols + col;
  }

  /**
   * Validates if the given coordinates and item index are within grid bounds.
   */
  private _isValid(row: CategoryIndex, col: ColumnIndex, itemIndex?: ItemIndex): boolean {
    const rowOk = row >= 0 && row < this._rows;
    const colOk = col >= 0 && col < this._cols;
    const itemOk = itemIndex === undefined || (itemIndex >= 0 && itemIndex < this._cols);
    return rowOk && colOk && itemOk;
  }

  /**
   * Saves a snapshot of the current state to the undoStack.
   */
  private _pushState(): void {
    this._undoStack.push({
      grid: new Uint16Array(this._grid),
      confirmed: new Uint8Array(this._confirmed)
    });

    if (this._undoStack.length > this._HISTORY_LIMIT) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }

  /**
   * Reverts to the previous state.
   */
  public undo(): void {
    if (this._undoStack.length === 0) return;

    this._redoStack.push({
      grid: new Uint16Array(this._grid),
      confirmed: new Uint8Array(this._confirmed)
    });

    const snapshot = this._undoStack.pop()!;
    this._grid = snapshot.grid;
    this._confirmed = snapshot.confirmed;
  }

  /**
   * Restores a previously undone state.
   */
  public redo(): void {
    if (this._redoStack.length === 0) return;

    this._undoStack.push({
      grid: new Uint16Array(this._grid),
      confirmed: new Uint8Array(this._confirmed)
    });

    const snapshot = this._redoStack.pop()!;
    this._grid = snapshot.grid;
    this._confirmed = snapshot.confirmed;
  }

  /**
   * Number of categories in the grid.
   */
  public get rows(): number {
    return this._rows;
  }

  /**
   * Number of items per category in the grid.
   */
  public get cols(): number {
    return this._cols;
  }

  /**
   * Returns a snapshot of the current grid state.
   */
  public get grid(): Uint16Array {
    return this._grid.slice();
  }

  /**
   * Returns a snapshot of the current confirmation state.
   */
  public getConfirmedState(): Uint8Array {
    return this._confirmed.slice();
  }

  /**
   * Returns true if the cell has been explicitly confirmed.
   */
  public isConfirmed(row: CategoryIndex, col: ColumnIndex): boolean {
    if (!this._isValid(row, col)) return false;
    return this._confirmed[this._getIndex(row, col)] === 1;
  }

  /**
   * Counts how many bits are set in a cell's bitmask.
   */
  public getPossibleCount(row: CategoryIndex, col: ColumnIndex): number {
    if (!this._isValid(row, col)) return 0;
    let mask = this._grid[this._getIndex(row, col)];
    // Bit counting (popcount) logic
    let count = 0;
    while (mask > 0) {
      mask &= (mask - 1);
      count++;
    }
    return count;
  }

  /**
   * Checks if a cell is both confirmed and matches the solution.
   */
  public isCellCorrect(row: CategoryIndex, col: ColumnIndex): boolean {
    if (!this._isValid(row, col)) return false;
    const index = this._getIndex(row, col);
    
    // Integrity rules:
    // 1. Must be player-confirmed
    if (this._confirmed[index] !== 1) return false;
    // 2. Must have exactly one bit set (sanity check)
    if (this.getPossibleCount(row, col) !== 1) return false;
    // 3. The bit must match the solution: grid[index] === (1 << solution[index])
    return this._grid[index] === (1 << this._solution[index]);
  }

  /**
   * Checks if every cell in the grid is correctly confirmed according to the solution.
   */
  public isPuzzleComplete(): boolean {
    const totalCells = this._rows * this._cols;
    for (let i = 0; i < totalCells; i++) {
      const r = Math.floor(i / this._cols) as CategoryIndex;
      const c = (i % this._cols) as ColumnIndex;
      if (!this.isCellCorrect(r, c)) return false;
    }
    return true;
  }

  /**
   * Toggles the possibility bit for a specific item in a cell.
   */
  public toggleBit(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];
    if (this.isConfirmed(row, col)) return [];

    this._pushState();
    const index = this._getIndex(row, col);
    this._grid[index] ^= (1 << itemIndex);
    
    return [{ row, col, itemIndex, type: 'TOGGLE' }];
  }

  /**
   * Forces a cell to a single value and marks it as player-confirmed.
   */
  public confirmCell(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];

    this._pushState();
    const index = this._getIndex(row, col);
    this._grid[index] = (1 << itemIndex);
    this._confirmed[index] = 1;

    const traces: MutationTrace[] = [{ row, col, itemIndex, type: 'CONFIRM' }];
    const pruneTraces = this._applyAutoPrune(row, col, itemIndex);
    
    return traces.concat(pruneTraces);
  }

  /**
   * Removes the confirmed status from a cell without altering its bitmask.
   */
  public unconfirmCell(row: CategoryIndex, col: ColumnIndex): Bitmask {
    if (!this._isValid(row, col)) return 0;
    this._pushState();
    const index = this._getIndex(row, col);
    this._confirmed[index] = 0;
    return this._grid[index];
  }

  /**
   * Internal exposure for verification/testing only.
   */
  public get undoStackLength(): number { return this._undoStack.length; }
  public get redoStackLength(): number { return this._redoStack.length; }

  /**
   * Whether the current board state is logically contradictory.
   */
  public get isError(): boolean { return this._isError; }

  /**
   * Silently marks the current state as erroneous and saves a restore point.
   * Called by HintService after detecting a contradiction.
   */
  public markError(): void {
    if (!this._isError) {
      // Store the last-known good state (top of undoStack, before the bad move)
      const last = this._undoStack[this._undoStack.length - 1];
      if (last) {
        this._restoreSnapshot = { grid: new Uint16Array(last.grid), confirmed: new Uint8Array(last.confirmed) };
      }
      this._isError = true;
    }
  }

  /**
   * Returns the pre-error restore snapshot if one exists.
   * Can be used to jump back to the last known-good state.
   */
  public get restoreSnapshot(): { grid: Uint16Array; confirmed: Uint8Array } | null {
    return this._restoreSnapshot;
  }

  /**
   * Clears the error state (called when player undoes the bad move).
   */
  public clearError(): void {
    this._isError = false;
    this._restoreSnapshot = null;
  }

  /**
   * Automatically removes an item from all other columns in a row (Category).
   */
  private _applyAutoPrune(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    const maskToExclude = (1 << itemIndex);
    const inverseMask = ~maskToExclude;
    const traces: MutationTrace[] = [];

    for (let c = 0; c < this._cols; c++) {
      if (c === col) continue;
      const targetIndex = this._getIndex(row, c);
      if ((this._grid[targetIndex] & maskToExclude) !== 0) {
        this._grid[targetIndex] &= inverseMask;
        traces.push({ row, col: c as ColumnIndex, itemIndex, type: 'PRUNE' });
      }
    }
    return traces;
  }
}
