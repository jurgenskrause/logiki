import { getWeight, type TopologyLibrary, type TopologyEntry } from './PermutationGenerator';

/**
 * Phase 4.2.2: Tiered Stacking
 * Categorizes a generated TopologyLibrary into distinct stacks
 * representing Simple, Moderate, and Complex logical density.
 */
export class TieringService {
  public simpleStack: TopologyEntry[] = [];
  public moderateStack: TopologyEntry[] = [];
  public complexStack: TopologyEntry[] = [];

  constructor(library: TopologyLibrary) {
    this.categorizeLibrary(library);
  }

  private categorizeLibrary(library: TopologyLibrary): void {
    // Collect all isolated entries from the library index
    const allEntries: TopologyEntry[] = [];
    
    for (const typeKey in library.VERTICAL) {
      allEntries.push(...library.VERTICAL[typeKey as keyof typeof library.VERTICAL]);
    }
    for (const typeKey in library.HORIZONTAL) {
      allEntries.push(...library.HORIZONTAL[typeKey as keyof typeof library.HORIZONTAL]);
    }

    // Sort into stacks based on the predefined topological weight
    for (const entry of allEntries) {
      const weight = getWeight(entry.type);
      if (weight === 1) {
        this.simpleStack.push(entry);
      } else if (weight === 2) {
        this.moderateStack.push(entry);
      } else if (weight === 3) {
        this.complexStack.push(entry);
      }
    }
  }

  /**
   * Randomizes the internal stacks for puzzle generation setup.
   * Accepts a custom seeded random function to guarantee determinism.
   */
  public shuffle(randomFn: () => number = Math.random): void {
    this.shuffleArray(this.simpleStack, randomFn);
    this.shuffleArray(this.moderateStack, randomFn);
    this.shuffleArray(this.complexStack, randomFn);
  }

  /** Fisher-Yates shuffle acting in-place */
  private shuffleArray(array: TopologyEntry[], randomFn: () => number): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
