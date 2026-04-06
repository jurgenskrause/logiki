import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest, getWeight, sortSlots, slotToken } from '../PermutationGenerator';
import { IS_GAPPED_EXCLUSION } from '../RuleTemplates';
import type { TopologyScanner } from './TopologyScanner';

export class GappedExclusionScanner implements TopologyScanner {
  public scan(space: CoordinateSpace, manifest: TopologyManifest): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    // Identify all spans of exactly 2 columns (Anchor Pair A and C)
    for (let c = 0; c < space.cols - 2; c++) {
      const colA = c;
      const colC = c + 2;

      // Iterate through every possible Row-Pair for the Anchors
      for (let rA = 0; rA < space.rows; rA++) {
        for (let rC = 0; rC < space.rows; rC++) {
          const sa = space.getSlot(rA, colA);
          const sc = space.getSlot(rC, colC);

          // We now have our solid A and C anchors. 
          // Sweep the ENTIRE board to find every single safe B candidate.
          for (let i = 0; i < total; i++) {
            const slotSweep = slots[i];

            // If the tested slot is NOT in the gap, and is not A or C...
            if (IS_GAPPED_EXCLUSION(sa, sc, slotSweep)) {
              const sortedOuter = sortSlots([sa, sc]);
              const id = `GPEX_${slotToken(sortedOuter[0])}_${slotToken(sortedOuter[1])}_IS_${slotToken(slotSweep)}`;
              
              manifest.addEntry({
                topologyID: id,
                type: 'GAPPED_EXCLUSION',
                slots: [sortedOuter[0], sortedOuter[1], slotSweep],
                weight: getWeight('GAPPED_EXCLUSION'),
              });
            }
          }
        }
      }
    }
  }
}
