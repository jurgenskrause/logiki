import { CluePool } from '../scanner';
import { VerticalScanner } from './VerticalScanner';

function runTest() {
  const rows = 4;
  const cols = 4;

  // Create a simple 4x4 ground truth
  // R0: 0, 1, 2, 3
  // R1: 0, 1, 2, 3
  // R2: 0, 1, 2, 3
  // R3: 0, 1, 2, 3
  // Here, item index = column index
  const groundTruth = new Uint8Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      groundTruth[r * cols + c] = c;
    }
  }

  const pool = new CluePool();
  const scanner = new VerticalScanner(pool, groundTruth, rows, cols);

  console.log('--- Running VerticalScanner Test (4x4) ---');
  scanner.scan();

  const clues = pool.getRawPool();

  const pairs = clues.filter(c => c.type === 'VERTICAL_PAIR');
  const triples = clues.filter(c => c.type === 'VERTICAL_TRIPLE');
  const ors = clues.filter(c => c.type === 'VERTICAL_OR');

  console.log(`Total Clues Found: ${clues.length}`);
  console.log(`VERTICAL_PAIR: ${pairs.length}`);
  console.log(`VERTICAL_TRIPLE: ${triples.length}`);
  console.log(`VERTICAL_OR: ${ors.length}`);

  // Expected Pairs: 4 columns * (4 choose 2) = 4 * 6 = 24
  // Expected Triples: 4 columns * (4 choose 3) = 4 * 4 = 16
  // Expected ORs: 4 columns * (4 choose 3) * 3 distractors = 4 * 4 * 3 = 48
  
  const passedPairs = pairs.length === 24;
  const passedTriples = triples.length === 16;
  const passedOrs = ors.length === 48;

  console.log('\n--- Test Results ---');
  console.log(`Pairs     (Expected 24):  ${passedPairs ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Triples   (Expected 16):  ${passedTriples ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Ors       (Expected 48):  ${passedOrs ? '✅ PASS' : '❌ FAIL'}`);

  // Inspect the first pair to verify mapping
  if (pairs.length > 0) {
    console.log('\n--- Sample VERTICAL_PAIR ---');
    console.log(JSON.stringify(pairs[0], null, 2));
  }
}

runTest();
