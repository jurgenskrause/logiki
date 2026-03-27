import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { StructuralSieve } from '../engine/StructuralSieve';
import { TieringService } from '../engine/TieringService';
import { buildTopologyLibrary } from '../engine/PermutationGenerator';
import type { ActiveClue } from '../engine/Solver';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Binary Specification Constants ---
const MAGIC_BYTES = Buffer.from([0x4C, 0x47, 0x4B, 0x21]); // "LGK!"
const VERSION = 0x01;
const SECRET_SALT = 'logiki-daily-secret-2026'; 

enum ClueType {
  VERTICAL = 0,
  LEFT_OF = 1,
  ADJACENT = 2,
  SEQUENCE_THREE = 3,
  VERTICAL_NOT = 4,
  VERTICAL_TRIO = 5,
  VERTICAL_NOT_TRIO = 6,
  GAPPED_NOT_MIDDLE = 7,
  DISJUNCTIVE_XOR = 8,
  NEGATIVE_ANCHOR = 9,
  ANCHOR = 10,
}

const TYPE_MAP: Record<string, ClueType> = {
  'VERTICAL': ClueType.VERTICAL,
  'VERTICAL_PAIR': ClueType.VERTICAL,
  'LEFT_OF': ClueType.LEFT_OF,
  'ADJACENT': ClueType.ADJACENT,
  'SEQUENCE_THREE': ClueType.SEQUENCE_THREE,
  'VERTICAL_NOT': ClueType.VERTICAL_NOT,
  'VERTICAL_TRIO': ClueType.VERTICAL_TRIO,
  'VERTICAL_NOT_TRIO': ClueType.VERTICAL_NOT_TRIO,
  'GAPPED_NOT_MIDDLE': ClueType.GAPPED_NOT_MIDDLE,
  'GAPPED_EXCLUSION': ClueType.GAPPED_NOT_MIDDLE,
  'DISJUNCTIVE_XOR': ClueType.DISJUNCTIVE_XOR,
  'VERTICAL_DISJUNCTIVE_EXCLUSION': ClueType.DISJUNCTIVE_XOR,
  'NEGATIVE_ANCHOR': ClueType.NEGATIVE_ANCHOR,
  'ANCHOR': ClueType.ANCHOR,
};

function packClue(clue: ActiveClue): number {
  const type = TYPE_MAP[clue.type] ?? 0;
  let packed = type & 0x0F; 

  if (clue.params[0]) {
    packed |= (clue.params[0].row & 0x07) << 4;  
    packed |= (clue.params[0].item & 0x07) << 7; 
  }

  if (clue.params[1]) {
    packed |= (clue.params[1].row & 0x07) << 10; 
    packed |= (clue.params[1].item & 0x07) << 13; 
  }

  if (clue.params[2]) {
    packed |= (clue.params[2].row & 0x07) << 16; 
    packed |= (clue.params[2].item & 0x07) << 19; 
  }

  if (clue.targetCol !== undefined) {
    packed |= (clue.targetCol & 0x07) << 22; 
  }

  return packed >>> 0; 
}

async function generateManifest() {
  const entryCount = 35; 
  const indexEntries: Array<{ key: Buffer; offset: number }> = [];
  const dataBlocks: Buffer[] = [];
  
  let currentOffset = 16 + (entryCount * 36); 

  const sieve = new StructuralSieve();

  console.log(`Starting manifest generation for ${entryCount} puzzles...`);

  const startDate = new Date('2026-03-30');

  for (let d = 0; d < 7; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    for (let level = 1; level <= 5; level++) {
      const gridSize = level + 3;
      console.log(`Generating: ${dateStr} | Level ${level} (${gridSize}x${gridSize})`);

      const seed = `${dateStr}-${level}`;
      const rng = seedRNG(seed);
      
      const topoReport = buildTopologyLibrary(gridSize, gridSize, false);
      const tiering = new TieringService(topoReport.library);
      tiering.shuffle(rng);
      
      const telemetry = await sieve.generateAsync(
        tiering, 
        gridSize, 
        gridSize, 
        async () => {}, 
        rng
      );

      const metadata = (gridSize & 0x0F) | ((gridSize & 0x0F) << 4) | ((level & 0x0F) << 8);
      const metaBuffer = Buffer.alloc(2);
      metaBuffer.writeUInt16LE(metadata);

      const clueCount = Buffer.from([telemetry.clues.length]);

      const clueStream = Buffer.alloc(telemetry.clues.length * 4);
      telemetry.clues.forEach((topologyEntry, index) => {
        const activeClue = sieve.toActiveClue(topologyEntry, telemetry.solution as any);
        clueStream.writeUInt32LE(packClue(activeClue), index * 4);
      });

      const solGrid = (telemetry.solution as any).getRawSolution(gridSize, gridSize);
      const integrityHash = crypto.createHash('sha256').update(solGrid).digest();

      const dataBlock = Buffer.concat([metaBuffer, clueCount, clueStream, integrityHash]);
      dataBlocks.push(dataBlock);

      const hmac = crypto.createHmac('sha256', SECRET_SALT);
      hmac.update(`${dateStr}${level}`);
      const key = hmac.digest();
      
      indexEntries.push({ key, offset: currentOffset });
      
      currentOffset += dataBlock.length;
    }
  }

  const header = Buffer.alloc(16);
  MAGIC_BYTES.copy(header, 0);
  header.writeUInt8(VERSION, 4);
  header.writeUInt32LE(entryCount, 8);
  
  const checksum = 0; 
  header.writeUInt32LE(checksum, 12);

  const indexTable = Buffer.concat(indexEntries.map(e => {
    const entry = Buffer.alloc(36);
    e.key.copy(entry, 0);
    entry.writeUInt32LE(e.offset, 32);
    return entry;
  }));

  const finalBlob = Buffer.concat([header, indexTable, ...dataBlocks]);

  const outPath = path.join(__dirname, '../../public/daily.bin');
  fs.writeFileSync(outPath, finalBlob);

  console.log(`Success! Manifest written to ${outPath} (${finalBlob.length} bytes)`);
}

function seedRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296; 
  };
}

generateManifest().catch(console.error);
