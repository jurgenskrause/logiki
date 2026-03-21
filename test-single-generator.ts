import { buildTopologyLibrary } from './src/engine/PermutationGenerator';
import { TieringService } from './src/engine/TieringService';
import { StructuralSieve } from './src/engine/StructuralSieve';
import { seededRandom } from './src/utils/random';
import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver } from './src/engine/Solver';
import { SolutionGrid } from './src/engine/SolutionGrid';
import { CoordinateSpace } from './src/engine/CoordinateSpace';

// Parse command line arguments
let N = 4;
let M = 4;
let seed = Math.floor(Math.random() * 0xFFFFFFFF);

for (const arg of process.argv.slice(2)) {
    const key = arg.toLowerCase();
    if (key.startsWith('--n=')) N = parseInt(arg.substring(4), 10);
    else if (key.startsWith('--m=')) M = parseInt(arg.substring(4), 10);
    else if (key.startsWith('--seed=')) seed = parseInt(arg.substring(7), 10);
}

async function runTestSingle() {
    console.log(`\n================================`);
    console.log(`Logiki Single Puzzle Verification`);
    console.log(`================================`);
    console.log(`Parameters: N=${N}, M=${M}, Seed=${seed}`);

    const rng = seededRandom(seed);
    const libraryReport = buildTopologyLibrary(N, M);
    const tieringService = new TieringService(libraryReport.library);
    tieringService.shuffle(rng);

    const sieve = new StructuralSieve();
    const telemetry = await sieve.generateAsync(
        tieringService,
        N,
        M,
        async (canvas, stats, msg, entry) => {
            const isProgress = msg.includes('⚡') || msg.includes('⚠️') || msg.includes('🧠');
            if (isProgress) {
              process.stdout.write(`\r  [Sieve] -> ${msg.padEnd(100)} `);
            } else {
              process.stdout.write(`\n  [Sieve] -> ${msg}\n`);
            }
        },
        rng
    );

    console.log(`\n================================`);
    console.log(`GENERATION TELEMETRY`);
    console.log(`================================`);
    console.log(`Time:            ${telemetry.timeMs.toFixed(2)}ms`);
    console.log(`Total Solves:    ${telemetry.totalSolves}`);
    console.log(`Backtrack Nodes: ${telemetry.backtrackNodes}`);
    console.log(`Initial Pool:    ${telemetry.initialClues}`);
    console.log(`Accepted Clues:  ${telemetry.unprunedClues.length}`);
    console.log(`Final Recipe:    ${telemetry.finalClues} clues`);

    // Prepare fresh solver for proof phase
    const space = new CoordinateSpace(N, M);
    const rngProof = seededRandom(seed);
    const solution = new SolutionGrid(space, rngProof);

    const hydrate = (entries: any[]) => entries.map(c => ({
        type: c.type,
        params: c.slots.map((s:any) => ({
            row: s.r,
            item: solution.getItemIndexAtSlot(s)
        })),
        targetCol: c.type.includes('ANCHOR') ? parseInt(c.topologyID.split('C')[1]) : undefined
    }));

    // --- PHASE 1: Proof with UNPRUNED CLUES ---
    console.log(`\n================================`);
    console.log(`PHASE 1: Solving with UNPRUNED Clues (${telemetry.unprunedClues.length})`);
    console.log(`================================`);
    
    const unprunedClues = hydrate(telemetry.unprunedClues);
    const canvasUnpruned = new LogicCanvas(N, M);
    const solver = new Solver();
    
    console.log(`Initial Entropy: ${canvasUnpruned.countTotalBits()} bits`);
    for(let i=0; i < unprunedClues.length; i++) {
        const c = unprunedClues[i];
        const prevBits = canvasUnpruned.countTotalBits();
        solver.solve([c], canvasUnpruned);
        const delta = prevBits - canvasUnpruned.countTotalBits();
        console.log(`  [Clue ${i+1}] Applying ${c.type}... Pruned: ${delta} bits`);
    }
    const resultUnpruned = solver.solve(unprunedClues, canvasUnpruned);
    console.log(`Unpruned result: ${resultUnpruned} (${canvasUnpruned.countTotalBits()} bits remaining)`);

    // --- PHASE 2: Proof with FINAL PRUNED CLUES ---
    console.log(`\n================================`);
    console.log(`PHASE 2: Solving with MINIMAL Clues (${telemetry.finalClues})`);
    console.log(`================================`);
    
    const finalClues = hydrate(telemetry.clues);
    const canvasFinal = new LogicCanvas(N, M);
    
    for(let i=0; i < finalClues.length; i++) {
        const c = finalClues[i];
        const prevBits = canvasFinal.countTotalBits();
        solver.solve([c], canvasFinal);
        const delta = prevBits - canvasFinal.countTotalBits();
        console.log(`  [Clue ${i+1}] Applying ${c.type}... Pruned: ${delta} bits`);
    }
    const resultFinal = solver.solve(finalClues, canvasFinal);
    console.log(`Final result: ${resultFinal} (${canvasFinal.countTotalBits()} bits remaining)`);

    if (resultFinal === 'SOLVED') {
        process.exit(0);
    } else {
        console.error("CRITICAL: Minimal clue set did not produce unique victory!");
        process.exit(1);
    }
}

runTestSingle().catch(console.error);
