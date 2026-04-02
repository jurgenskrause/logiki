import { GameState } from '../engine/GameState';
import { StructuralSieve } from '../engine/StructuralSieve';
import { TieringService } from '../engine/TieringService';
import { buildTopologyLibrary } from '../engine/PermutationGenerator';

async function test() {
    const N = 4;
    const rng = () => 0.99; // force numAnchors = 1
    const sieve = new StructuralSieve();
    const topoReport = buildTopologyLibrary(N, N, false);
    const tiering = new TieringService(topoReport.library);
    tiering.shuffle(rng);
    
    const telemetry = await sieve.generateAsync(tiering, N, N, async () => {}, rng);
    
    const activeClues = telemetry.clues.map(c => sieve.toActiveClue(c, telemetry.solution as any));
    const anchors = activeClues.filter(c => c.type === 'ANCHOR');
    console.log("Anchors generated:", anchors);

    const gs = new GameState(N, N);
    anchors.forEach((clue: any) => {
        if (clue.type === 'ANCHOR' && clue.targetCol !== undefined && clue.params?.[0]) {
            const { row, item } = clue.params[0];
            gs.confirmCell(row, clue.targetCol, item);
        }
    });

    console.log("GameState confirmed count:", [...gs.getConfirmedState()].filter(c => c === 1).length);
}

test().catch(console.error);
