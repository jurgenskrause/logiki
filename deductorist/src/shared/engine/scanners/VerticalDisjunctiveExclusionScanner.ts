import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, getWeight, sortSlots, slotToken } from '../PermutationGenerator';
import type { TopologyScanner } from './TopologyScanner';

export class VerticalDisjunctiveExclusionScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    if (space.cols < 2) return;

    for (const sa of space.ALL_SLOTS) {
      // Unordered column pairs guarantee colB < colC, so each {colB,colC} pair is visited once
      for (let colB = 0; colB < space.cols - 1; colB++) {
        for (let colC = colB + 1; colC < space.cols; colC++) {
          // Exactly one of colB / colC must equal sa.c for XOR to hold
          const aMatchesB = sa.c === colB;
          const aMatchesC = sa.c === colC;
          if (aMatchesB === aMatchesC) continue; // neither or both — skip

          for (let rB = 0; rB < space.rows; rB++) {
            if (rB === sa.r) continue; // rowA ≠ rowB
            for (let rC = 0; rC < space.rows; rC++) {
              if (rC === sa.r) continue; // rowA ≠ rowC
              // rB === rC is allowed — B and C may share a row

              const sb = space.getSlot(rB, colB);
              const sc = space.getSlot(rC, colC);

              // ID: anchor A is primary; B and C are an unordered pair
              // (sortSlots on [sb, sc] gives deterministic B_C order in the ID)
              const sortedBC = sortSlots([sb, sc]);
              const id = `VDEX_${slotToken(sa)}_${slotToken(sortedBC[0])}_${slotToken(sortedBC[1])}`;
              
              manifest.addEntry({
                topologyID: id,
                type: 'VERTICAL_DISJUNCTIVE_EXCLUSION',
                slots: [sa, sortedBC[0], sortedBC[1]],
                weight: getWeight('VERTICAL_DISJUNCTIVE_EXCLUSION'),
              });
            }
          }
        }
      }
    }
  }
}
