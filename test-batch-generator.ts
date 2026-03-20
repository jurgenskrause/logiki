import { buildTopologyLibrary } from './src/engine/PermutationGenerator';
import { TieringService } from './src/engine/TieringService';
import { StructuralSieve } from './src/engine/StructuralSieve';

// Parse command line arguments
// Example: tsx test-batch-generator.ts --N=4 --M=4 --count=10
let N = 4;
let M = 4;
let count = 10;

for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--N=')) N = parseInt(arg.substring(4), 10);
    else if (arg.startsWith('--M=')) M = parseInt(arg.substring(4), 10);
    else if (arg.startsWith('--count=')) count = parseInt(arg.substring(8), 10);
}

console.log(`\n================================`);
console.log(`Logiki Batch Puzzle Generator`);
console.log(`================================`);
console.log(`Parameters: N=${N}, M=${M}, count=${count}\n`);

async function runBatch() {
    console.log(`[1] Building Topology Library for ${N}x${M}...`);
    const libraryReport = buildTopologyLibrary(N, M);
    console.log(`    -> Done. Time: ${libraryReport.timeMs.toFixed(2)}ms, Collisions: ${libraryReport.collisions}`);

    let passed = 0;
    let failed = 0;
    let totalTime = 0;

    for (let i = 1; i <= count; i++) {
        // We use Math.random for shuffling the tiering service for random puzzles
        const tieringService = new TieringService(libraryReport.library);
        tieringService.shuffle(Math.random);

        const sieve = new StructuralSieve();
        
        try {
            const telemetry = await sieve.generateAsync(
                tieringService,
                N,
                M,
                async (canvas, stats, msg, entry) => {
                    if (msg.includes('⚓')) {
                        process.stdout.write(`\n  ${msg}\n`);
                    }
                }
            );

            passed++;
            totalTime += telemetry.timeMs;
            process.stdout.write('✅');
        } catch (error: any) {
            failed++;
            process.stdout.write('❌');
            console.error(`\n\n[Failure in Puzzle #${i}]`);
            console.error(error.message || error);
            
            if (error.name === 'StalemateError') {
                console.error(`\n--- BREADCRUMBS ---`);
                console.error(`Accepted Clues (${error.acceptedClues.length}):`);
                error.acceptedClues.forEach((c: any, idx: number) => {
                    console.error(`  ${idx + 1}. [${c.type}] ${c.slots.map((s:any) => "R" + s.r + "C" + s.c).join(' ')}`);
                });
                console.error(`\nFinal Canvas State (bits right-to-left: Item 0, Item 1, etc):`);
                
                const canvas = error.canvas;
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < M; c++) {
                        const mask = canvas.getMask(r, c);
                        const bits = mask.toString(2).padStart(M, '0').split('').reverse().join('');
                        const solvedText = canvas.isSolved(r, c) ? `SOLVED as Item ${canvas.getSolvedItemIndex(r,c)}` : 'ambiguous';
                        console.error(`  R${r}C${c} -> [${bits}] (${solvedText})`);
                    }
                }
                console.error(`-------------------\n`);
            } else {
                if (error.deadCells) console.error(`Dead Cells:`, error.deadCells);
                if (error.offendingEntry) console.error(`Offending Clue:`, error.offendingEntry.type, error.offendingEntry.slots);
            }
        }
        
        if (i % 50 === 0) console.log(` (${i}/${count})`);
    }

    console.log(`\n\n================================`);
    console.log(`Batch Generation Complete`);
    console.log(`================================`);
    console.log(`Total Puzzles: ${count}`);
    console.log(`Success Rate:  ${((passed / count) * 100).toFixed(1)}%`);
    console.log(`Total Passed:  ${passed}`);
    console.log(`Total Failed:  ${failed}`);
    if (passed > 0) {
        console.log(`Avg Gen Time:  ${(totalTime / passed).toFixed(2)}ms (successful puzzles)`);
    }

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runBatch().catch(console.error);
