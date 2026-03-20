import { buildTopologyLibrary } from './src/engine/PermutationGenerator';
import { TieringService } from './src/engine/TieringService';
import { StructuralSieve } from './src/engine/StructuralSieve';

// Simple Mulberry32 Seeded PRNG
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Parse command line arguments
// Example: tsx test-single-generator.ts --N=4 --M=4 --seed=12345
let N = 4;
let M = 4;
let seed = Math.floor(Math.random() * 1000000);

for (const arg of process.argv.slice(2)) {
    const key = arg.toLowerCase();
    if (key.startsWith('--n=')) N = parseInt(arg.substring(4), 10);
    else if (key.startsWith('--m=')) M = parseInt(arg.substring(4), 10);
    else if (key.startsWith('--seed=')) seed = parseInt(arg.substring(7), 10);
}

async function runSingle(runSeed: number, isQuiet: boolean): Promise<string> {
    const randomFn = mulberry32(runSeed);

    if (!isQuiet) console.log(`[1] Building/Loading Topology Library for ${N}x${M}...`);
    const libraryReport = buildTopologyLibrary(N, M);
    if (!isQuiet) console.log(`    -> Done. Time: ${libraryReport.timeMs.toFixed(2)}ms, Collisions: ${libraryReport.collisions}\n`);

    if (!isQuiet) console.log(`[2] Initiating Structural Sieve...`);
    const tieringService = new TieringService(libraryReport.library);
    tieringService.shuffle(randomFn);

    const sieve = new StructuralSieve();
    let resultString = '';
    
    try {
        const telemetry = await sieve.generateAsync(
            tieringService,
            N,
            M,
            async (canvas, stats, msg, entry) => {
                if (!isQuiet) console.log(`  [S:${stats.simple} M:${stats.moderate} C:${stats.complex}] -> ${msg}`);
            }
        );

        if (!isQuiet) {
            console.log(`\n================================`);
            console.log(`Generation SUCCESS!`);
            console.log(`================================`);
            console.log(`Total Clues Kept: ${telemetry.finalClues} (Target: ${telemetry.targetClues})`);
            console.log(`Time:             ${telemetry.timeMs.toFixed(2)}ms`);
            console.log(`Redundant Pruned: ${telemetry.prunedCount}`);
            
            console.log(`\nFinal Structural Recipe:`);
            telemetry.clues.forEach((c, idx) => {
                console.log(`${(idx + 1).toString().padStart(2, ' ')}. [${c.type}] ${c.slots.map(s => "R" + s.r + "C" + s.c).join(' ')}`);
            });
        }
        
        resultString = telemetry.clues.map((c, idx) => `${idx + 1}. [${c.type}] ` + c.slots.map(s => `R${s.r}C${s.c}`).join(' ')).join('\n');
        
    } catch (error: any) {
        if (!isQuiet) {
            console.error(`\n================================`);
            console.error(`Generation FAILED!`);
            console.error(`================================`);
            console.error(error.message || error);
            
            if (error.name === 'StalemateError') {
                console.error(`\n--- BREADCRUMBS ---`);
                console.error(`Accepted Clues (${error.acceptedClues.length}):`);
                error.acceptedClues.forEach((c: any, idx: number) => {
                    console.error(`  ${idx + 1}. [${c.type}] ${c.slots.map((s:any) => "R" + s.r + "C" + s.c).join(' ')}`);
                });
            }
        }
        resultString = `ERROR: ${error.name || error.message}`;
    }
    
    return resultString;
}

async function verifyDeterminism() {
    console.log(`\n================================`);
    console.log(`Logiki Single Puzzle Generator`);
    console.log(`================================`);
    console.log(`Parameters: N=${N}, M=${M}, Seed=${seed}\n`);

    const run1 = await runSingle(seed, false);
    
    console.log(`\n================================`);
    console.log(`Verifying Determinism (Run 2)...`);
    const run2 = await runSingle(seed, true);
    
    if (run1 === run2) {
        console.log(`✅ PASS: Run 2 produced the exact same output recipe.\n`);
        
        const numClues = run1.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('ERROR')).length;
        console.log(`================================`);
        console.log(`NUMBER OF CLUES GENERATED: ${numClues}`);
        console.log(`================================\n`);
        
        process.exit(0);
    } else {
        console.error(`❌ FAIL: Run 2 output did not match Run 1!`);
        process.exit(1);
    }
}

verifyDeterminism().catch(console.error);
