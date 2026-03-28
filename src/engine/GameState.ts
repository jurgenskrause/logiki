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

  // History Stacks - Now tracking groups of mutations
  private _undoStack: MutationGroup[] = [];
  private _redoStack: MutationGroup[] = [];

  // Error State
  private _isError: boolean = false;
  private _restoreSnapshot: GameSnapshot | null = null;

  constructor(rows: CategoryIndex, cols: ColumnIndex) {
    this._rows = rows;
    this._cols = cols;
    this._grid = new Uint16Array(rows * cols);
    this._confirmed = new Uint8Array(rows * cols);
    this._solution = new Uint8Array(rows * cols);
    const initialMask: Bitmask = (1 << cols) - 1;
    this._grid.fill(initialMask);
    this._confirmed.fill(0);
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
      confirmed: new Uint8Array(this._confirmed)
    };
  }

  public undo(): void {
    if (this._undoStack.length === 0) return;
    const group = this._undoStack.pop()!;
    this._redoStack.push({
      traces: group.traces,
      snapshot: this._createSnapshot()
    });
    this._grid = group.snapshot.grid;
    this._confirmed = group.snapshot.confirmed;
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

    affectedCells.forEach(cellId => {
      const [r, c] = cellId.split('-').map(Number);
      const idx = this._getIndex(r, c);
      this._grid[idx] = beforeGrid[idx];
      this._confirmed[idx] = beforeConfirmed[idx];
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
          this._applyConfirmation(r as any, possibleCols[0] as any, item as any, traces);
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
    const trace: MutationTrace = { row, col, itemIndex: -1, type: 'TOGGLE' }; // Using TOGGLE to represent state reset 
    this._undoStack.push({ traces: [trace], snapshot });
    return this._grid[index];
  }

  public get undoStackLength(): number { return this._undoStack.length; }
  public get redoStackLength(): number { return this._redoStack.length; }
  public get isError(): boolean { return this._isError; }

  public markError(): void {
    if (!this._isError) {
      const last = this._undoStack[this._undoStack.length - 1];
      if (last) {
        this._restoreSnapshot = { grid: new Uint16Array(last.snapshot.grid), confirmed: new Uint8Array(last.snapshot.confirmed) };
      }
      this._isError = true;
    }
  }

  public get restoreSnapshot(): { grid: Uint16Array; confirmed: Uint8Array } | null { return this._restoreSnapshot; }
  public clearError(): void { this._isError = false; this._restoreSnapshot = null; }
}
