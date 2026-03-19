import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_VERTICAL_TRIO } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class VerticalTrioScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    if (space.rows < 3) return;

    for (let col = 0; col < space.cols; col++) {
      for (let rA = 0; rA < space.rows - 2; rA++) {
        for (let rB = rA + 1; rB < space.rows - 1; rB++) {
          for (let rC = rB + 1; rC < space.rows; rC++) {
            const sa = space.getSlot(rA, col);
            const sb = space.getSlot(rB, col);
            const sc = space.getSlot(rC, col);

            if (IS_VERTICAL_TRIO(sa, sb, sc)) {
              const sorted = sortSlots([sa, sb, sc]);
              manifest.addEntry({
                topologyID: makeID('VERTICAL_TRIO', sorted),
                type: 'VERTICAL_TRIO',
                slots: sorted,
                weight: getWeight('VERTICAL_TRIO'),
              });
            }
          }
        }
      }
    }
  }
}
