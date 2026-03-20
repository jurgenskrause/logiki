import { LogicCanvas } from './LogicCanvas';
import { Slot, CoordinateSpace } from './CoordinateSpace';
import { Solver, type ActiveClue } from './Solver';
import type { TieringService } from './TieringService';
import { type TopologyEntry } from './PermutationGenerator';
import { BacktrackingSolver } from './BacktrackingSolver';
import { SolutionGrid } from './SolutionGrid';

/**
 * Thrown when an accepted clue renders one or more cells unsolvable (mask → 0).
 */
export class ContradictionError extends Error {
  readonly offendingEntry: TopologyEntry;
  readonly deadCells: { row: number; col: number }[];

  constructor(offendingEntry: TopologyEntry, deadCells: { row: number; col: number }[]) {
    const coords = deadCells.map(c => `R${c.row}:C${c.col}`).join(', ');
    super(`ContradictionError: Clue (${offendingEntry.type}) killed cell(s): ${coords}`);
    this.name = 'ContradictionError';
    this.offendingEntry = offendingEntry;
    this.deadCells = deadCells;
  }
}

export class StalemateError extends Error {
  readonly canvas: LogicCanvas;
  readonly acceptedClues: TopologyEntry[];

  constructor(canvas: LogicCanvas, acceptedClues: TopologyEntry[]) {
    super('GenerationError: Unsolvable Topology - Reached a logic stalemate.');
    this.name = 'StalemateError';
    this.canvas = canvas;
    this.acceptedClues = acceptedClues;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface GenerationTelemetry {
  clues: TopologyEntry[];
  initialClues: number;
  finalClues: number;
  timeMs: number;
  targetClues: number;
  manifestVolume: number;
  idealCounts: { simple: number; moderate: number; complex: number };
  actualCounts: { simple: number; moderate: number; complex: number };
  prunedCount: number;
  finalCanvas: LogicCanvas;
}

export class StructuralSieve {
  private logicSolver = new Solver();
  private backtracker = new BacktrackingSolver();

  public async generateAsync(
    tieringService: TieringService,
    N: number,
    M: number,
    onYield: (
      canvas: LogicCanvas,
      stats: { simple: number; moderate: number; complex: number },
      eventMsg: string,
      entry?: TopologyEntry
    ) => Promise<void>,
    rng: () => number = Math.random
  ): Promise<GenerationTelemetry> {
    const startTime = performance.now();
    const timeoutMs = N * M * 5000; // N * M * 0.5s

    const canvas = new LogicCanvas(N, M);
    const space = new CoordinateSpace(N, M);
    const solution = new SolutionGrid(space, rng);

    let masterPool = [
      ...tieringService.simpleStack,
      ...tieringService.moderateStack,
      ...tieringService.complexStack
    ];

    const initialVolume = masterPool.length;
    const targetClues = Math.floor((N * M) * 1.5);

    const activeClues: TopologyEntry[] = [];
    const activeList: ActiveClue[] = [];

    const yieldState = async (c: LogicCanvas, msg: string, entry?: TopologyEntry) => {
      await onYield(c, { simple: 0, moderate: 0, complex: 0 }, msg, entry);
    };

    const checkTimeout = () => {
      if (performance.now() - startTime > timeoutMs) {
        throw new TimeoutError(`Generation timed out after ${(performance.now() - startTime).toFixed(0)}ms`);
      }
    };

    // --- Generation Loop ---
    let solCount = this.backtracker.count(canvas, activeList, 2);

    while (solCount !== 1) {
      checkTimeout();

      if (solCount === 0) {
        throw new Error("Internal Error: Logic contradiction with ground truth.");
      }

      // 1. Pool Maintenance
      masterPool = masterPool.filter(entry => !this.isEntrySolved(entry, canvas, solution));

      if (masterPool.length === 0) {
        const anchor = this.findSymmetryBreaker(canvas, solution);
        if (anchor) {
          activeClues.push(anchor);
          activeList.push(this.toActiveClue(anchor, solution));
          this.logicSolver.solve(activeList, canvas);
          canvas.rowSweep();
          await yieldState(canvas, `⚓ Stalemate broken via Anchor.`, anchor);
          solCount = this.backtracker.count(canvas, activeList, 2);
          continue;
        }
        throw new StalemateError(canvas, activeClues);
      }

      // 2. Sample
      const K = 40;
      const sample = this.pickRandomSample(masterPool, K, rng);

      // 3. Dry Run & Score
      const scored: { entry: TopologyEntry; score: number }[] = [];
      const initialBits = canvas.countTotalBits();

      for (const entry of sample) {
        const testCanvas = canvas.clone();
        const clue = this.toActiveClue(entry, solution);
        const result = this.logicSolver.solve([clue], testCanvas);

        if (result === 'CONTRADICTION') {
          scored.push({ entry, score: -1 });
          continue;
        }

        const deltaBits = initialBits - testCanvas.countTotalBits();
        scored.push({ entry, score: deltaBits });
      }

      // 4. Commit
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      if (best && best.score > 0) {
        activeClues.push(best.entry);
        activeList.push(this.toActiveClue(best.entry, solution));
        this.logicSolver.solve(activeList, canvas);
        canvas.rowSweep();
        masterPool = masterPool.filter(e => e.topologyID !== best.entry.topologyID);
        await yieldState(canvas, `🔍 Committed ${best.entry.type} [Power: ${best.score}]`, best.entry);
      }

      solCount = this.backtracker.count(canvas, activeList, 2);
    }

    // --- Minimization ---
    const finalClues = [...activeClues];
    for (let i = finalClues.length - 1; i >= 0; i--) {
      checkTimeout();

      const candidateClue = finalClues[i];
      finalClues.splice(i, 1);
      const testList = finalClues.map(c => this.toActiveClue(c, solution));
      const testCanvas = new LogicCanvas(N, M);
      this.logicSolver.solve(testList, testCanvas);

      if (this.backtracker.count(testCanvas, testList, 2) === 1) {
        await yieldState(canvas, `✂️ Pruned redundant ${candidateClue.type}.`, candidateClue);
      } else {
        finalClues.splice(i, 0, candidateClue);
      }
    }

    return {
      clues: finalClues,
      initialClues: initialVolume,
      finalClues: finalClues.length,
      timeMs: performance.now() - startTime,
      targetClues,
      manifestVolume: initialVolume,
      idealCounts: { simple: 0, moderate: 0, complex: 0 },
      actualCounts: { simple: 0, moderate: 0, complex: 0 },
      prunedCount: activeClues.length - finalClues.length,
      finalCanvas: canvas
    };
  }

  private isEntrySolved(entry: TopologyEntry, canvas: LogicCanvas, solution: SolutionGrid): boolean {
    for (const slot of entry.slots) {
      const itemIndex = solution.getItemIndexAtSlot(slot);
      if (!canvas.isItemSolvedAt(slot.r, slot.c, itemIndex)) return false;
    }
    return true;
  }

  private pickRandomSample(pool: TopologyEntry[], k: number, rng: () => number): TopologyEntry[] {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, k);
  }

  private findSymmetryBreaker(canvas: LogicCanvas, solution: SolutionGrid): TopologyEntry | null {
    for (let r = 0; r < canvas.height; r++) {
      for (let c = 0; c < canvas.width; c++) {
        if (!canvas.isSolved(r, c)) {
          const itemIndex = solution.getItemIndexAtSlot(new Slot(r, c));
          return {
            topologyID: `ANCHOR_R${r}I${itemIndex}C${c}`,
            type: 'ANCHOR' as any,
            slots: [new Slot(r, c)],
            weight: 1
          };
        }
      }
    }
    return null;
  }

  private toActiveClue(entry: TopologyEntry, solution: SolutionGrid): ActiveClue {
    return {
      type: entry.type,
      params: entry.slots.map(s => ({
        row: s.r,
        item: solution.getItemIndexAtSlot(s)
      })),
      targetCol: entry.type.includes('ANCHOR') ? parseInt(entry.topologyID.split('C')[1]) : undefined
    };
  }
}
