/// <reference lib="webworker" />
import { StructuralSieve } from '../../shared/engine/StructuralSieve';
import { buildTopologyLibrary } from '../../shared/engine/PermutationGenerator';
import { TieringService } from '../../shared/engine/TieringService';

function seedRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296; 
  };
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { seedParam, difficulty } = event.data;
  
  if (!seedParam || !difficulty) return;

  try {
    const gridSizeMap: Record<number, number> = { 1: 4, 2: 6, 3: 8 };
    const gridSize = gridSizeMap[difficulty] || 4;
    const rng = seedRNG(seedParam);
    const sieve = new StructuralSieve();
    
    // Extremely heavy CPU tasks generated off-thread here natively
    const topoReport = buildTopologyLibrary(gridSize, gridSize, false);
    const tiering = new TieringService(topoReport.library);
    tiering.shuffle(rng);
    
    const telemetry = await sieve.generateAsync(
      tiering, 
      gridSize, 
      gridSize, 
      async () => {}, // Sync UI progress hook omitted for performance
      rng
    );

    const solGrid = telemetry.solution!.getRawSolution(gridSize, gridSize);
    const hashBuffer = await self.crypto.subtle.digest('SHA-256', solGrid.buffer as ArrayBuffer);
    const integrityHash = Array.from(new Uint8Array(hashBuffer));

    // toActiveClue returns pure JSON-safe objects without class methods
    const clues = telemetry.clues.map(c => sieve.toActiveClue(c, telemetry.solution!));

    self.postMessage({
      status: 'success',
      payload: {
        rows: gridSize,
        cols: gridSize,
        difficulty,
        clues,
        integrityHash
      }
    });
  } catch (err) {
    self.postMessage({
      status: 'error',
      message: err instanceof Error ? err.message : 'Worker Fault'
    });
  }
});
