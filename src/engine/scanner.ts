import type { ClueType, ClueItem, Clue } from '../types';
import { VerticalScanner } from './scanners/VerticalScanner';

/**
 * CluePool Class
 * A centralized manager that stores, uniquely identifies, and deduplicates
 * every logic clue discovered by the individual scanners.
 */
export class CluePool {
  private map: Map<string, Clue> = new Map();

  /**
   * Adds a clue to the pool if it passes all integrity checks and is unique.
   */
  public addClue(type: ClueType, items: ClueItem[]): void {
    // 1. Validate count
    const expectedCount = this.getExpectedCount(type);
    if (items.length !== expectedCount) return;

    // 2. Categorical Integrity check
    // Every item in a single clue must come from a different category.
    const uniqueCategories = new Set(items.map(item => item.cat));
    if (uniqueCategories.size !== items.length) return;

    // 3. Fingerprint Generation
    // Sort items by category, then by index to ensure canonical order
    const sortedItems = items.slice().sort((a, b) => {
      if (a.cat !== b.cat) return a.cat - b.cat;
      return a.idx - b.idx;
    });

    const fingerprintParts = sortedItems.map(i => `c${i.cat}:i${i.idx}`);
    const id = `${type}|${fingerprintParts.join('|')}`;

    // 4. Deduplicate and Store
    if (!this.map.has(id)) {
      const targets = sortedItems.map(i => ({ row: i.cat, item: i.idx }));
      this.map.set(id, { id, type, targets, isReversible: false });
    }
  }

  /**
   * Returns all stored unique clues.
   */
  public getRawPool(): Clue[] {
    return Array.from(this.map.values());
  }

  /**
   * Returns the expected number of items for a given clue type.
   */
  private getExpectedCount(type: ClueType): number {
    switch (type) {
      case 'VERTICAL_PAIR':
      case 'ADJACENT_PAIR':
      case 'SPACED_PAIR':
      case 'DIRECTIONAL':
        return 2;
      case 'VERTICAL_TRIPLE':
      case 'VERTICAL_OR':
      case 'ADJACENT_TRIO':
        return 3;
      default:
        return 0;
    }
  }
}

/**
 * The Central Orchestrator for Fact Harvesting
 * Instantiates the CluePool and delegates mapping to individual scanners.
 * 
 * @param groundTruth The 1D solution matrix
 * @param rows Number of categories
 * @param cols Number of items/columns
 * @returns An array of all safely deduplicated Clues
 */
export function harvestFacts(_groundTruth: Uint8Array, _rows: number, _cols: number): Clue[] {
  const pool = new CluePool();
  
  const verticalScanner = new VerticalScanner(pool, _groundTruth, _rows, _cols);
  verticalScanner.scan();
  
  return pool.getRawPool();
}
