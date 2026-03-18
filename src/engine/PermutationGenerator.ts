/**
 * Phase 3.1.3: Permutation Generation — The Exhaustive Sweep
 *
 * Performs a one-time sweep of the CoordinateSpace, passing every valid
 * combination of 2 or 3 Slot objects through the Rule Template functions
 * from 3.1.2.  The results are cached for the session as the TopologyManifest.
 *
 * Rules:
 *  - No items, icons, seeds, or game state referenced here.
 *  - The manifest is identical for every game of the same M×N.
 *  - Slot references come from the CoordinateSpace (3.1.1).
 */

import { CoordinateSpace, type Slot } from './CoordinateSpace';
import {
  IS_ADJACENT,
  IS_VERTICAL,
  IS_LEFT_OF,
  IS_SEQUENCE_THREE,
  IS_GAPPED_EXCLUSION,
  IS_VERTICAL_TRIO,
  IS_VERTICAL_NOT,
} from './RuleTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TopologyType =
  | 'ADJACENT'
  | 'VERTICAL'
  | 'LEFT_OF'
  | 'SEQUENCE_THREE'
  | 'GAPPED_EXCLUSION'
  | 'VERTICAL_TRIO'
  | 'VERTICAL_DISJUNCTIVE_EXCLUSION'
  | 'VERTICAL_NOT';

export interface TopologyEntry {
  /** Deterministic, unique identifier for this geometric relationship. */
  topologyID: string;
  /** The category of relationship. */
  type: TopologyType;
  /** References to Slot objects from the CoordinateSpace (3.1.1). */
  slots: readonly Slot[];
  /** Complexity weight, assigned during 3.1.4. Defaults to 0 until then. */
  weight: number;
}

/** The structured, categorized, and immutable catalog of all valid clues. */
export type TopologyLibrary = Readonly<{
  [K in TopologyType]: readonly TopologyEntry[];
}>;

export interface TopologyAuditReport {
  library: TopologyLibrary;
  timeMs: number;
  collisions: number;
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/** Builds a slot token like "R2C3". */
function slotToken(s: Slot): string {
  return `R${s.r}C${s.c}`;
}

/** 
 * Sorts an array of slots deterministically by row then column.
 * Used for deduplication within topology IDs.
 */
function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r;
    return a.c - b.c;
  });
}

/** 
 * Gets the prefix for ID generation.
 */
function getPrefix(type: TopologyType): string {
  switch (type) {
    case 'ADJACENT': return 'ADJ';
    case 'VERTICAL': return 'VERT';
    case 'LEFT_OF': return 'LEFT';
    case 'SEQUENCE_THREE': return 'SEQ3';
    case 'GAPPED_EXCLUSION': return 'GPEX';
    case 'VERTICAL_TRIO': return 'VTRIO';
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION': return 'VDEX';
    case 'VERTICAL_NOT': return 'VNOT';
  }
}

function makeID(type: TopologyType, sortedSlots: Slot[]): string {
  return `${getPrefix(type)}_${sortedSlots.map(slotToken).join('_')}`;
}

function getWeight(type: TopologyType): number {
  switch (type) {
    case 'VERTICAL':
    case 'ADJACENT':
    case 'VERTICAL_NOT':
      return 1;
    case 'LEFT_OF':
    case 'SEQUENCE_THREE':
    case 'VERTICAL_TRIO':
      return 2;
    case 'GAPPED_EXCLUSION':
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
      return 3;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// TopologyManifest
// ---------------------------------------------------------------------------

export class TopologyManifest {
  private entries: Map<string, TopologyEntry> = new Map();
  public collisionCount: number = 0;

  /**
   * Finalizes the scanned entries into an organized, deterministic,
   * completely immutable Library index.
   */
  public finalizeLibrary(): TopologyLibrary {
    const all = Array.from(this.entries.values());

    const grouped = {
      ADJACENT: all.filter(e => e.type === 'ADJACENT').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL: all.filter(e => e.type === 'VERTICAL').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      LEFT_OF: all.filter(e => e.type === 'LEFT_OF').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      SEQUENCE_THREE: all.filter(e => e.type === 'SEQUENCE_THREE').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      GAPPED_EXCLUSION: all.filter(e => e.type === 'GAPPED_EXCLUSION').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_TRIO: all.filter(e => e.type === 'VERTICAL_TRIO').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_DISJUNCTIVE_EXCLUSION: all.filter(e => e.type === 'VERTICAL_DISJUNCTIVE_EXCLUSION').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_NOT: all.filter(e => e.type === 'VERTICAL_NOT').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
    };

    // Deep freeze the entire structure to guarantee Immutability
    Object.values(grouped).forEach(arr => {
      arr.forEach(entry => Object.freeze(entry.slots)); // Freeze the slot array
      arr.forEach(entry => Object.freeze(entry)); // Freeze the entry object
      Object.freeze(arr); // Freeze the array of entries
    });

    return Object.freeze(grouped) as TopologyLibrary;
  }

  private add(entry: TopologyEntry): void {
    if (!this.entries.has(entry.topologyID)) {
      this.entries.set(entry.topologyID, entry);
    } else {
      this.collisionCount++;
    }
  }

  /** Returns every unique geometric relationship discovered in the sweep. */
  public getAll(): TopologyEntry[] {
    return Array.from(this.entries.values());
  }

  /** Returns entries filtered by type. */
  public getByType(type: TopologyType): TopologyEntry[] {
    return this.getAll().filter(e => e.type === type);
  }

  // -------------------------------------------------------------------------
  // A. Pairwise Sweep (2-slot relationships)
  // -------------------------------------------------------------------------

  public sweepPairs(space: CoordinateSpace): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const si = slots[i];
        const sj = slots[j];

        if (IS_ADJACENT(si, sj)) {
          const sorted = sortSlots([si, sj]);
          this.add({
            topologyID: makeID('ADJACENT', sorted),
            type: 'ADJACENT',
            slots: sorted,
            weight: getWeight('ADJACENT'),
          });
        }

        if (IS_VERTICAL(si, sj)) {
          const sorted = sortSlots([si, sj]);
          this.add({
            topologyID: makeID('VERTICAL', sorted),
            type: 'VERTICAL',
            slots: sorted,
            weight: getWeight('VERTICAL'),
          });
        }

        if (IS_LEFT_OF(si, sj)) {
          const sorted = sortSlots([si, sj]);
          this.add({
            topologyID: makeID('LEFT_OF', sorted),
            type: 'LEFT_OF',
            slots: sorted,
            weight: getWeight('LEFT_OF'),
          });
        }
        
        if (IS_LEFT_OF(sj, si)) {
          const sorted = sortSlots([sj, si]);
          this.add({
            topologyID: makeID('LEFT_OF', sorted),
            type: 'LEFT_OF',
            slots: sorted,
            weight: getWeight('LEFT_OF'),
          });
        }
        
        if (IS_VERTICAL_NOT(si, sj)) {
          const sorted = sortSlots([si, sj]);
          this.add({
            topologyID: makeID('VERTICAL_NOT', sorted),
            type: 'VERTICAL_NOT',
            slots: sorted,
            weight: getWeight('VERTICAL_NOT'),
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // B. Vertical Triadic Sweep (column-aligned 3-slot relationships)
  // -------------------------------------------------------------------------

  public sweepVerticalTriads(space: CoordinateSpace): void {

    // 1. VERTICAL_TRIO Sweep
    // All combinations of 3 distinct rows sharing the same column: C(rows, 3) × cols
    if (space.rows >= 3) {
      for (let col = 0; col < space.cols; col++) {
        for (let rA = 0; rA < space.rows - 2; rA++) {
          for (let rB = rA + 1; rB < space.rows - 1; rB++) {
            for (let rC = rB + 1; rC < space.rows; rC++) {
              const sa = space.getSlot(rA, col);
              const sb = space.getSlot(rB, col);
              const sc = space.getSlot(rC, col);

              if (IS_VERTICAL_TRIO(sa, sb, sc)) {
                const sorted = sortSlots([sa, sb, sc]);
                this.add({
                  topologyID: makeID('VERTICAL_TRIO', sorted),
                  type: 'VERTICAL_TRIO',
                  slots: sorted,
                  weight: getWeight('VERTICAL_TRIO'),
                });
              }
            }
          }
        }
      }
    }

    // 2. VERTICAL_DISJUNCTIVE_EXCLUSION Sweep
    // Anchor = slot A. Pick an unordered pair of distinct columns {colB, colC}.
    // For each valid rowB ≠ rowA and rowC ≠ rowA, the XOR column check is
    // satisfied when exactly one of colB / colC equals colA.
    if (space.cols >= 2) {
      for (const sa of space.ALL_SLOTS) {
        // Unordered column pairs guarantee colB < colC, so each {colB,colC} pair is visited once
        for (let colB = 0; colB < space.cols - 1; colB++) {
          for (let colC = colB + 1; colC < space.cols; colC++) {
            // Exactly one of colB / colC must equal sa.c for XOR to hold
            const aMatchesB = sa.c === colB;
            const aMatchesC = sa.c === colC;
            if (aMatchesB === aMatchesC) continue; // neither or both — skip

            for (let rB = 0; rB < space.rows; rB++) {
              if (rB === sa.r) continue; // rowA ≠ rowB
              for (let rC = 0; rC < space.rows; rC++) {
                if (rC === sa.r) continue; // rowA ≠ rowC
                // rB === rC is allowed — B and C may share a row

                const sb = space.getSlot(rB, colB);
                const sc = space.getSlot(rC, colC);

                // ID: anchor A is primary; B and C are an unordered pair
                // (sortSlots on [sb, sc] gives deterministic B_C order in the ID)
                const sortedBC = sortSlots([sb, sc]);
                const id = `VDEX_${slotToken(sa)}_${slotToken(sortedBC[0])}_${slotToken(sortedBC[1])}`;
                this.add({
                  topologyID: id,
                  type: 'VERTICAL_DISJUNCTIVE_EXCLUSION',
                  slots: [sa, sortedBC[0], sortedBC[1]],
                  weight: getWeight('VERTICAL_DISJUNCTIVE_EXCLUSION'),
                });
              }
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // C. Horizontal / Gapped Triadic Sweep (3-slot relationships)
  // -------------------------------------------------------------------------

  public sweepTriads(space: CoordinateSpace): void {
    const slots = space.ALL_SLOTS;
    const total = slots.length;

    // 1. SEQUENCE_THREE Loop
    // Find all horizontal trios where S1, S2, S3 occupy consecutive columns
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        for (let k = j + 1; k < total; k++) {
          const sa = slots[i];
          const sb = slots[j];
          const sc = slots[k];

          // Test permutations since IS_SEQUENCE_THREE checks specific ordering
          const orderings: [Slot, Slot, Slot][] = [
            [sa, sb, sc], [sa, sc, sb],
            [sb, sa, sc], [sb, sc, sa],
            [sc, sa, sb], [sc, sb, sa],
          ];

          for (const [a, b, c] of orderings) {
            if (IS_SEQUENCE_THREE(a, b, c)) {
              const sorted = sortSlots([a, b, c]);
              this.add({
                topologyID: makeID('SEQUENCE_THREE', sorted),
                type: 'SEQUENCE_THREE',
                slots: sorted,
                weight: getWeight('SEQUENCE_THREE'),
              });
              // We've captured the sequence relationship for these three slots
              break; 
            }
          }
        }
      }
    }

    // 2. GAPPED_EXCLUSION Sweep (Triplet Expansion)
    // Identify all spans of exactly 2 columns (Anchor Pair A and C)
    for (let c = 0; c < space.cols - 2; c++) {
      const colA = c;
      const colC = c + 2;

      // Iterate through every possible Row-Pair for the Anchors
      for (let rA = 0; rA < space.rows; rA++) {
        for (let rC = 0; rC < space.rows; rC++) {
          const sa = space.getSlot(rA, colA);
          const sc = space.getSlot(rC, colC);

          // We now have our solid A and C anchors. 
          // Sweep the ENTIRE board to find every single safe B candidate.
          for (let i = 0; i < total; i++) {
            const slotSweep = slots[i];

            // If the tested slot is NOT in the gap, and is not A or C...
            if (IS_GAPPED_EXCLUSION(sa, sc, slotSweep)) {
              const sortedOuter = sortSlots([sa, sc]);
              const id = `GPEX_${slotToken(sortedOuter[0])}_${slotToken(sortedOuter[1])}_IS_${slotToken(slotSweep)}`;
              
              this.add({
                topologyID: id,
                type: 'GAPPED_EXCLUSION',
                slots: [sortedOuter[0], sortedOuter[1], slotSweep],
                weight: getWeight('GAPPED_EXCLUSION'),
              });
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — generate and cache the manifest for a given grid size
// ---------------------------------------------------------------------------

const _cache = new Map<string, TopologyAuditReport>();

/**
 * Generates (or retrieves from cache) the complete TopologyLibrary for the
 * given grid dimensions. Safe to call multiple times — only computed once
 * per unique M×N during the session.
 * 
 * @param forceAudit If true, bypasses the cache to measure raw generation time for UI analysis.
 */
export function buildTopologyLibrary(rows: number, cols: number, forceAudit: boolean = false): TopologyAuditReport {
  const key = `${rows}x${cols}`;
  if (!forceAudit && _cache.has(key)) {
    return _cache.get(key)!;
  }

  const startTime = performance.now();

  const space = new CoordinateSpace(rows, cols);
  const manifest = new TopologyManifest();

  manifest.sweepPairs(space);
  manifest.sweepVerticalTriads(space);
  manifest.sweepTriads(space);

  const library = manifest.finalizeLibrary();
  const endTime = performance.now();

  const report: TopologyAuditReport = {
    library,
    timeMs: endTime - startTime,
    collisions: manifest.collisionCount
  };

  _cache.set(key, report);
  return report;
}

