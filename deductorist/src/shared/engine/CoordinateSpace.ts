export class Slot {
  public readonly r: number;
  public readonly c: number;

  constructor(r: number, c: number) {
    this.r = r;
    this.c = c;
  }

  /**
   * Returns a string representation of the slot's coordinates for indexing.
   */
  public toString(): string {
    return `${this.r},${this.c}`;
  }

  /**
   * Alias for toString, used to get a unique key for the slot.
   */
  public toKey(): string {
    return this.toString();
  }
}

export class CoordinateSpace {
  public readonly rows: number;
  public readonly cols: number;
  
  /** 
   * The Coordinate Manifest: A flat, immutable list of all valid slots in the grid.
   */
  public readonly ALL_SLOTS: readonly Slot[];

  // Internal map for quick lookups
  private readonly slotMap: ReadonlyMap<string, Slot>;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;

    const slots: Slot[] = [];
    const map = new Map<string, Slot>();

    // The Process: Iterate through all rows (M) and all columns (N).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const slot = new Slot(r, c);
        slots.push(slot);
        map.set(slot.toKey(), slot);
      }
    }

    // Immutable Universe: make the array read-only.
    this.ALL_SLOTS = Object.freeze(slots);
    this.slotMap = map;
  }

  /**
   * Helper Utility: Returns the exact reference to a slot from the flat list.
   * Throws an error if the coordinates are out of bounds.
   */
  public getSlot(r: number, c: number): Slot {
    const slot = this.slotMap.get(`${r},${c}`);
    if (!slot) {
      throw new Error(`Slot coordinates out of bounds: r=${r}, c=${c}`);
    }
    return slot;
  }
}
