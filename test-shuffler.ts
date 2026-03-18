import { CoordinateSpace } from './src/engine/CoordinateSpace.js';
import { TopologyManifest } from './src/engine/PermutationGenerator.js';
import { SelectionDeck } from './src/engine/SelectionDeck.js';

function runTest() {
  // Build a small manifest
  const space = new CoordinateSpace(4, 4);
  const manifest = new TopologyManifest();
  manifest.sweepPairs(space);
  manifest.sweepTriads(space);
  const library = manifest.finalizeLibrary();

  const seed1 = "17032026";
  const seed2 = "DIFFERENT";

  console.log("--- SEED 1 ---");
  const deck1A = new SelectionDeck(library, seed1);
  console.log("VERTICAL Deck 1:", deck1A.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID));
  console.log("ADJACENT Deck 1:", deck1A.getDeck('ADJACENT').slice(0, 3).map(e => e.topologyID));

  console.log("\n--- SEED 1 (Again) ---");
  const deck1B = new SelectionDeck(library, seed1);
  console.log("VERTICAL Deck 1B:", deck1B.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID));
  console.log("ADJACENT Deck 1B:", deck1B.getDeck('ADJACENT').slice(0, 3).map(e => e.topologyID));

  console.log("\n--- SEED 2 ---");
  const deck2 = new SelectionDeck(library, seed2);
  console.log("VERTICAL Deck 2:", deck2.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID));
  console.log("ADJACENT Deck 2:", deck2.getDeck('ADJACENT').slice(0, 3).map(e => e.topologyID));
}

runTest();
