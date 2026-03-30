import { LogicCanvas } from './LogicCanvas';
import { Slot, CoordinateSpace } from './CoordinateSpace';
import { Solver, type ActiveClue } from './Solver';
import type { TieringService } from './TieringService';
import { type TopologyEntry } from './PermutationGenerator';
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
  unprunedClues: TopologyEntry[];
  solution: SolutionGrid;
  backtrackNodes: number;
  totalSolves: number;
}

export class StructuralSieve {
  private logicSolver = new Solver();
  private totalSolves = 0;
  private totalTestedClues = 0;

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
    rng: () => number = Math.random,
    onSolutionReady?: (solution: SolutionGrid) => void
  ): Promise<GenerationTelemetry> {
    const startTime = performance.now();
    this.totalSolves = 0;
    this.totalTestedClues = 0;

    const canvas = new LogicCanvas(N, M);
    const space = new CoordinateSpace(N, M);
    const solution = new SolutionGrid(space, rng);
    onSolutionReady?.(solution);

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
      await onYield(c, { simple: 0, moderate: 0, complex: 0 },
        `[Solve:${this.totalSolves} Clue:${this.totalTestedClues}] ${msg}`, entry);
    };

    const maxEntropy = canvas.countTotalBits();

    // ----------------------------------------------------------------------
    // Phase 1: Progressive Clue Commitment
    // ----------------------------------------------------------------------
    let iterationsWithoutCommit = 0;

    while (!canvas.isFullySolved()) {
      // 1. Pool Maintenance: Filter out clues that are already logically satisfied
      masterPool = masterPool.filter(entry => !this.isEntrySolved(entry, canvas, solution));

      if (masterPool.length === 0) {
        // No more ordinary clues left, try a symmetry breaker (Anchor)
        const anchor = this.findSymmetryBreaker(canvas, solution);
        if (anchor) {
          activeClues.push(anchor);
          const activeAnchor = this.toActiveClue(anchor, solution);
          activeList.push(activeAnchor);
          
          this.totalSolves++;
          const result = this.logicSolver.solve(activeList, canvas);
          if (result === 'CONTRADICTION') {
             throw new ContradictionError(anchor, canvas.getInvalidCells());
          }
          canvas.rowSweep();
          await yieldState(canvas, `⚓ Stalemate broken via Anchor.`, anchor);
          continue;
        }

        // Truly stuck: Logic grid is ambiguous but no more clues exist to separate identities.
        throw new StalemateError(canvas, activeClues);
      }

      // 2. Adaptive Sample
      const currentEntropy = canvas.countTotalBits();
      const entropyRatio = currentEntropy / maxEntropy;
      
      let K = 20;
      if (entropyRatio < 0.20) K = 150;
      else if (entropyRatio < 0.60) K = 50;
      
      const sample = this.pickRandomSample(masterPool, K, rng);

      // 3. Dry Run & Score
      const initialBits = currentEntropy;
      const scored: { entry: TopologyEntry; score: number }[] = [];

      let sampleIdx = 0;

      for (const entry of sample) {
        sampleIdx++;
        this.totalTestedClues++;
        this.totalSolves++;

        if (this.totalTestedClues % 20 === 0) {
          await yieldState(canvas, `⚡ Scanning... (${sampleIdx}/${K} in batch, pool: ${masterPool.length})`);
        }

        const testCanvas = canvas.clone();
        const clue = this.toActiveClue(entry, solution);
        const result = this.logicSolver.solve([clue], testCanvas);

        if (result !== 'CONTRADICTION') {
          const score = initialBits - testCanvas.countTotalBits();
          scored.push({ entry, score });
        }
      }

      // 4. Commit or Fallback
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      if (best && best.score > 0) {
        activeClues.push(best.entry);
        const activeClue = this.toActiveClue(best.entry, solution);
        activeList.push(activeClue);
        
        this.totalSolves++;
        const result = this.logicSolver.solve(activeList, canvas);
        if (result === 'CONTRADICTION') {
           throw new ContradictionError(best.entry, canvas.getInvalidCells());
        }

        canvas.rowSweep();
        masterPool = masterPool.filter(e => e.topologyID !== best.entry.topologyID);
        await yieldState(canvas, `🔍 Committed ${best.entry.type} [Power: ${best.score}]`, best.entry);
        iterationsWithoutCommit = 0;
      } else {
        iterationsWithoutCommit++;
        // If we can't find ANY productive clues after multiple attempts, inject an Anchor
        if (iterationsWithoutCommit > 20 || (K === 150 && (!best || best.score <= 0))) {
          const emergency = this.findSymmetryBreaker(canvas, solution);
          if (!emergency) {
              throw new StalemateError(canvas, activeClues);
          }
          activeClues.push(emergency);
          activeList.push(this.toActiveClue(emergency, solution));
          
          this.totalSolves++;
          const result = this.logicSolver.solve(activeList, canvas);
          if (result === 'CONTRADICTION') {
              throw new ContradictionError(emergency, canvas.getInvalidCells());
          }
          
          canvas.rowSweep();
          await yieldState(canvas, `⚓ Stalemate broken via Emergency Anchor.`, emergency);
          iterationsWithoutCommit = 0;
        }
      }
    }

    // ----------------------------------------------------------------------
    // Phase 2: Minimization (Pruning redundant clues)
    // ----------------------------------------------------------------------
    await yieldState(canvas, `🏁 UNPRUNED RECIPE SECURED: Puzzle solved via logic with ${activeClues.length} clues. Starting Minimization...`);
    
    const finalClues = [...activeClues];
    for (let i = finalClues.length - 1; i >= 0; i--) {
      const candidateClue = finalClues[i];
      finalClues.splice(i, 1);
      
      const testList = finalClues.map(c => this.toActiveClue(c, solution));
      const testCanvas = new LogicCanvas(N, M);
      
      this.totalSolves++;
      const result = this.logicSolver.solve(testList, testCanvas);

      if (result === 'SOLVED') {
        await yieldState(canvas, `✂️ Pruned redundant ${candidateClue.type}.`, candidateClue);
      } else {
        // Essential clue, put it back
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
      finalCanvas: canvas,
      unprunedClues: [...activeClues],
      solution: solution,
      backtrackNodes: 0, // Deep exploration removed
      totalSolves: this.totalSolves
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

  public toActiveClue(entry: TopologyEntry, solution: SolutionGrid): ActiveClue {
    return {
      id: `err-${Math.random().toString(36).substr(2, 9)}`,
      type: entry.type,
      params: entry.slots.map(s => ({
        row: s.r,
        item: solution.getItemIndexAtSlot(s)
      })),
      targetCol: entry.type.includes('ANCHOR') ? parseInt(entry.topologyID.split('C')[1]) : undefined
    };
  }
}
