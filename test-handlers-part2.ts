import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver, ActiveClue } from './src/engine/Solver';

// Ground truth 4x4 Grid
const N = 4; // height (rows)
const M = 4; // width (cols)
const truthGrid = [
    [0, 1, 2, 3], // row 0
    [3, 0, 1, 2], // row 1
    [1, 2, 3, 0], // row 2
    [2, 3, 0, 1]  // row 3
];

function verifyCanvas(canvas: LogicCanvas, testName: string, contextObj: any): boolean {
    let passed = true;
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < M; c++) {
            const trueItem = truthGrid[r][c];
            if (!canvas.isPossible(r, c, trueItem)) {
                console.error(`❌ [${testName}] FALSE PRUNE: row ${r}, col ${c} should allow item ${trueItem}`);
                console.error('Context:', contextObj);
                passed = false;
            }
        }
    }
    return passed;
}

function runClueTest(clue: ActiveClue): boolean {
    const canvas = new LogicCanvas(N, M);
    const solver = new Solver();
    solver.solve([clue], canvas);
    return verifyCanvas(canvas, clue.type, clue);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runAndLog(clues: ActiveClue[], typeName: string) {
    console.log(`\n--- Testing ${typeName} (${clues.length} clues) ---`);
    let failed = 0;
    for (const clue of clues) {
        totalTests++;
        if (!runClueTest(clue)) {
            failed++;
            failedTests++;
        } else {
            passedTests++;
        }
    }
    if (failed === 0) {
        console.log(`✅ All ${typeName} tests passed.`);
    } else {
        console.log(`❌ ${failed} ${typeName} tests failed!`);
    }
}

// 7. VERTICAL_TRIO
const verticalTrioClues: ActiveClue[] = [];
for (let c = 0; c < M; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = r1 + 1; r2 < N; r2++) {
            for (let r3 = r2 + 1; r3 < N; r3++) {
                verticalTrioClues.push({
                    type: 'VERTICAL_TRIO',
                    params: [ 
                        { row: r1, item: truthGrid[r1][c] }, 
                        { row: r2, item: truthGrid[r2][c] },
                        { row: r3, item: truthGrid[r3][c] }
                    ]
                });
            }
        }
    }
}
runAndLog(verticalTrioClues, 'VERTICAL_TRIO');

// 8. VERTICAL_NOT_TRIO
const verticalNotTrioClues: ActiveClue[] = [];
for (let c1 = 0; c1 < M; c1++) {
    for (let c2 = 0; c2 < M; c2++) {
        if (c1 === c2) continue; // C must be in different column
        
        for (let rA = 0; rA < N; rA++) {
            for (let rB = rA + 1; rB < N; rB++) {
                for (let rC = 0; rC < N; rC++) {
                    if (rC === rA || rC === rB) continue;
                    
                    verticalNotTrioClues.push({
                        type: 'VERTICAL_NOT_TRIO',
                        params: [
                            { row: rA, item: truthGrid[rA][c1] }, // A
                            { row: rB, item: truthGrid[rB][c1] }, // B
                            { row: rC, item: truthGrid[rC][c2] }  // C
                        ]
                    });
                }
            }
        }
    }
}
runAndLog(verticalNotTrioClues, 'VERTICAL_NOT_TRIO');

// 9. VERTICAL_DISJUNCTIVE_XOR
const xorClues: ActiveClue[] = [];
for (let c1 = 0; c1 < M; c1++) {
    for (let c2 = 0; c2 < M; c2++) {
        if (c1 === c2) continue;
        
        // A shares with B (c1), C is elsewhere (c2)
        for (let rA = 0; rA < N; rA++) {
            for (let rB = 0; rB < N; rB++) {
                for (let rC = 0; rC < N; rC++) {
                    if (rA === rB || rA === rC || rB === rC) continue;
                    
                    xorClues.push({
                        type: 'VERTICAL_DISJUNCTIVE_EXCLUSION',
                        params: [
                            { row: rA, item: truthGrid[rA][c1] }, // A
                            { row: rB, item: truthGrid[rB][c1] }, // B
                            { row: rC, item: truthGrid[rC][c2] }  // C
                        ]
                    });
                    
                    // A shares with C (c1), B is elsewhere (c2)
                    xorClues.push({
                        type: 'VERTICAL_DISJUNCTIVE_EXCLUSION',
                        params: [
                            { row: rA, item: truthGrid[rA][c1] }, // A
                            { row: rB, item: truthGrid[rB][c2] }, // B
                            { row: rC, item: truthGrid[rC][c1] }  // C
                        ]
                    });
                }
            }
        }
    }
}
runAndLog(xorClues.slice(0, 100), 'VERTICAL_DISJUNCTIVE_XOR(Sample)');

console.log(`\n Total Part 2 tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}`);
if (failedTests > 0) process.exit(1);
