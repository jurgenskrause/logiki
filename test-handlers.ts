import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver, ActiveClue } from './src/engine/Solver';

// Ground truth 4x4 Grid
// row 0: items 0, 1, 2, 3
// row 1: items 3, 0, 1, 2
// row 2: items 1, 2, 3, 0
// row 3: items 2, 3, 0, 1
const N = 4; // height (rows)
const M = 4; // width (cols)
const truthGrid = [
    [0, 1, 2, 3], // row 0
    [3, 0, 1, 2], // row 1
    [1, 2, 3, 0], // row 2
    [2, 3, 0, 1]  // row 3
];

function getColForItem(row: number, item: number): number {
    return truthGrid[row].indexOf(item);
}

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

// Generate Truth Clues
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

// 1. VERTICAL_PAIR
const verticalPairClues: ActiveClue[] = [];
for (let c = 0; c < M; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = r1 + 1; r2 < N; r2++) {
            verticalPairClues.push({
                type: 'VERTICAL_PAIR',
                params: [ { row: r1, item: truthGrid[r1][c] }, { row: r2, item: truthGrid[r2][c] } ]
            });
        }
    }
}
runAndLog(verticalPairClues, 'VERTICAL_PAIR');

// 2. VERTICAL_NOT
const verticalNotClues: ActiveClue[] = [];
for (let c1 = 0; c1 < M; c1++) {
    for (let c2 = 0; c2 < M; c2++) {
        if (c1 === c2) continue;
        for (let r1 = 0; r1 < N; r1++) {
            for (let r2 = 0; r2 < N; r2++) {
                if (r1 === r2) continue;
                verticalNotClues.push({
                    type: 'VERTICAL_NOT',
                    params: [ { row: r1, item: truthGrid[r1][c1] }, { row: r2, item: truthGrid[r2][c2] } ]
                });
            }
        }
    }
}
// limit to 100 for brevity
runAndLog(verticalNotClues.slice(0, 100), 'VERTICAL_NOT(Sample)');

// 3. ADJACENT
const adjacentClues: ActiveClue[] = [];
for (let c = 0; c < M - 1; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = 0; r2 < N; r2++) {
            if (r1 === r2) continue;
            // A at c, B at c+1
            adjacentClues.push({
                type: 'ADJACENT',
                params: [ { row: r1, item: truthGrid[r1][c] }, { row: r2, item: truthGrid[r2][c+1] } ]
            });
            // swap A and B
            adjacentClues.push({
                type: 'ADJACENT',
                params: [ { row: r2, item: truthGrid[r2][c+1] }, { row: r1, item: truthGrid[r1][c] } ]
            });
        }
    }
}
runAndLog(adjacentClues, 'ADJACENT');

// 4. LEFT_OF
const leftOfClues: ActiveClue[] = [];
for (let c = 0; c < M - 1; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = 0; r2 < N; r2++) {
            if (r1 === r2) continue;
            // A at c, B at c+1
            leftOfClues.push({
                type: 'LEFT_OF', // A is to the left of B
                params: [ { row: r1, item: truthGrid[r1][c] }, { row: r2, item: truthGrid[r2][c+1] } ]
            });
        }
    }
}
runAndLog(leftOfClues, 'LEFT_OF');

// 5. SEQUENCE_THREE
const sequenceThreeClues: ActiveClue[] = [];
for (let c = 0; c < M - 2; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = 0; r2 < N; r2++) {
            for (let r3 = 0; r3 < N; r3++) {
                if (r1 === r2 || r1 === r3 || r2 === r3) continue;
                sequenceThreeClues.push({
                    type: 'SEQUENCE_THREE', // [0] = left, [1] = middle, [2] = right
                    params: [ 
                        { row: r1, item: truthGrid[r1][c] }, 
                        { row: r2, item: truthGrid[r2][c+1] },
                        { row: r3, item: truthGrid[r3][c+2] }
                    ]
                });
            }
        }
    }
}
runAndLog(sequenceThreeClues, 'SEQUENCE_THREE');

// 6. GAPPED_EXCLUSION (also uses GAPPED_NOT_MIDDLE handler)
// A (!B) C relationship means A at c, B is NOT at c+1, C is at c+2
// Which means B must be at any column EXCEPT c+1.
const gappedNotMiddleClues: ActiveClue[] = [];
for (let c = 0; c < M - 2; c++) {
    for (let r1 = 0; r1 < N; r1++) {
        for (let r2 = 0; r2 < N; r2++) {
            for (let r3 = 0; r3 < N; r3++) {
                if (r1 === r2 || r1 === r3 || r2 === r3) continue;
                
                // Pick a valid item for B that is NOT at c+1
                for (let bCol = 0; bCol < M; bCol++) {
                    if (bCol !== c + 1) {
                        gappedNotMiddleClues.push({
                            type: 'GAPPED_NOT_MIDDLE', 
                            params: [ 
                                { row: r1, item: truthGrid[r1][c] },     // A
                                { row: r2, item: truthGrid[r2][bCol] },  // B (which is not at c+1)
                                { row: r3, item: truthGrid[r3][c+2] }    // C
                            ]
                        });
                    }
                }
            }
        }
    }
}
runAndLog(gappedNotMiddleClues.slice(0, 100), 'GAPPED_NOT_MIDDLE(Sample)');

console.log(`\n===========================================`);
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
