import { redis } from '@devvit/web/server';
import { buildTopologyLibrary } from '../../shared/engine/PermutationGenerator';
import { TieringService } from '../../shared/engine/TieringService';
import { StructuralSieve } from '../../shared/engine/StructuralSieve';

export function seedRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296; 
  };
}

export async function ensurePuzzle(targetDateStr: string, difficulty: number = 1) {
  const cacheKey = `puzzle_v2:${targetDateStr}:${difficulty}`;
  const cachedPuzzle = await redis.get(cacheKey);

  if (cachedPuzzle) {
    return JSON.parse(cachedPuzzle.toString());
  }

  const gridSizeMap: Record<number, number> = { 1: 4, 2: 6, 3: 8 };
  const gridSize = gridSizeMap[difficulty] || 4;
  const seed = `${targetDateStr}-${difficulty}`;
  const rng = seedRNG(seed);
  const sieve = new StructuralSieve();
  
  console.log(`[PuzzleCore] Generating puzzle ${cacheKey}...`);
  const topoReport = buildTopologyLibrary(gridSize, gridSize, false);
  const tiering = new TieringService(topoReport.library);
  tiering.shuffle(rng);

  const telemetry = await sieve.generateAsync(
      tiering, 
      gridSize, 
      gridSize, 
      async () => {}, 
      rng
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solGrid = (telemetry.solution as any).getRawSolution(gridSize, gridSize);
  
  // Use a simple buffer for hashing if web crypto isn't available in specific workers, 
  // but as it worked in API we keep it for consistency.
  const hashBuffer = await crypto.subtle.digest('SHA-256', solGrid as BufferSource);
  const integrityHash = Array.from(new Uint8Array(hashBuffer));
  
  const puzzleData = {
    rows: gridSize,
    cols: gridSize,
    difficulty,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clues: telemetry.clues.map((clue: any) => sieve.toActiveClue(clue, telemetry.solution as any)),
    integrityHash,
    date: targetDateStr
  };

  await redis.set(cacheKey, JSON.stringify(puzzleData));
  return puzzleData;
}
