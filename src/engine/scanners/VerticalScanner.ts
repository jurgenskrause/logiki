import { CluePool } from '../scanner';
import type { CategoryIndex, ColumnIndex, ItemIndex, ClueItem } from '../../types';

export class VerticalScanner {
  private pool: CluePool;
  private groundTruth: Uint8Array;
  private rows: number;
  private cols: number;

  constructor(pool: CluePool, groundTruth: Uint8Array, rows: number, cols: number) {
    this.pool = pool;
    this.groundTruth = groundTruth;
    this.rows = rows;
    this.cols = cols;
  }

  /**
   * Retrieves an item index from the 1D GroundTruth array.
   */
  private getItemIndex(row: CategoryIndex, col: ColumnIndex): ItemIndex {
    return this.groundTruth[row * this.cols + col];
  }

  /**
   * Executes the vertical scan.
   */
  public scan(): void {
    // Loop through every column index (j = 0 to N-1)
    for (let j = 0; j < this.cols; j++) {
      this.scanPairs(j);
      this.scanTriples(j);
      this.scanOrs(j);
    }
  }

  /**
   * Vertical Pair Scanner
   */
  private scanPairs(j: ColumnIndex): void {
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let r2 = r1 + 1; r2 < this.rows; r2++) {
        const item1 = this.getItemIndex(r1, j);
        const item2 = this.getItemIndex(r2, j);

        const items: ClueItem[] = [
          { cat: r1, idx: item1 },
          { cat: r2, idx: item2 }
        ];
        this.pool.addClue('VERTICAL_PAIR', items);
      }
    }
  }

  /**
   * Vertical Triple Scanner
   */
  private scanTriples(j: ColumnIndex): void {
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let r2 = r1 + 1; r2 < this.rows; r2++) {
        for (let r3 = r2 + 1; r3 < this.rows; r3++) {
          const item1 = this.getItemIndex(r1, j);
          const item2 = this.getItemIndex(r2, j);
          const item3 = this.getItemIndex(r3, j);

          const items: ClueItem[] = [
            { cat: r1, idx: item1 },
            { cat: r2, idx: item2 },
            { cat: r3, idx: item3 }
          ];
          this.pool.addClue('VERTICAL_TRIPLE', items);
        }
      }
    }
  }

  /**
   * Vertical "Or" Scanner
   * Item(r1, j) is with Item(r2, j) OR Item(r2, k) (where k != j)
   */
  private scanOrs(j: ColumnIndex): void {
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let r2 = r1 + 1; r2 < this.rows; r2++) {
        for (let r3 = r2 + 1; r3 < this.rows; r3++) {
          // Item A and B are the 'True' relationship in this column
          const itemA = this.getItemIndex(r1, j);
          const itemB = this.getItemIndex(r2, j);

          // Pick a distractor column k != j
          for (let k = 0; k < this.cols; k++) {
            if (k === j) continue; // Distractor must be in a different column
            const itemC = this.getItemIndex(r3, k);

            const items: ClueItem[] = [
              { cat: r1, idx: itemA },
              { cat: r2, idx: itemB },
              { cat: r3, idx: itemC }
            ];

            this.pool.addClue('VERTICAL_OR', items);
          }
        }
      }
    }
  }
}
