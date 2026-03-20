import type { CoordinateSpace, Slot } from './CoordinateSpace';

/**
 * Phase 3.2.2: The Item-to-Slot Mapping (The "Answer Key")
 * 
 * Creates a deterministic "Universal Truth" mapped randomly using the exact same
 * PRNG sequence from the SelectionDeck. If the PRNG loses continuity,
 * the seed mapping will fracture.
 */
export class SolutionGrid {
  // Mapping of Slot's raw key (r,c) to a generic ItemID
  private readonly slotToItem = new Map<string, number>();
  
  // Mapping of a generic ItemID back to a Slot reference
  private readonly itemToSlot = new Map<number, Slot>();
  private readonly numCols: number;

  /**
   * @param space The complete topological coordinate bounds
   * @param nextRandom The *exact* stateful PRNG instance returned from SelectionDeck.rng
   */
  constructor(space: CoordinateSpace, nextRandom: () => number) {
    // The Categorized Row-by-Row Assignment
    const M = space.rows;
    const N = space.cols;
    this.numCols = N;

    for (let r = 0; r < M; r++) {
      // 1. Generate a "Column Deck" [0, 1, 2, ..., N-1]
      const colDeck = Array.from({ length: N }, (_, i) => i);

      // 2. Shuffle this Column Deck using Fisher-Yates and the PRNG state
      for (let i = colDeck.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        const temp = colDeck[i];
        colDeck[i] = colDeck[j];
        colDeck[j] = temp;
      }

      // 3. Assign items for Category r to the mapped slots
      for (let c = 0; c < N; c++) {
        // Item IDs sequentially for this row: (r * N) + 0...N-1
        const itemID = (r * N) + c;
        
        // The column this item will be placed in, according to the shuffled deck
        const assignedCol = colDeck[c];
        const slot = space.getSlot(r, assignedCol);

        this.slotToItem.set(slot.toKey(), itemID);
        this.itemToSlot.set(itemID, slot);
      }
    }
  }

  /**
   * Reality Check Query
   * Looks up the ItemID sitting at a specific Slot coordinates.
   */
  public getItemAtSlot(slot: Slot): number {
    const itemID = this.slotToItem.get(slot.toKey());
    if (itemID === undefined) {
      throw new Error(`Critical Fault: Missing Item mapping at slot ${slot.toKey()}`);
    }
    return itemID;
  }

  /**
   * Reality Check Query
   * Resolves the Slot location for a specific ItemID.
   */
  public getSlotOfItem(itemID: number): Slot {
    const slot = this.itemToSlot.get(itemID);
    if (!slot) {
      throw new Error(`Critical Fault: Missing Slot mapping for item ${itemID}`);
    }
    return slot;
  }

  /**
   * Returns the row-local item index [0, N-1] for the item sitting in the given slot.
   */
  public getItemIndexAtSlot(slot: Slot): number {
    const itemID = this.getItemAtSlot(slot);
    // ItemID = r * N + c. Row r = slot.r. N = this._width (space.cols).
    // So c = itemID - (r * N).
    // We need to know N.
    // Let's store N in the class.
    return itemID % this.numCols;
  }
}
