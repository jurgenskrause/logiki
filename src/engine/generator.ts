import { seededRandom } from '../utils/random';

/**
 * Deterministically generates a "Secret Solution" matrix for the logic puzzle.
 * Uses the Mulberry32 PRNG and a Fisher-Yates shuffle to ensure the exact same
 * layout is produced for a given seed and dimension size.
 * 
 * @param seed The base numeric seed for the puzzle
 * @param rows Number of categories (rows)
 * @param cols Number of items per category (columns)
 * @returns A 1D Uint8Array representing the 2D solution matrix
 */
export function generateGroundTruth(seed: number, rows: number, cols: number): Uint8Array {
  const groundTruth = new Uint8Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    // 1. Initialize an ordered array of item indices [0, 1, ..., cols - 1]
    const rowItems = new Uint8Array(cols);
    for (let c = 0; c < cols; c++) {
      rowItems[c] = c;
    }

    // 2. Create a specific PRNG instance for this row
    // Offsetting the base seed by the row index ensures different categories 
    // don't share the same shuffle sequence, while remaining strictly deterministic.
    const rowRng = seededRandom(seed + r);

    // 3. Perform a deterministic Fisher-Yates shuffle
    for (let i = cols - 1; i > 0; i--) {
      // rowRng() returns a float between 0 (inclusive) and 1 (exclusive)
      const j = Math.floor(rowRng() * (i + 1));
      
      // Swap elements at indices i and j
      const temp = rowItems[i];
      rowItems[i] = rowItems[j];
      rowItems[j] = temp;
    }

    // 4. Map the shuffled items into the flat 1D output array
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      groundTruth[index] = rowItems[c];
    }
  }

  return groundTruth;
}
