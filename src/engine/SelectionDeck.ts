import { seededRandom, seedHash } from '../utils/random';
import type { TopologyLibrary, TopologyEntry, TopologyType } from './PermutationGenerator';

/**
 * Phase 3.2.1: The Seed-Based Shuffler
 * Transforms the deterministic but sequential Topology Library into a randomized "Selection Deck."
 * It uses the Mulberry32 PRNG initialized by the game seed so that every player
 * using the same seed encounters potential clues in the exact same sequence.
 * This is the bedrock of the deterministic engine.
 */
export class SelectionDeck {
  private decks: Record<TopologyType, TopologyEntry[]>;
  private _nextRandom: () => number;

  constructor(library: TopologyLibrary, seedString: string) {
    // 1. Requirement: Seed Synchronization
    // Use the 32-bit unsigned integer derived from the seed string
    const seedInt = seedHash(seedString);

    // 2. Mandatory Algorithm: Mulberry32
    // Initialize stateful function once at start of Selection Phase
    this._nextRandom = seededRandom(seedInt);

    // 4. Critical Constraints: Stability
    // Fixed Category Order: strictly shuffle categories in this order to keep PRNG sync.
    const categoriesToShuffle: TopologyType[] = [
      'VERTICAL',
      'ADJACENT',
      'LEFT_OF',
      'SEQUENCE_THREE',
      'GAPPED_EXCLUSION',
      'VERTICAL_TRIO',
      'VERTICAL_DISJUNCTIVE_EXCLUSION',
      'VERTICAL_NOT',
    ];

    // Initialize an empty record for the shuffled decks
    this.decks = {
      VERTICAL: [],
      ADJACENT: [],
      LEFT_OF: [],
      SEQUENCE_THREE: [],
      GAPPED_EXCLUSION: [],
      VERTICAL_TRIO: [],
      VERTICAL_DISJUNCTIVE_EXCLUSION: [],
      VERTICAL_NOT: [],
    };

    // 3. The Task: Per-Category Fisher-Yates Shuffle
    for (const category of categoriesToShuffle) {
      const sourceArray = library[category];
      
      // Pre-Sort Requirement: verify the source arrays are in alphabetical topologyID order
      this.verifyAlphabeticalOrder(sourceArray, category);

      // Clone: Create a shallow copy to keep Master Library immutable
      const deckCopy = [...sourceArray];

      // Shuffle: Iterate from the last element down to the first (i from n-1 to 1)
      for (let i = deckCopy.length - 1; i > 0; i--) {
        // Predictable Swap: Generate an index j using Mulberry32
        const j = Math.floor(this._nextRandom() * (i + 1));
        
        // Swap elements at i and j
        const temp = deckCopy[i];
        deckCopy[i] = deckCopy[j];
        deckCopy[j] = temp;
      }

      // Store the shuffled deck
      this.decks[category] = deckCopy;
    }
  }

  /**
   * Application Guardrail: Ensure the master library was passed in a guaranteed
   * alphabetical sorted state by topologyID.
   */
  private verifyAlphabeticalOrder(array: readonly TopologyEntry[], category: string): void {
    for (let i = 0; i < array.length - 1; i++) {
      if (array[i].topologyID.localeCompare(array[i + 1].topologyID) > 0) {
        throw new Error(
          `Pre-Sort Requirement Failed: category ${category} is not sorted alphabetically by topologyID.`
        );
      }
    }
  }

  /**
   * Retrieve the shuffled deck for a specific relationship type.
   */
  public getDeck(type: TopologyType): readonly TopologyEntry[] {
    return this.decks[type];
  }

  /**
   * Retrieve the current stateful PRNG to maintain determinism across the pipeline.
   * STRICT CONSTRAINT: Callers must not re-seed when mapping items to slots.
   */
  public get rng(): () => number {
    return this._nextRandom;
  }
}
