import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_ADJACENT } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class AdjacentScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const si = slots[i];
        const sj = slots[j];

        if (IS_ADJACENT(si, sj)) {
          const sorted = sortSlots([si, sj]);
          manifest.addEntry({
            topologyID: makeID('ADJACENT', sorted),
            type: 'ADJACENT',
            slots: sorted,
            weight: getWeight('ADJACENT'),
          });
        }
      }
    }
  }
}
