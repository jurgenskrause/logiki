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
  private readonly _size: number;
  private _matrix: Uint8Array;

  /**
   * Initializes a new Logic Canvas for an N x N puzzle.
   * @param size The dimension N of the puzzle (typically 4 or 8).
   */
  constructor(size: number) {
    this._size = size;
    // Memory: N x N x 1 byte (e.g., 64 bytes for 8x8).
    this._matrix = new Uint8Array(size * size);

    // Initialization Rule: Every cell in Row i must be initialized with all N bits set to 1.
    // Example (4x4): 1111 (decimal 15).
    const initialMask: Bitmask = (1 << size) - 1;
    this._matrix.fill(initialMask);
  }

  /**
   * Performs a bitwise AND with the inverse of the item bit to eliminate a possibility.
   * Matrix[r][c] &= ~(1 << itemIndex)
   * @returns true if a bit was actually flipped, false if the bit was already 0.
   */
  public prune(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    const index = row * this._size + col;
    const oldMask = this._matrix[index];
    const newMask = oldMask & ~(1 << itemIndex);
    if (oldMask !== newMask) {
      this._matrix[index] = newMask;
      return true;
    }
    return false;
  }

  /**
   * Returns true if the bitmask is a power of two (exactly one bit remains).
   */
  public isSolved(row: CategoryIndex, col: ColumnIndex): boolean {
    const mask = this._matrix[row * this._size + col];
    // A value x is a power of two if (x > 0) and (x & (x - 1) === 0).
    return mask !== 0 && (mask & (mask - 1)) === 0;
  }

  /**
   * Returns true if the bitmask is 0 (a logical contradiction has occurred).
   */
  public isInvalid(row: CategoryIndex, col: ColumnIndex): boolean {
    return this._matrix[row * this._size + col] === 0;
  }

  /**
   * Scans the matrix for any cells with a bitmask of 0.
   */
  public hasAnyInvalidCells(): boolean {
    return this._matrix.some(mask => mask === 0);
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
    const mask = this._matrix[row * this._size + col];
    const options: ItemIndex[] = [];
    for (let i = 0; i < this._size; i++) {
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
    for (let col = 0; col < this._size; col++) {
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
    return this._matrix[row * this._size + col];
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
   * Forces a cell to contain only one specific item bit.
   * Prunes all other bits from the cell's mask.
   * @returns true if any bits were actually pruned.
   */
  public isolateItem(row: CategoryIndex, col: ColumnIndex, itemIndex: ItemIndex): boolean {
    const index = row * this._size + col;
    const oldMask = this._matrix[index];
    const targetBit = 1 << itemIndex;
    const newMask = oldMask & targetBit;

    if (oldMask !== newMask) {
      this._matrix[index] = newMask;
      return true;
    }
    return false;
  }

  /**
   * Dimension of the puzzle (N).
   */
  public get size(): number {
    return this._size;
  }

  /**
   * Width of the puzzle (number of columns). Alias for size.
   */
  public get width(): number {
    return this._size;
  }
}
