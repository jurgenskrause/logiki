import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_VERTICAL_NOT } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class VerticalNotScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const si = slots[i];
        const sj = slots[j];

        if (IS_VERTICAL_NOT(si, sj)) {
          const sorted = sortSlots([si, sj]);
          manifest.addEntry({
            topologyID: makeID('VERTICAL_NOT', sorted),
            type: 'VERTICAL_NOT',
            slots: sorted,
            weight: getWeight('VERTICAL_NOT'),
          });
        }
      }
    }
  }
}
