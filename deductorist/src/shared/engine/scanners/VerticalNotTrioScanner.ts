import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, getWeight, sortSlots, slotToken } from '../PermutationGenerator';
import type { TopologyScanner } from './TopologyScanner';

export class VerticalNotTrioScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    if (space.cols < 2 || space.rows < 3) return;

    // Col(A) = i, Col(B) = i, Col(C) != i.
    // All items A, B, C must be from distinct category rows.
    for (let targetCol = 0; targetCol < space.cols; targetCol++) {
      for (let rA = 0; rA < space.rows - 1; rA++) {
        for (let rB = rA + 1; rB < space.rows; rB++) {
          
          const sa = space.getSlot(rA, targetCol);
          const sb = space.getSlot(rB, targetCol);
          const sortedAB = sortSlots([sa, sb]);

          for (let distractorCol = 0; distractorCol < space.cols; distractorCol++) {
            if (distractorCol === targetCol) continue;

            for (let rC = 0; rC < space.rows; rC++) {
              if (rC === rA || rC === rB) continue;

              const sc = space.getSlot(rC, distractorCol);
              
              const id = `VNOT3_${slotToken(sortedAB[0])}_${slotToken(sortedAB[1])}_NOT_${slotToken(sc)}`;
              
              manifest.addEntry({
                topologyID: id,
                type: 'VERTICAL_NOT_TRIO',
                slots: [sortedAB[0], sortedAB[1], sc],
                weight: getWeight('VERTICAL_NOT_TRIO'),
              });
            }
          }
        }
      }
    }
  }
}
