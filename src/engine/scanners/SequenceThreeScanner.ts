import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, makeID, getWeight, sortSlots } from '../PermutationGenerator';
import { IS_SEQUENCE_THREE } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';
import type { Slot } from '../CoordinateSpace';

export class SequenceThreeScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        for (let k = j + 1; k < total; k++) {
          const sa = slots[i];
          const sb = slots[j];
          const sc = slots[k];

          // Test permutations since IS_SEQUENCE_THREE checks specific ordering
          const orderings: [Slot, Slot, Slot][] = [
            [sa, sb, sc], [sa, sc, sb],
            [sb, sa, sc], [sb, sc, sa],
            [sc, sa, sb], [sc, sb, sa],
          ];

          for (const [a, b, c] of orderings) {
            if (IS_SEQUENCE_THREE(a, b, c)) {
              const sorted = sortSlots([a, b, c]);
              manifest.addEntry({
                topologyID: makeID('SEQUENCE_THREE', sorted),
                type: 'SEQUENCE_THREE',
                slots: sorted,
                weight: getWeight('SEQUENCE_THREE'),
              });
              // We've captured the sequence relationship for these three slots
              break; 
            }
          }
        }
      }
    }
  }
}
