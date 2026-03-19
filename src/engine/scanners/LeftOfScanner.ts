import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_LEFT_OF } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class LeftOfScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const si = slots[i];
        const sj = slots[j];

        if (IS_LEFT_OF(si, sj)) {
          const sorted = sortSlots([si, sj]);
          manifest.addEntry({
            topologyID: makeID('LEFT_OF', sorted),
            type: 'LEFT_OF',
            slots: sorted,
            weight: getWeight('LEFT_OF'),
          });
        }
        
        if (IS_LEFT_OF(sj, si)) {
          const sorted = sortSlots([sj, si]);
          manifest.addEntry({
            topologyID: makeID('LEFT_OF', sorted),
            type: 'LEFT_OF',
            slots: sorted,
            weight: getWeight('LEFT_OF'),
          });
        }
      }
    }
  }
}
