/**
 * Bitmask: A numeric type representing the possibility state of a cell.
 * Bit i is set (1) if item i is possible.
 */
export type Bitmask = number;

/**
 * CategoryIndex: A numeric index representing the category or row (0 to M-1).
 */
export type CategoryIndex = number;

/**
 * ItemIndex: A numeric index representing the specific item within a category (0 to N-1).
 */
export type ItemIndex = number;

/**
 * ColumnIndex: A numeric index representing the vertical slot or column (0 to N-1).
 */
export type ColumnIndex = number;

/**
 * Coordinate: Represents a specific cell location in the grid.
 */
export interface Coordinate {
  row: CategoryIndex;
  col: ColumnIndex;
}

/**
 * ClueType: Logical patterns supported by the engine.
 */
export type ClueType = 
  | 'TOGETHER' 
  | 'TRIPLE_TOGETHER' 
  | 'XOR_VERTICAL' 
  | 'NOT_TOGETHER' 
  | 'ADJACENT' 
  | 'SANDWICH' 
  | 'NOT_SANDWICH' 
  | 'DIRECTIONAL'
  | 'VERTICAL_PAIR'
  | 'VERTICAL_TRIPLE'
  | 'VERTICAL_OR'
  | 'ADJACENT_PAIR'
  | 'SPACED_PAIR'
  | 'ADJACENT_TRIO';

/**
 * Legacy ClueItem definition for older scanners
 */
export interface ClueItem {
  cat: CategoryIndex;
  idx: ItemIndex;
}

/**
 * Clue: Unified structure for all logic hints.
 */
export interface Clue {
  /** Unique identifier for the clue instance. */
  id: string;
  /** The logic type/pattern of the clue. */
  type: ClueType;
  /** The specific items targeted by this clue. Each target identifies an item and its category. */
  targets: {
    row: CategoryIndex;
    item: ItemIndex;
  }[];
  /** Whether the clue is reversible (true for non-directional horizontal relationships). */
  isReversible: boolean;
}

/**
 * GameState: High-level blueprint of the engine state.
 */
export interface GameState {
  /** The deduction grid: [row][column] = Bitmask of possibilities. */
  grid: Bitmask[][];
  /** List of generated clues for this puzzle instance. */
  clues: Clue[];
  /** Grid dimensions (rows/categories). */
  rows: number;
  /** Grid dimensions (columns/items). */
  cols: number;
  /** The specific seed string used to generate this puzzle */
  seed: string;
}

/**
 * MutationTrace Interface
 * Represents a single atomic operation during a mutation cascade.
 * Used by the UI to animate logic ripples in chronological order.
 */
export interface MutationTrace {
  row: number;
  col: number;
  itemIndex: number;
  type: 'CONFIRM' | 'PRUNE' | 'TOGGLE';
}
