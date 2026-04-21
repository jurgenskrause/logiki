import type { ActiveClue } from './Solver';
import type { GameSnapshot } from './GameState';
import type { LeaderboardResponse } from '../api';

// --- Binary Specification Constants (Matched with Packer) ---
const VERSION = 0x01;
const SECRET_SALT = 'logiki-daily-secret-2026';

export const ClueType = {
  VERTICAL: 0,
  LEFT_OF: 1,
  ADJACENT: 2,
  SEQUENCE_THREE: 3,
  VERTICAL_NOT: 4,
  VERTICAL_TRIO: 5,
  VERTICAL_NOT_TRIO: 6,
  GAPPED_NOT_MIDDLE: 7,
  DISJUNCTIVE_XOR: 8,
  NEGATIVE_ANCHOR: 9,
  ANCHOR: 10,
} as const;

// eslint-disable-next-line no-redeclare
export type ClueType = typeof ClueType[keyof typeof ClueType];

const TYPE_REVERSE_MAP: Record<number, string> = {
  [ClueType.VERTICAL]: 'VERTICAL',
  [ClueType.LEFT_OF]: 'LEFT_OF',
  [ClueType.ADJACENT]: 'ADJACENT',
  [ClueType.SEQUENCE_THREE]: 'SEQUENCE_THREE',
  [ClueType.VERTICAL_NOT]: 'VERTICAL_NOT',
  [ClueType.VERTICAL_TRIO]: 'VERTICAL_TRIO',
  [ClueType.VERTICAL_NOT_TRIO]: 'VERTICAL_NOT_TRIO',
  [ClueType.GAPPED_NOT_MIDDLE]: 'GAPPED_NOT_MIDDLE',
  [ClueType.DISJUNCTIVE_XOR]: 'DISJUNCTIVE_XOR',
  [ClueType.NEGATIVE_ANCHOR]: 'NEGATIVE_ANCHOR',
  [ClueType.ANCHOR]: 'ANCHOR',
};

export interface PuzzleManifest {
  rows: number;
  cols: number;
  difficulty: number;
  clues: ActiveClue[];
  integrityHash: Uint8Array;
  isRandom?: boolean;
  loadedSnapshot?: GameSnapshot;
  loadedElapsed?: number;
  isCompleted?: boolean;
  date?: string;
  loadedFullState?: GameSnapshot;
  preloadedLeaderboard?: LeaderboardResponse;
  preloadedUserRank?: number | null;
  loadedBinnedClues?: string[];
}

/**
 * ManifestLoader (Client-side)
 * Efficiently seek, hydrate and verify puzzles from a .bin manifest.
 */
export class ManifestLoader {
  private dataView: DataView | null = null;
  private buffer: ArrayBuffer | null = null;

  /**
   * Loads the binary manifest from a URL.
   */
  public async loadFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    this.loadFromBuffer(buffer);
  }

  /**
   * Loads the binary manifest from an existing ArrayBuffer.
   */
  public loadFromBuffer(buffer: ArrayBuffer): void {
    this.buffer = buffer;
    this.dataView = new DataView(this.buffer);

    // Verify Header (Magic Bytes: "LGK!")
    const magic = [
      this.dataView.getUint8(0),
      this.dataView.getUint8(1),
      this.dataView.getUint8(2),
      this.dataView.getUint8(3)
    ];
    
    const ver = this.dataView.getUint8(4);
    
    const isMagicValid = magic[0] === 0x4C && magic[1] === 0x47 && magic[2] === 0x4B && magic[3] === 0x21;

    if (!isMagicValid || ver !== VERSION) {
      throw new Error(`Invalid manifest format or version. Magic: ${magic.map(b => b.toString(16)).join(',')} Ver: ${ver}`);
    }
  }

  /**
   * Locates and hydrates a puzzle for a specific date and difficulty.
   */
  public async getPuzzle(dateStr: string, difficulty: number): Promise<PuzzleManifest | null> {
    if (!this.dataView || !this.buffer) throw new Error('Loader not initialized');

    // 1. Generate Seek Key (HMAC-SHA256)
    const key = await this.generateHmacKey(dateStr, difficulty);
    
    // 2. Binary Search or Seek in Index Table
    const entryCount = this.dataView.getUint32(8, true);
    const offsetInFile = this.findOffsetInIndexTable(key, entryCount);
    
    if (offsetInFile === -1) return null;

    // 3. Jump to Offset and Read Data Block
    return this.hydratePuzzle(offsetInFile);
  }

  /**
   * Verifies if the final game state matches the stored integrity hash.
   */
  public async verifyWin(finalSolution: Uint8Array, integrityHash: Uint8Array): Promise<boolean> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', finalSolution as BufferSource);
    const resultHash = new Uint8Array(hashBuffer);
    
    if (resultHash.length !== integrityHash.length) return false;
    for (let i = 0; i < resultHash.length; i++) {
      if (resultHash[i] !== integrityHash[i]) return false;
    }
    return true;
  }

  private async generateHmacKey(dateStr: string, difficulty: number): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET_SALT);
    const message = encoder.encode(`${dateStr}${difficulty}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', 
      keyData, 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
  }

  private findOffsetInIndexTable(targetKey: Uint8Array, count: number): number {
    if (!this.dataView) return -1;
    
    // Start of Index Table is at offset 16
    // Each entry is 36 bytes (32 key + 4 offset)
    for (let i = 0; i < count; i++) {
        const entryOffset = 16 + (i * 36);
        let match = true;
        for (let j = 0; j < 32; j++) {
            if (this.dataView.getUint8(entryOffset + j) !== targetKey[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return this.dataView.getUint32(entryOffset + 32, true);
        }
    }
    return -1;
  }

  private hydratePuzzle(offset: number): PuzzleManifest {
    if (!this.dataView) throw new Error('Loader not initialized');

    // 1. Metadata (2 bytes)
    const metadata = this.dataView.getUint16(offset, true);
    const rows = metadata & 0x0F;
    const cols = (metadata >> 4) & 0x0F;
    const difficulty = (metadata >> 8) & 0x0F;

    // 2. Clue Count (1 byte)
    const clueCount = this.dataView.getUint8(offset + 2);
    
    // 3. Clue Stream (clueCount * 4 bytes)
    const clues: ActiveClue[] = [];
    const clueStreamOffset = offset + 3;
    
    for (let i = 0; i < clueCount; i++) {
      const packed = this.dataView.getUint32(clueStreamOffset + (i * 4), true);
      clues.push(this.unpackClue(packed, `clue-${i}`));
    }

    // 4. Integrity Hash (32 bytes)
    const hashOffset = clueStreamOffset + (clueCount * 4);
    const integrityHash = new Uint8Array(this.buffer!.slice(hashOffset, hashOffset + 32));

    return { rows, cols, difficulty, clues, integrityHash };
  }

  private unpackClue(packed: number, id: string): ActiveClue {
    const typeInt = packed & 0x0F;
    const type = TYPE_REVERSE_MAP[typeInt] ?? 'UNKNOWN';

    const params: Array<{ row: number; item: number }> = [];

    // Param 1
    params.push({
      row: (packed >> 4) & 0x07,
      item: (packed >> 7) & 0x07,
    });

    // Param 2
    const p2Row = (packed >> 10) & 0x07;
    const p2Item = (packed >> 13) & 0x07;
    // Simple filter: if indices are 0 they might be valid, but we know 
    // clue params are usually valid row/item pairs.
    // In our packing logic, if they exist they are packed.
    // Note: VERTICAL is 2 params, SEQUENCE_THREE is 3 params.
    if (type !== 'ANCHOR' && type !== 'NEGATIVE_ANCHOR') {
        params.push({ row: p2Row, item: p2Item });
    }

    // Param 3
    if (type === 'SEQUENCE_THREE' || type.includes('TRIO') || type === 'DISJUNCTIVE_XOR' || type.includes('GAPPED')) {
        params.push({
            row: (packed >> 16) & 0x07,
            item: (packed >> 19) & 0x07,
        });
    }

    const targetCol = (packed >> 22) & 0x07;

    return {
      id,
      type,
      params,
      targetCol: (type === 'ANCHOR' || type === 'NEGATIVE_ANCHOR') ? targetCol : undefined
    };
  }
}
