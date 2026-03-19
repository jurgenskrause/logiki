import { LogicCanvas } from './src/engine/LogicCanvas';
import { Solver } from './src/engine/Solver';

function testVerticalNotTrio() {
  console.log("--- Testing VERTICAL_NOT_TRIO (4x4) ---");
  const N = 4;

  // Clue: A(row0,item0) and B(row1,item1) share a column. C(row2,item2) is NOT in that column.
  const clues = [
    {
      type: 'VERTICAL_NOT_TRIO',
      params: [
        { row: 0, item: 0 }, // A
        { row: 1, item: 1 }, // B
        { row: 2, item: 2 }, // C
      ]
    }
  ];
  const solver = new Solver();

  // Pattern A: Vertical Sync (A <-> B)
  console.log("\nPattern A: Vertical Anchor Sync");
  const lc1 = new LogicCanvas(N, N);
  lc1.prune(0, 2, 0); // Prune A from col 2
  solver.solve(clues, lc1);
  if (!lc1.isPossible(1, 2, 1)) {
    console.log("PASS: B correctly pruned from Col 2 when A is pruned from Col 2.");
  } else {
    console.error("FAIL: B NOT pruned from Col 2.");
  }

  // Pattern B: Direct Exclusion (A solved -> C excluded)
  console.log("\nPattern B: Direct Exclusion");
  const lc2 = new LogicCanvas(N, N);
  lc2.isolateItem(0, 1, 0); // Solve A at col 1
  solver.solve(clues, lc2);
  if (!lc2.isPossible(2, 1, 2)) {
    console.log("PASS: C correctly pruned from Col 1 because A is solved there.");
  } else {
    console.error("FAIL: C NOT pruned from Col 1.");
  }

  // Pattern C: Inverse Exclusion (C solved -> A and B excluded)
  console.log("\nPattern C: Inverse Exclusion");
  const lc3 = new LogicCanvas(N, N);
  lc3.isolateItem(2, 3, 2); // Solve C at col 3
  solver.solve(clues, lc3);
  if (!lc3.isPossible(0, 3, 0) && !lc3.isPossible(1, 3, 1)) {
    console.log("PASS: A and B correctly pruned from Col 3 because C is solved there.");
  } else {
    console.error("FAIL: A/B NOT pruned from Col 3.");
  }

  // Pattern D: Shadow Pruning (C's last stand)
  console.log("\nPattern D: Shadow Pruning (C's last stand)");
  const lc4 = new LogicCanvas(N, N);
  // Prune C from all columns except col 0.
  lc4.prune(2, 1, 2);
  lc4.prune(2, 2, 2);
  lc4.prune(2, 3, 2);
  solver.solve(clues, lc4);
  if (!lc4.isPossible(0, 0, 0) && !lc4.isPossible(1, 0, 1)) {
    console.log("PASS: A and B pre-emptively pruned from Col 0 because it's C's only column.");
  } else {
    console.error("FAIL: Shadow pruning did not remove A/B from Col 0.");
  }
}

testVerticalNotTrio();
