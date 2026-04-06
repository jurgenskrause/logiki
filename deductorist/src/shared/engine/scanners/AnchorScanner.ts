import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, getWeight, slotToken } from '../PermutationGenerator';
import type { TopologyScanner } from './TopologyScanner';

/**
 * Creates an absolute, direct assignment clue (ANCHOR) for every slot on the board.
 * Since an anchor assigns exactly one item to exactly one slot, there are M x N total anchors.
 * These are ultra-powerful clues kept in a separate manifest to act as emergency symmetry breakers.
 */
export class AnchorScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    for (const slot of space.ALL_SLOTS) {
      const id = `ANCHOR_${slotToken(slot)}`;
      manifest.addEntry({
        topologyID: id,
        type: 'ANCHOR',
        slots: [slot],
        weight: getWeight('ANCHOR'),
      });
    }
  }
}
