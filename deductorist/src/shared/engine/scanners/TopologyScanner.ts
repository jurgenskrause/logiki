import { CoordinateSpace } from '../CoordinateSpace';
import { TopologyManifest } from '../PermutationGenerator';

export interface TopologyScanner {
  scan(space: CoordinateSpace, manifest: TopologyManifest): void;
}
