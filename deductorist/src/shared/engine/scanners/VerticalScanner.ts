import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_VERTICAL } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class VerticalScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const si = slots[i];
        const sj = slots[j];

        if (IS_VERTICAL(si, sj)) {
          const sorted = sortSlots([si, sj]);
          manifest.addEntry({
            topologyID: makeID('VERTICAL', sorted),
            type: 'VERTICAL',
            slots: sorted,
            weight: getWeight('VERTICAL'),
          });
        }
      }
    }
  }
}
