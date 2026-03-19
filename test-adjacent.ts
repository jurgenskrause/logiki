import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver } from './src/engine/Solver';

function testAdjacent() {
  console.log("--- Testing ADJACENT (4x4) ---");
  const N = 4;
  
  // Clue: A(row0, item0), B(row1, item1)
  const clues = [
    {
      type: 'ADJACENT',
      targets: [
        { row: 0, item: 0 }, // A
        { row: 1, item: 1 }  // B
      ]
    }
  ];

  const solver = new Solver();

  // 1. Shadow Pruning (Boundary Check)
  console.log("\nTesting Pattern 1: Shadow Pruning (Edge Case)");
  const lc1 = new LogicCanvas(N);
  // Prune A from col 1. 
  // If A is in col 0, B must be in col 1.
  // If B is in col 0, A must be in col 1.
  // If A is pruned in col 1, B is impossible at col 0.
  lc1.prune(0, 1, 0); 
  solver.solve(clues, lc1);

  if (!lc1.isPossible(1, 0, 1)) {
    console.log("PASS: B correctly pruned from Col 0 because A's only neighbor (Col 1) is impossible.");
  } else {
    console.error("FAIL: B NOT pruned from Col 0.");
  }

  // 2. Anchor Propagation
  console.log("\nTesting Pattern 2: Anchor Propagation");
  const lc2 = new LogicCanvas(N);
  // Solve A at Col 0. This should restrict B to Col 1.
  lc2.isolateItem(0, 0, 0);
  solver.solve(clues, lc2);

  if (lc2.isItemSolvedAt(1, 1, 1)) {
    console.log("PASS: B correctly isolated in Col 1 because A is at Col 0.");
  } else {
    console.error("FAIL: B NOT isolated in Col 1.");
  }

  // 3. Shadow Pruning (Central)
  console.log("\nTesting Pattern 3: Shadow Pruning (Central)");
  const lc3 = new LogicCanvas(N);
  // Prune A from Col 0 and Col 2. 
  // B is at Col 1. Its neighbors are 0 and 2. 
  // If both are impossible for A, then B is impossible at 1.
  lc3.prune(0, 0, 0);
  lc3.prune(0, 2, 0);
  solver.solve(clues, lc3);

  if (!lc3.isPossible(1, 1, 1)) {
    console.log("PASS: B correctly pruned from Col 1 because all its A neighbors (0 and 2) are impossible.");
  } else {
    console.error("FAIL: B NOT pruned from Col 1.");
  }
}

testAdjacent();
