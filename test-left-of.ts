import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver } from './src/engine/Solver';

function testLeftOf() {
  console.log("--- Testing LEFT_OF (4x4) ---");
  const N = 4;
  
  // Clue: A(row0, item0) IS LEFT OF B(row1, item1)
  const clues = [
    {
      type: 'LEFT_OF',
      targets: [
        { row: 0, item: 0 }, // A
        { row: 1, item: 1 }  // B
      ]
    }
  ];

  const solver = new Solver();

  // 1. Boundary Pruning
  console.log("\nTesting Pattern 1: Boundary Pruning");
  const lc1 = new LogicCanvas(N);
  solver.solve(clues, lc1);

  if (!lc1.isPossible(0, 3, 0) && !lc1.isPossible(1, 0, 1)) {
    console.log("PASS: A cannot be at Col 3, B cannot be at Col 0.");
  } else {
    console.error("FAIL: Boundary pruning failed.");
  }

  // 2. Shadow Pruning
  console.log("\nTesting Pattern 2: Shadow Pruning");
  const lc2 = new LogicCanvas(N);
  // Prune B from col 2. If B is pruned from 2, then A cannot be in its left-neighbor (1).
  lc2.prune(1, 2, 1);
  solver.solve(clues, lc2);

  if (!lc2.isPossible(0, 1, 0)) {
    console.log("PASS: A correctly pruned from Col 1 because B is impossible at Col 2.");
  } else {
    console.error("FAIL: A NOT pruned from Col 1.");
  }

  // 3. Anchor Propagation
  console.log("\nTesting Pattern 3: Anchor Propagation");
  const lc3 = new LogicCanvas(N);
  // Solve A at Col 1. B is forced to Col 2.
  lc3.isolateItem(0, 1, 0);
  solver.solve(clues, lc3);

  if (lc3.isItemSolvedAt(1, 2, 1)) {
    console.log("PASS: B correctly isolated in Col 2 because A is solved at Col 1.");
  } else {
    console.error("FAIL: B NOT isolated in Col 2.");
  }
}

testLeftOf();
