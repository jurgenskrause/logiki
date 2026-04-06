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
import { AdjacentScanner } from './scanners/AdjacentScanner';
import { VerticalScanner } from './scanners/VerticalScanner';
import { LeftOfScanner } from './scanners/LeftOfScanner';
import { VerticalNotScanner } from './scanners/VerticalNotScanner';
import { VerticalTrioScanner } from './scanners/VerticalTrioScanner';
import { VerticalDisjunctiveExclusionScanner } from './scanners/VerticalDisjunctiveExclusionScanner';
import { SequenceThreeScanner } from './scanners/SequenceThreeScanner';
import { GappedExclusionScanner } from './scanners/GappedExclusionScanner';
import { VerticalNotTrioScanner } from './scanners/VerticalNotTrioScanner';
import { AnchorScanner } from './scanners/AnchorScanner';
import type { TopologyScanner } from './scanners/TopologyScanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ANCHOR_TYPES = ['ANCHOR'] as const;
export type AnchorType = typeof ANCHOR_TYPES[number];

export const VERTICAL_TYPES = [
  'VERTICAL',
  'VERTICAL_NOT',
  'VERTICAL_TRIO',
  'VERTICAL_DISJUNCTIVE_EXCLUSION',
  'VERTICAL_NOT_TRIO',
] as const;

export const HORIZONTAL_TYPES = [
  'ADJACENT',
  'LEFT_OF',
  'SEQUENCE_THREE',
  'GAPPED_EXCLUSION',
] as const;

export type VerticalType = typeof VERTICAL_TYPES[number];
export type HorizontalType = typeof HORIZONTAL_TYPES[number];
export type TopologyType = VerticalType | HorizontalType | AnchorType;

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
  VERTICAL: Readonly<{ [K in VerticalType]: readonly TopologyEntry[] }>;
  HORIZONTAL: Readonly<{ [K in HorizontalType]: readonly TopologyEntry[] }>;
  ANCHOR: Readonly<{ [K in AnchorType]: readonly TopologyEntry[] }>;
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
export function slotToken(s: Slot): string {
  return `R${s.r}C${s.c}`;
}

/** 
 * Sorts an array of slots deterministically by row then column.
 * Used for deduplication within topology IDs.
 */
export function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r;
    return a.c - b.c;
  });
}

/** 
 * Gets the prefix for ID generation.
 */
export function getPrefix(type: TopologyType): string {
  switch (type) {
    case 'ADJACENT': return 'ADJ';
    case 'VERTICAL': return 'VERT';
    case 'LEFT_OF': return 'LEFT';
    case 'SEQUENCE_THREE': return 'SEQ3';
    case 'GAPPED_EXCLUSION': return 'GPEX';
    case 'VERTICAL_TRIO': return 'VTRIO';
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION': return 'VDEX';
    case 'VERTICAL_NOT_TRIO': return 'VNOT3';
    case 'VERTICAL_NOT': return 'VNOT';
    case 'ANCHOR': return 'ANC';
  }
}

export function makeID(type: TopologyType, slots: Slot[]): string {
  return `${getPrefix(type)}_${slots.map(slotToken).join('_')}`;
}

export function getWeight(type: TopologyType): number {
  switch (type) {
    case 'VERTICAL':
    case 'ADJACENT':
    case 'VERTICAL_NOT':
      return 1;
    case 'LEFT_OF':
    case 'SEQUENCE_THREE':
    case 'VERTICAL_TRIO':
    case 'VERTICAL_NOT_TRIO':
      return 2;
    case 'GAPPED_EXCLUSION':
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
      return 3;
    case 'ANCHOR':
      return 10; // Extra heavy weight to ensure it sits above all relations
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

    const vertical = {
      VERTICAL: all.filter(e => e.type === 'VERTICAL').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_NOT: all.filter(e => e.type === 'VERTICAL_NOT').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_TRIO: all.filter(e => e.type === 'VERTICAL_TRIO').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_DISJUNCTIVE_EXCLUSION: all.filter(e => e.type === 'VERTICAL_DISJUNCTIVE_EXCLUSION').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      VERTICAL_NOT_TRIO: all.filter(e => e.type === 'VERTICAL_NOT_TRIO').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
    };

    const horizontal = {
      ADJACENT: all.filter(e => e.type === 'ADJACENT').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      LEFT_OF: all.filter(e => e.type === 'LEFT_OF').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      SEQUENCE_THREE: all.filter(e => e.type === 'SEQUENCE_THREE').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
      GAPPED_EXCLUSION: all.filter(e => e.type === 'GAPPED_EXCLUSION').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
    };

    const anchor = {
      ANCHOR: all.filter(e => e.type === 'ANCHOR').sort((a, b) => a.topologyID.localeCompare(b.topologyID)),
    };

    const library = {
      VERTICAL: vertical,
      HORIZONTAL: horizontal,
      ANCHOR: anchor,
    };

    // Deep freeze the entire structure
    [vertical, horizontal, anchor].forEach(group => {
      Object.values(group).forEach(arr => {
        arr.forEach(entry => Object.freeze(entry.slots));
        arr.forEach(entry => Object.freeze(entry));
        Object.freeze(arr);
      });
      Object.freeze(group);
    });

    return Object.freeze(library) as TopologyLibrary;
  }

  public addEntry(entry: TopologyEntry): void {
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
  // All sweeps have been migrated to the modular src/engine/scanners/ directory
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

  const scanners: TopologyScanner[] = [
    new AdjacentScanner(),
    new VerticalScanner(),
    new LeftOfScanner(),
    new VerticalNotScanner(),
    new VerticalTrioScanner(),
    new VerticalDisjunctiveExclusionScanner(),
    new SequenceThreeScanner(),
    new GappedExclusionScanner(),
    new VerticalNotTrioScanner(),
    new AnchorScanner()
  ];

  for (const scanner of scanners) {
    scanner.scan(space, manifest);
  }

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

