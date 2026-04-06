import { getWeight, type TopologyLibrary, type TopologyEntry } from './PermutationGenerator';

/**
 * Phase 4.2.2: Tiered Stacking
 * Categorizes a generated TopologyLibrary into distinct stacks
 * representing Simple, Moderate, and Complex logical density.
 */
export class TieringService {
  public vSimpleStack: TopologyEntry[] = [];
  public vModerateStack: TopologyEntry[] = [];
  public vComplexStack: TopologyEntry[] = [];
  
  public hSimpleStack: TopologyEntry[] = [];
  public hModerateStack: TopologyEntry[] = [];
  public hComplexStack: TopologyEntry[] = [];
  
  public anchorStack: TopologyEntry[] = [];

  constructor(library: TopologyLibrary) {
    this.categorizeLibrary(library);
  }

  private categorizeLibrary(library: TopologyLibrary): void {
    const vEntries: TopologyEntry[] = [];
    for (const typeKey in library.VERTICAL) {
      vEntries.push(...library.VERTICAL[typeKey as keyof typeof library.VERTICAL]);
    }
    
    const hEntries: TopologyEntry[] = [];
    for (const typeKey in library.HORIZONTAL) {
      hEntries.push(...library.HORIZONTAL[typeKey as keyof typeof library.HORIZONTAL]);
    }

    for (const typeKey in library.ANCHOR) {
      this.anchorStack.push(...library.ANCHOR[typeKey as keyof typeof library.ANCHOR]);
    }

    // Sort into stacks based on the predefined topological weight
    for (const entry of vEntries) {
      const weight = getWeight(entry.type);
      if (weight === 1) this.vSimpleStack.push(entry);
      else if (weight === 2) this.vModerateStack.push(entry);
      else if (weight === 3) this.vComplexStack.push(entry);
    }
    
    for (const entry of hEntries) {
      const weight = getWeight(entry.type);
      if (weight === 1) this.hSimpleStack.push(entry);
      else if (weight === 2) this.hModerateStack.push(entry);
      else if (weight === 3) this.hComplexStack.push(entry);
    }
  }

  /**
   * Randomizes the internal stacks for puzzle generation setup.
   * Accepts a custom seeded random function to guarantee determinism.
   */
  public shuffle(randomFn: () => number = Math.random): void {
    this.shuffleArray(this.vSimpleStack, randomFn);
    this.shuffleArray(this.vModerateStack, randomFn);
    this.shuffleArray(this.vComplexStack, randomFn);
    this.shuffleArray(this.hSimpleStack, randomFn);
    this.shuffleArray(this.hModerateStack, randomFn);
    this.shuffleArray(this.hComplexStack, randomFn);
    this.shuffleArray(this.anchorStack, randomFn);
  }

  /** Fisher-Yates shuffle acting in-place */
  private shuffleArray(array: TopologyEntry[], randomFn: () => number): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
