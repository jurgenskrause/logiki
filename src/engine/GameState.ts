import type { CategoryIndex, ColumnIndex, Bitmask, ItemIndex, MutationTrace } from '../types';

/**
 * MutationGroup represents a set of changes that happened as a result of one user action.
 */
interface MutationGroup {
  traces: MutationTrace[];
  snapshot: GameSnapshot;
}

/**
 * GameSnapshot Interface
 */
interface GameSnapshot {
  grid: Uint16Array;
  confirmed: Uint8Array;
  noAutoSolve: Uint8Array;
}

/**
 * GameState Class
 * Encapsulates the mathematical state of the logic puzzle.
 */
export class GameState {
  private _rows: number;
  private _cols: number;
  private _grid: Uint16Array;
  private _confirmed: Uint8Array;
  private _solution: Uint8Array;
  private _noAutoSolve: Uint8Array;

  // History Stacks - Now tracking groups of mutations
  private _undoStack: MutationGroup[] = [];
  private _redoStack: MutationGroup[] = [];

  // Error State
  private _isError: boolean = false;
  private _goodStateSnapshot: GameSnapshot | null = null;
  private _goodStateUndoLength: number = 0;
  private _restoreSnapshot: { snapshot: GameSnapshot; undoStackLength: number; } | null = null;

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

  /**
   * Captures the state BEFORE a set of mutations.
   */
  private _createSnapshot(): GameSnapshot {
    return {
      grid: new Uint16Array(this._grid),
      confirmed: new Uint8Array(this._confirmed),
      noAutoSolve: new Uint8Array(this._noAutoSolve)
    };
  }

  public undo(): void {
    if (this._undoStack.length === 0) return;
    const group = this._undoStack.pop()!;
    this._redoStack.push({
      traces: group.traces,
      snapshot: this._createSnapshot()
    });
    this._grid = new Uint16Array(group.snapshot.grid);
    this._confirmed = new Uint8Array(group.snapshot.confirmed);
    this._noAutoSolve = new Uint8Array(group.snapshot.noAutoSolve);

    // Anti-autosolve: Flag any cell that is currently unconfirmed but has only 1 option left.
    // This prevents the engine from immediately stealing the cell back via auto-deduction.
    for (let i = 0; i < this._grid.length; i++) {
      if (this._confirmed[i] === 0 && this._getPossibleCountFromMask(this._grid[i]) === 1) {
        this._noAutoSolve[i] = 1;
      }
    }
  }

  public redo(): void {
    if (this._redoStack.length === 0) return;
    const group = this._redoStack.pop()!;
    this._undoStack.push({
      traces: group.traces,
      snapshot: this._createSnapshot()
    });
    this._grid = group.snapshot.grid;
    this._confirmed = group.snapshot.confirmed;
    this._noAutoSolve = group.snapshot.noAutoSolve;
  }

  /**
   * Reverts a specific cell's most recent confirmation and all its cascading effects.
   */
  public revertCell(row: CategoryIndex, col: ColumnIndex): void {
    if (!this._isValid(row, col)) return;
    
    // 1. Find the most recent mutation group where this cell was CONFIRMED
    const groupIndex = [...this._undoStack].reverse().findIndex(group => 
      group.traces.some(t => t.row === row && t.col === col && t.type === 'CONFIRM')
    );

    if (groupIndex === -1) return;

    // Convert reverse index to actual index
    const actualIndex = this._undoStack.length - 1 - groupIndex;
    const groupToRevert = this._undoStack[actualIndex];

    // 2. Identify all cells affected by this specific mutation group
    const affectedCells = new Set<string>();
    groupToRevert.traces.forEach(t => affectedCells.add(`${t.row}-${t.col}`));

    // 3. Restore those specific cells to their state BEFORE this group happened
    const beforeGrid = groupToRevert.snapshot.grid;
    const beforeConfirmed = groupToRevert.snapshot.confirmed;
    const beforeNoAutoSolve = groupToRevert.snapshot.noAutoSolve;

    affectedCells.forEach(cellId => {
      const [r, c] = cellId.split('-').map(Number);
      const idx = this._getIndex(r as CategoryIndex, c as ColumnIndex);
      this._grid[idx] = beforeGrid[idx];
      this._confirmed[idx] = beforeConfirmed[idx];
      this._noAutoSolve[idx] = beforeNoAutoSolve[idx];

      // Anti-Autosolve: If reverting this cell puts it in a state with exactly 1 option left,
      // flag it so the engine doesn't immediately auto-solve it again.
      if (this._confirmed[idx] === 0 && this._getPossibleCountFromMask(this._grid[idx]) === 1) {
        this._noAutoSolve[idx] = 1;
      }
    });

    // 4. Remove this group from history and clear redo stack
    this._undoStack.splice(actualIndex, 1);
    this._redoStack = [];

    // 5. Important: Any LATER mutations might now be invalid or refer to stale bits.
    // To ensure consistency, we should ideally re-apply subsequent mutations or
    // simply clear subsequent history. For now, we clear everything AFTER this point
    // to prevent logical contradictions in the undo/redo chain.
    this._undoStack = this._undoStack.slice(0, actualIndex);
  }

  public get rows(): number { return this._rows; }
  public get cols(): number { return this._cols; }
  public get grid(): Uint16Array { return this._grid.slice(); }

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

  public toggleBit(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];
    if (this.isConfirmed(row, col)) return [];

    const snapshot = this._createSnapshot();
    const index = this._getIndex(row, col);
    this._grid[index] ^= (1 << itemIndex);
    this._noAutoSolve[index] = 0; // Clear flag on interaction
    
    const trace: MutationTrace = { row, col, itemIndex, type: 'TOGGLE' };
    this._undoStack.push({ traces: [trace], snapshot });
    this._redoStack = [];
    return [trace];
  }

  public confirmCell(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): MutationTrace[] {
    if (!this._isValid(row, col, itemIndex)) return [];
    const snapshot = this._createSnapshot();
    const traces: MutationTrace[] = [];
    this._applyConfirmation(row, col, itemIndex, traces);
    
    if (traces.length > 0) {
      this._undoStack.push({ traces, snapshot });
      this._redoStack = [];
    }
    return traces;
  }

  private _applyConfirmation(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex, traces: MutationTrace[]): void {
    const index = this._getIndex(row, col);
    if (this._confirmed[index] && this._grid[index] === (1 << itemIndex)) return;

    this._grid[index] = (1 << itemIndex);
    this._confirmed[index] = 1;
    this._noAutoSolve[index] = 0; // Clear flag on interaction
    traces.push({ row, col, itemIndex, type: 'CONFIRM' });

    const maskToExclude = (1 << itemIndex);
    const inverseMask = ~maskToExclude;
    for (let c = 0; c < this._cols; c++) {
      if (c === col) continue;
      const targetIndex = this._getIndex(row, c);
      if ((this._grid[targetIndex] & maskToExclude) !== 0) {
        this._grid[targetIndex] &= inverseMask;
        // Collect eliminated items as PRUNE traces
        traces.push({ row, col: c as ColumnIndex, itemIndex, type: 'PRUNE' });
      }
    }
  }

  public findAndApplyNextDeduction(): MutationTrace[] | null {
    const snapshot = this._createSnapshot();
    const traces: MutationTrace[] = [];

    // 1. Naked Singles
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const idx = this._getIndex(r as any, c as any);
        if (this._confirmed[idx]) continue;
        if (this._noAutoSolve[idx]) continue; // Skip anti-autosolve flagged cells
        
        const mask = this._grid[idx];
        if (this._getPossibleCountFromMask(mask) === 1) {
          const item = Math.log2(mask) as ItemIndex;
          this._applyConfirmation(r as any, c as any, item, traces);
          this._undoStack.push({ traces, snapshot });
          this._redoStack = [];
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
          if (this._noAutoSolve[targetIdx]) continue; // Skip anti-autosolve flagged cells
          
          this._applyConfirmation(r as any, targetCol as any, item as any, traces);
          this._undoStack.push({ traces, snapshot });
          this._redoStack = [];
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
    const snapshot = this._createSnapshot();
    const index = this._getIndex(row, col);
    this._confirmed[index] = 0;
    this._noAutoSolve[index] = 0; // Clear anti-autosolve on manual reset
    const trace: MutationTrace = { row, col, itemIndex: -1, type: 'TOGGLE' }; // Using TOGGLE to represent state reset 
    this._undoStack.push({ traces: [trace], snapshot });
    return this._grid[index];
  }

  public get undoStackLength(): number { return this._undoStack.length; }
  public get redoStackLength(): number { return this._redoStack.length; }
  public get isError(): boolean { return this._isError; }

  public saveGoodState(): void {
    if (!this._isError) {
      this._goodStateSnapshot = this._createSnapshot();
      this._goodStateUndoLength = this._undoStack.length;
    }
  }

  public markError(): void {
    if (!this._isError) {
      if (this._goodStateSnapshot) {
        this._restoreSnapshot = { 
          snapshot: {
            grid: new Uint16Array(this._goodStateSnapshot.grid), 
            confirmed: new Uint8Array(this._goodStateSnapshot.confirmed),
            noAutoSolve: new Uint8Array(this._goodStateSnapshot.noAutoSolve)
          },
          undoStackLength: this._goodStateUndoLength
        };
      }
      this._isError = true;
    }
  }

  public get restoreSnapshot(): { snapshot: GameSnapshot; undoStackLength: number; } | null { return this._restoreSnapshot; }
  public clearError(): void { this._isError = false; this._restoreSnapshot = null; }

  public restoreToLastValid(): void {
    if (this._isError && this._restoreSnapshot) {
      this._grid = new Uint16Array(this._restoreSnapshot.snapshot.grid);
      this._confirmed = new Uint8Array(this._restoreSnapshot.snapshot.confirmed);
      this._noAutoSolve = new Uint8Array(this._restoreSnapshot.snapshot.noAutoSolve);

      // Cleanly slice the undo stack back to the exact length it was when the snapshot was taken, deleting all the mistakes from history
      this._undoStack = this._undoStack.slice(0, this._restoreSnapshot.undoStackLength);

      // Anti-autosolve: Flag any cell that is currently unconfirmed but has only 1 option left.
      // This prevents the engine from immediately stealing the cell back via auto-deduction
      // when restoring from an error state.
      for (let i = 0; i < this._grid.length; i++) {
        if (this._confirmed[i] === 0 && this._getPossibleCountFromMask(this._grid[i]) === 1) {
          this._noAutoSolve[i] = 1;
        }
      }

      this.clearError();
      // Clear redo stack on manual restoration
      this._redoStack = [];
    }
  }
}
