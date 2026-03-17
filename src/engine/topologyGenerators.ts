import { GridTopology, type ConstraintTemplate } from './topology';

/**
 * Phase 3.1.2: The Columnar Generator (Verticals)
 * Mentally maps out every possible combination of vertical alignment across the grid.
 */
export class VerticalTopologyGenerator {
  private topology: GridTopology;

  constructor(topology: GridTopology) {
    this.topology = topology;
  }

  /**
   * Generates and returns all Vertical constraint templates for the given topology.
   */
  public generate(): ConstraintTemplate[] {
    const templates: ConstraintTemplate[] = [];

    templates.push(...this.generateVerticalPairs());
    templates.push(...this.generateVerticalTriples());
    templates.push(...this.generateVerticalOrs());

    return templates;
  }

  /**
   * 1. Vertical Pairs (Direct Link)
   * Finds every possible combination of two rows within every column.
   */
  private generateVerticalPairs(): ConstraintTemplate[] {
    const templates: ConstraintTemplate[] = [];
    const { GridWidth, GridHeight } = this.topology;

    for (let col = 0; col < GridWidth; col++) {
      for (let rowA = 0; rowA < GridHeight; rowA++) {
        for (let rowB = rowA + 1; rowB < GridHeight; rowB++) {
          const slotA = this.topology.toSlotID(rowA, col);
          const slotB = this.topology.toSlotID(rowB, col);
          
          templates.push(this.topology.createTemplate('VERTICAL_PAIR', [slotA, slotB]));
        }
      }
    }
    return templates;
  }

  /**
   * 2. Vertical Triples (The Columnar Trio)
   * Identifies three items that all share a single column.
   */
  private generateVerticalTriples(): ConstraintTemplate[] {
    const templates: ConstraintTemplate[] = [];
    const { GridWidth, GridHeight } = this.topology;

    // Only applicable if the grid height is 3 or more
    if (GridHeight < 3) return templates;

    for (let col = 0; col < GridWidth; col++) {
      for (let rowA = 0; rowA < GridHeight - 2; rowA++) {
        for (let rowB = rowA + 1; rowB < GridHeight - 1; rowB++) {
          for (let rowC = rowB + 1; rowC < GridHeight; rowC++) {
            const slotA = this.topology.toSlotID(rowA, col);
            const slotB = this.topology.toSlotID(rowB, col);
            const slotC = this.topology.toSlotID(rowC, col);
            
            templates.push(this.topology.createTemplate('VERTICAL_TRIPLE', [slotA, slotB, slotC]));
          }
        }
      }
    }
    return templates;
  }

  /**
   * 3. The Vertical "OR" (The Partial Match)
   * "Slot A is in the same column as either Slot B or Slot C."
   */
  private generateVerticalOrs(): ConstraintTemplate[] {
    const templates: ConstraintTemplate[] = [];
    const { GridWidth, GridHeight } = this.topology;

    // Grid needs to be at least 2 columns wide and 3 rows high for this specific logic 
    // (since we use rowA, rowB, rowC)
    if (GridWidth < 2 || GridHeight < 3) return templates;

    for (let targetCol = 0; targetCol < GridWidth; targetCol++) {
      for (let rowA = 0; rowA < GridHeight; rowA++) {
        for (let rowB = rowA + 1; rowB < GridHeight; rowB++) {
          for (let rowC = rowB + 1; rowC < GridHeight; rowC++) {
            
            const slotA = this.topology.toSlotID(rowA, targetCol);
            const slotB = this.topology.toSlotID(rowB, targetCol);

            for (let distractorCol = 0; distractorCol < GridWidth; distractorCol++) {
              // The distractor must be in a different column
              if (distractorCol === targetCol) continue;
              
              const slotC = this.topology.toSlotID(rowC, distractorCol);
              
              templates.push(this.topology.createTemplate('VERTICAL_OR', [slotA, slotB, slotC]));
            }
          }
        }
      }
    }
    return templates;
  }
}
