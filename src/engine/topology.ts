/**
 * Phase 3.1.1: Topology Schema & Coordinate ID System
 * Treats the grid as an empty mathematical coordinate plane.
 * Decoupled from items, categories, or the "ground truth" logic.
 */

export type TopologyType =
  | 'VERTICAL_PAIR'
  | 'ADJACENT_PAIR'
  | 'DIRECTIONAL_LEFT'
  | 'SPACED_PAIR'
  | string;

/**
 * Interface Definition: ConstraintTemplate
 * Represents a "Geometric Law" that is true for specific slots.
 */
export interface ConstraintTemplate {
  /** The logical category of the relationship */
  type: TopologyType;

  /** 
   * The SlotIDs involved, ALWAYS in ascending order to prevent duplicates.
   * (e.g., [5, 9] instead of [9, 5])
   */
  slots: number[];

  /** Optional spatial vectors required to render or interpret the clue (e.g., distance: 2) */
  metadata?: Record<string, any>;
}

/**
 * Coordinate System (The "SlotID")
 * Represents every physical cell in the grid mathematically as a unique integer.
 */
export class GridTopology {
  // Static Constants defining the dimensions of the generated topology
  public readonly GridWidth: number;
  public readonly GridHeight: number;

  constructor(width: number, height: number) {
    this.GridWidth = width;
    this.GridHeight = height;
  }

  /**
   * Maps 2D coordinates (row, col) to a 1D SlotID.
   * Both row and col must be zero-indexed.
   * Formula: SlotID = (row * GridWidth) + col
   */
  public toSlotID(row: number, col: number): number {
    if (row < 0 || row >= this.GridHeight) {
      throw new Error(`Row ${row} out of bounds (Height: ${this.GridHeight})`);
    }
    if (col < 0 || col >= this.GridWidth) {
      throw new Error(`Col ${col} out of bounds (Width: ${this.GridWidth})`);
    }

    const slotID = (row * this.GridWidth) + col;
    this.validateSlotID(slotID);
    return slotID;
  }

  /**
   * Maps a 1D SlotID back to 2D coordinates (row, col).
   * Both returned row and col are zero-indexed.
   */
  public fromSlotID(slotID: number): { row: number; col: number } {
    this.validateSlotID(slotID);

    const row = Math.floor(slotID / this.GridWidth);
    const col = slotID % this.GridWidth;

    return { row, col };
  }

  /**
   * Application Guardrail: Internal check to ensure any generated SlotID
   * never exceeds (Width * Height) - 1.
   */
  private validateSlotID(slotID: number): void {
    const maxID = (this.GridWidth * this.GridHeight) - 1;
    if (slotID < 0 || slotID > maxID) {
      throw new RangeError(`Constraint Error: SlotID ${slotID} exceeds maximum bounds of ${maxID}`);
    }
  }

  /**
   * Factory utility to generate a geometrically sound ConstraintTemplate.
   * Enforces the ascending order rule for SlotIDs.
   */
  public createTemplate(type: TopologyType, rawSlots: number[], metadata?: Record<string, any>): ConstraintTemplate {
    // Validate each slot before template creation
    rawSlots.forEach((slot) => this.validateSlotID(slot));

    // Ordering Rule: Sort ascending to prevent duplicates
    const sortedSlots = [...rawSlots].sort((a, b) => a - b);

    const template: ConstraintTemplate = {
      type,
      slots: sortedSlots,
    };

    if (metadata !== undefined) {
      template.metadata = metadata;
    }

    return template;
  }
}
