import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight } from '../PermutationGenerator';
import { IS_SEQUENCE_THREE } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';


export class SequenceThreeScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
        for (let j = 0; j < total; j++) {
            if (i === j) continue;
            for (let k = 0; k < total; k++) {
                if (k === i || k === j) continue;
                
                const sa = slots[i];
                const sb = slots[j];
                const sc = slots[k];

                if (IS_SEQUENCE_THREE(sa, sb, sc)) {
                    // Logic: B is the pivot.
                    // Dedup: A, B, C and C, B, A are logically identical.
                    // We can choose the one where Slot ID of A < Slot ID of C.
                    if (sa.r < sc.r || (sa.r === sc.r && sa.c < sc.c)) {
                        manifest.addEntry({
                            topologyID: makeID('SEQUENCE_THREE', [sa, sb, sc]),
                            type: 'SEQUENCE_THREE',
                            slots: [sa, sb, sc],
                            weight: getWeight('SEQUENCE_THREE'),
                        });
                    }
                }
            }
        }
    }
  }
}
