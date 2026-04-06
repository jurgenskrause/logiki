import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight } from '../PermutationGenerator';
import { IS_LEFT_OF } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class LeftOfScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
        for (let j = 0; j < total; j++) {
            if (i === j) continue;
            const si = slots[i];
            const sj = slots[j];

            if (IS_LEFT_OF(si, sj)) {
                // DO NOT SORT: Order [si, sj] represents [Left, Right]
                manifest.addEntry({
                    topologyID: makeID('LEFT_OF', [si, sj]),
                    type: 'LEFT_OF',
                    slots: [si, sj],
                    weight: getWeight('LEFT_OF'),
                });
            }
        }
    }
  }
}
