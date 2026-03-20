import type { CategoryIndex, ColumnIndex, ItemIndex, Bitmask } from '../types';

/**
 * Phase 3.2.1: The Possibility Matrix (Logic Canvas)
 *
 * This is the core data structure for the Convergence Solver.
 * It represents a superposition of all possible truths (possible assignments of items to slots)
 * that will be pruned via logical deduction.
 *
 * It is forward-only, memory-efficient, and strictly partitioned by category.
 */
export class LogicCanvas {
  private readonly _height: number;
  private readonly _width: number;
  private _matrix: Uint8Array;
  private _hasContradiction: boolean = false;

  /**
   * Initializes a new Logic Canvas for an N x M puzzle.
   * @param height The number of categories (Rows, N).
   * @param width The number of houses/items (Columns, M).
   */
  constructor(height: number, width: number) {
    this._height = height;
    this._width = width;
    // Memory: N x M x 1 byte (e.g., 64 bytes for 8x8).
    this._matrix = new Uint8Array(height * width);

    // Initialization Rule: Every cell in Row i must be initialized with all M bits set to 1.
    // Example (M=4): 1111 (decimal 15).
    const initialMask: Bitmask = (1 << width) - 1;
    this._matrix.fill(initialMask);
  }

  /**
   * Resets the canvas back to the initial "Superposition of Truth".
   * This allows the canvas to be reused without reallocating arrays.
   */
  public reset(): void {
    const initialMask: Bitmask = (1 << this._width) - 1;
    this._matrix.fill(initialMask);
    this._hasContradiction = false;
  }

  /**
   * Creates a deep copy of the current LogicCanvas state.
   * Useful for "Dry Run" non-destructive clue testing.
   */
  public clone(): LogicCanvas {
    const cloned = new LogicCanvas(this._height, this._width);
    cloned._matrix.set(this._matrix);
    cloned._hasContradiction = this._hasContradiction;
    return cloned;
  }

  /**
   * Performs a bitwise AND with the inverse of the item bit to eliminate a possibility.
   * Matrix[r][c] &= ~(1 << itemIndex)
   * @returns true if a bit was actually flipped, false if the bit was already 0.
   */
  public prune(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    const index = row * this._width + col;
    const oldMask = this._matrix[index];
    const newMask = oldMask & ~(1 << itemIndex);
    if (oldMask !== newMask) {
      this._matrix[index] = newMask;
      if (newMask === 0) {
        this._hasContradiction = true;
      }
      return true;
    }
    return false;
  }

  /**
   * Performs a bitwise AND with the inverse of the provided mask.
   * Matrix[r][c] &= ~mask
   * @returns true if any bits were actually flipped.
   */
  public pruneByMask(row: CategoryIndex, col: ColumnIndex, mask: Bitmask): boolean {
    const index = row * this._width + col;
    const oldMask = this._matrix[index];
    const newMask = oldMask & ~mask;
    if (oldMask !== newMask) {
      this._matrix[index] = newMask;
      if (newMask === 0) {
        this._hasContradiction = true;
      }
      return true;
    }
    return false;
  }

  /**
   * Applies a bitmask by performing a bitwise AND.
   * Matrix[r][c] &= mask
   * @returns true if the mask changed (New Information).
   */
  public applyMask(row: CategoryIndex, col: ColumnIndex, mask: Bitmask): boolean {
    const idx = row * this._width + col;
    const oldMask = this._matrix[idx];
    const newMask = oldMask & mask;
    if (oldMask !== newMask) {
      this._matrix[idx] = newMask;
      if (newMask === 0) {
        this._hasContradiction = true;
      }
      return true;
    }
    return false;
  }

  /**
   * Returns true if the bitmask is a power of two (exactly one bit remains).
   */
  public isSolved(row: CategoryIndex, col: ColumnIndex): boolean {
    const mask = this._matrix[row * this._width + col];
    // A value x is a power of two if (x > 0) and (x & (x - 1) === 0).
    return mask !== 0 && (mask & (mask - 1)) === 0;
  }

  /**
   * Returns true if the bitmask is 0 (a logical contradiction has occurred).
   */
  public isInvalid(row: CategoryIndex, col: ColumnIndex): boolean {
    return this._matrix[row * this._width + col] === 0;
  }

  /**
   * Scans the matrix for any cells with a bitmask of 0, or returns the cached flag.
   */
  public hasAnyInvalidCells(): boolean {
    return this._hasContradiction;
  }

  /**
   * Returns all cells whose bitmask has been reduced to 0 (no valid options remain).
   * Only meaningful after hasAnyInvalidCells() returns true.
   */
  public getInvalidCells(): { row: number; col: number }[] {
    const dead: { row: number; col: number }[] = [];
    for (let r = 0; r < this._height; r++) {
      for (let c = 0; c < this._width; c++) {
        if (this._matrix[r * this._width + c] === 0) {
          dead.push({ row: r, col: c });
        }
      }
    }
    return dead;
  }

  /**
   * Checks if every cell in the grid contains exactly one remaining possibility.
   */
  public isFullySolved(): boolean {
    for (let i = 0; i < this._matrix.length; i++) {
      const mask = this._matrix[i];
      if (mask === 0 || (mask & (mask - 1)) !== 0) return false;
    }
    return true;
  }

  /**
   * Returns an array of indices where bits are still set to 1.
   */
  public getRemainingOptions(row: CategoryIndex, col: ColumnIndex): ItemIndex[] {
    const mask = this._matrix[row * this._width + col];
    const options: ItemIndex[] = [];
    for (let i = 0; i < this._width; i++) {
      if ((mask & (1 << i)) !== 0) {
        options.push(i);
      }
    }
    return options;
  }

  /**
   * Returns an array of column indices where the specified item is still possible.
   * Useful for pattern matching across the horizontal axis of a category.
   */
  public getRemainingColumns(row: CategoryIndex, itemIndex: ItemIndex): ColumnIndex[] {
    const columns: ColumnIndex[] = [];
    for (let col = 0; col < this._width; col++) {
      if (this.isPossible(row, col, itemIndex)) {
        columns.push(col);
      }
    }
    return columns;
  }

  /**
   * Internal helper to retrieve the current bitmask for a cell.
   * Useful for Rule Interpreters and verification.
   */
  public getMask(row: CategoryIndex, col: ColumnIndex): Bitmask {
    return this._matrix[row * this._width + col];
  }

  /**
   * Checks if a specific item index is still a possibility in a given cell.
   */
  public isPossible(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    return (this.getMask(row, col) & (1 << itemIndex)) !== 0;
  }

  /**
   * Checks if a specific item is the ONLY remaining possibility in a cell.
   * This means the cell is solved AND its bit matches the given itemIndex.
   */
  public isItemSolvedAt(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    return this.getMask(row, col) === (1 << itemIndex);
  }

  /**
   * Returns the item index if the cell is solved, or -1 if it is still ambiguous or invalid.
   */
  public getSolvedItemIndex(row: CategoryIndex, col: ColumnIndex): ItemIndex | -1 {
    const mask = this.getMask(row, col);
    // Power of two check
    if (mask !== 0 && (mask & (mask - 1)) === 0) {
      for (let i = 0; i < this._width; i++) {
        if ((mask & (1 << i)) !== 0) return i;
      }
    }
    return -1;
  }

  /**
   * Forces a cell to contain only one specific item bit.
   * Prunes all other bits from the cell's mask.
   * @returns true if any bits were actually pruned.
   */
  public isolateItem(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    const index = row * this._width + col;
    const oldMask = this._matrix[index];
    const targetBit = 1 << itemIndex;
    const newMask = oldMask & targetBit;

    if (oldMask !== newMask) {
      this._matrix[index] = newMask;
      if (newMask === 0) {
        this._hasContradiction = true;
      }
      return true;
    }
    return false;
  }

  /**
   * Width of the puzzle (number of columns / houses).
   */
  public get width(): number {
    return this._width;
  }

  /**
   * Height of the logic grid (number of category rows).
   */
  public get height(): number {
    return this._height;
  }

  /**
   * Backward compatibility: returns width as N
   */
  public get N(): number {
    return this._width;
  }
}
