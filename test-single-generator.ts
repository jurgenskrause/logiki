import { buildTopologyLibrary } from './src/engine/PermutationGenerator';
import { TieringService } from './src/engine/TieringService';
import { StructuralSieve } from './src/engine/StructuralSieve';
import { seededRandom } from './src/utils/random';
import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver } from './src/engine/Solver';
import { SolutionGrid } from './src/engine/SolutionGrid';
import { CoordinateSpace } from './src/engine/CoordinateSpace';
import * as fs from 'fs';
import * as path from 'path';

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

    // Prepare solution grid early for hydration
    const space = new CoordinateSpace(N, M);
    const rngProof = seededRandom(seed); // Same seed for SolutionGrid
    const solution = new SolutionGrid(space, rngProof);

    const hydrate = (entries: any[]) => entries.map(c => ({
        type: c.type,
        params: c.slots.map((s: any) => ({
            row: s.r,
            item: solution.getItemIndexAtSlot(s)
        })),
        targetCol: c.type.includes('ANCHOR') ? parseInt(c.topologyID.split('C')[1]) : undefined
    }));

    const formatBitGrid = (canvas: LogicCanvas) => {
        let grid = `BIT GRID (N=${canvas.height}, M=${canvas.width})\n`;
        grid += `         ` + Array.from({length: canvas.width}, (_, i) => `Col ${i}`.padEnd(canvas.width + 3)).join('') + '\n';
        for (let r = 0; r < canvas.height; r++) {
            grid += `Row ${r}: `.padEnd(9);
            for (let c = 0; c < canvas.width; c++) {
                const mask = canvas.getMask(r, c);
                const bits = mask.toString(2).padStart(canvas.width, '0');
                grid += `[${bits}] `.padEnd(canvas.width + 3);
            }
            grid += '\n';
        }
        return grid;
    };

    const getEliminations = (before: LogicCanvas, after: LogicCanvas) => {
        const changes: string[] = [];
        for (let r = 0; r < before.height; r++) {
            for (let c = 0; c < before.width; c++) {
                const maskBefore = before.getMask(r, c);
                const maskAfter = after.getMask(r, c);
                if (maskBefore !== maskAfter) {
                    for (let i = 0; i < before.width; i++) {
                        if ((maskBefore & (1 << i)) && !(maskAfter & (1 << i))) {
                            changes.push(`R${r}C${c}:I${i}`);
                        }
                    }
                }
            }
        }
        return changes;
    };

    const writeDebugLog = (clues: any[], canvas: LogicCanvas | null, elimsPerClue: string[][], isFailed = false) => {
        const debugDir = path.join(process.cwd(), 'debug');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }
        const debugFile = path.join(debugDir, `${seed}.log`);
        let debugContent = isFailed ? `FAILED GENERATION LOG\n======================\n\n` : `SUCCESSFUL GENERATION LOG\n==========================\n\n`;
        
        if (canvas) {
            debugContent += formatBitGrid(canvas) + '\n\n';
        }

        debugContent += `GENERATED CLUES (${clues.length}):\n`;
        debugContent += clues.map((c, idx) => {
            const params = c.params.map((p: any) => `Row ${p.row}: Item ${p.item}`).join(', ');
            const target = c.targetCol !== undefined ? ` | Target Col: ${c.targetCol}` : '';
            const elims = elimsPerClue[idx] && elimsPerClue[idx].length > 0 
                ? `\n      -> Eliminated: ${elimsPerClue[idx].join(', ')}` 
                : ' [No change]';
            return `Clue ${String(idx + 1).padStart(2, '0')}: [${c.type.padEnd(20)}] ${params}${target}${elims}`;
        }).join('\n');
        
        fs.writeFileSync(debugFile, debugContent, 'utf-8');
        console.log(`[DEBUG] Final state written to ${debugFile}`);
    };

    const accumulatedClues: any[] = [];
    const sieve = new StructuralSieve();
    let latestCanvas: LogicCanvas | null = null;
    
    try {
        const telemetry = await sieve.generateAsync(
            tieringService,
            N,
            M,
            async (canvas, stats, msg, entry) => {
                latestCanvas = canvas;
                if (entry) {
                    if (msg.includes('Committed') || msg.includes('Anchor')) {
                        accumulatedClues.push(entry);
                    } else if (msg.includes('Pruned')) {
                        const idx = accumulatedClues.findIndex(c => c.topologyID === entry.topologyID);
                        if (idx !== -1) accumulatedClues.splice(idx, 1);
                    }
                }

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

        const finalClues = hydrate(telemetry.clues);

        // --- PHASE 2: Proof with FINAL PRUNED CLUES ---
        console.log(`\n================================`);
        console.log(`PHASE 2: Solving with MINIMAL Clues (${telemetry.finalClues})`);
        console.log(`================================`);
        
        const solver = new Solver();
        const canvasFinal = new LogicCanvas(N, M);
        const elimsPerClue: string[][] = [];
        
        for(let i=0; i < finalClues.length; i++) {
            const c = finalClues[i];
            const canvasBefore = canvasFinal.clone();
            const prevBits = canvasFinal.countTotalBits();
            solver.solve([c], canvasFinal);
            const delta = prevBits - canvasFinal.countTotalBits();
            const elims = getEliminations(canvasBefore, canvasFinal);
            elimsPerClue.push(elims);

            console.log(`  [Clue ${i+1}] Applying ${c.type}... Pruned: ${delta} bits`);
            if (elims.length > 0) {
                console.log(`      Eliminated: ${elims.join(', ')}`);
            }
        }
        const resultFinal = solver.solve(finalClues, canvasFinal);
        console.log(`Final result: ${resultFinal} (${canvasFinal.countTotalBits()} bits remaining)`);
        
        console.log(`\nFINAL BIT GRID:`);
        console.log(formatBitGrid(canvasFinal));

        writeDebugLog(finalClues, telemetry.finalCanvas, elimsPerClue);

        if (resultFinal === 'SOLVED') {
            process.exit(0);
        } else {
            console.error("CRITICAL: Minimal clue set did not produce unique victory!");
            process.exit(1);
        }
    } catch (err: any) {
        console.error(`\n\n[FATAL ERROR] ${err.message}`);
        const partialClues = hydrate(accumulatedClues);
        
        const solver = new Solver();
        const canvasPartial = new LogicCanvas(N, M);
        const partialElims: string[][] = [];
        for (const c of partialClues) {
            const before = canvasPartial.clone();
            solver.solve([c], canvasPartial);
            partialElims.push(getEliminations(before, canvasPartial));
        }

        if (latestCanvas) {
            console.log(`\nTERMINATION BIT GRID:`);
            console.log(formatBitGrid(latestCanvas));
        }

        writeDebugLog(partialClues, latestCanvas, partialElims, true);
        process.exit(1);
    }
}

runTestSingle().catch(console.error);
