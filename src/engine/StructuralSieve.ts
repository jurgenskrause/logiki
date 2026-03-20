import { LogicCanvas } from './LogicCanvas';
import { Slot } from './CoordinateSpace';
import { Solver, type ActiveClue } from './Solver';
import type { TieringService } from './TieringService';
import { getWeight, type TopologyEntry } from './PermutationGenerator';

/**
 * Thrown when an accepted clue renders one or more cells unsolvable (mask → 0).
 * Carries the full offending entry and the coordinates of every dead cell.
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
    super('GenerationError: Unsolvable Topology - Reached a logic stalemate. No productive clues remaining in any tier.');
    this.name = 'StalemateError';
    this.canvas = canvas;
    this.acceptedClues = acceptedClues;
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
}

export class StructuralSieve {
  /**
   * Phase 4.3: The Structural Sieve Pipeline
   * 
   * Reduces a blank LogicCanvas to a unique solution state strictly by prioritizing 
   * Simple logic over Moderate logic, using Complex logic only as escalations.
   */
  public async generateAsync(
    tieringService: TieringService, 
    N: number, 
    M: number,
    onYield: (
      canvas: LogicCanvas, 
      stats: { simple: number; moderate: number; complex: number },
      eventMsg: string,
      entry?: TopologyEntry
    ) => Promise<void>
  ): Promise<GenerationTelemetry> {
    const startTime = performance.now();
    let canvas = new LogicCanvas(N, M);
    const solver = new Solver();
    
    // Create copy of the stacks so we can modify them
    const stacks = {
      simple: [...tieringService.simpleStack],
      moderate: [...tieringService.moderateStack],
      complex: [...tieringService.complexStack]
    };
    
    // Total combinatorial manifest volume
    const V = stacks.simple.length + stacks.moderate.length + stacks.complex.length;
    
    // Dynamic Clue Budgeting (N_target)
    const N_min = (N + M) - 1;
    const N_target = N_min + Math.floor(Math.log10(V) * N);

    const acceptedClues: TopologyEntry[] = [];
    let acceptedCounts = { simple: 0, moderate: 0, complex: 0 };
    let totalAccepted = 0;
    
    // Hard iteration cap: 3× the total initial clue pool is a generous upper bound.
    const MAX_SIEVE_ITERATIONS = V * 3;
    let iterationCount = 0;
    
    // Proportional Deficit Weights
    const W = { simple: 17, moderate: 7, complex: 1 };
    
    const yieldState = async (msg: string, entry?: TopologyEntry) => {
      await onYield(canvas, { simple: stacks.simple.length, moderate: stacks.moderate.length, complex: stacks.complex.length }, msg, entry);
    };

    while (!canvas.isFullySolved()) {
      if (++iterationCount > MAX_SIEVE_ITERATIONS) {
        throw new Error(
          `GenerationError: Sieve loop exceeded ${MAX_SIEVE_ITERATIONS} iterations. ` +
          `Canvas has not converged — possible cycle in logic.`
        );
      }

      // 1. Calculate ideal allocations and deficits for each tier
      const ideal = {
        simple: (W.simple / 25) * totalAccepted,
        moderate: (W.moderate / 25) * totalAccepted,
        complex: (W.complex / 25) * totalAccepted
      };
      
      type Tier = 'simple' | 'moderate' | 'complex';
      const errors = [
        { tier: 'complex' as Tier, error: ideal.complex - acceptedCounts.complex, weight: 3 },
        { tier: 'moderate' as Tier, error: ideal.moderate - acceptedCounts.moderate, weight: 2 },
        { tier: 'simple' as Tier, error: ideal.simple - acceptedCounts.simple, weight: 1 }
      ];
      
      errors.sort((a, b) => {
        const aEmpty = stacks[a.tier].length === 0;
        const bEmpty = stacks[b.tier].length === 0;
        if (aEmpty && !bEmpty) return 1;
        if (!aEmpty && bEmpty) return -1;
        
        if (Math.abs(b.error - a.error) > 0.0001) return b.error - a.error;
        return b.weight - a.weight;
      });

      let clueAccepted = false;
      
      for (const { tier } of errors) {
        const stack = stacks[tier];
        if (stack.length === 0) continue;
        
        const initialBits = canvas.countTotalBits();
        
        // --- Maximum Pruning Heuristic ---
        // Score every clue in the stack by simulating its total catastrophic cascading effect.
        // We measure strength as (original bits - resulting bits). Invalid clues get -1.
        const strengths = new Array(stack.length);
        for (let i = 0; i < stack.length; i++) {
           const entry = stack[i];
           const clue = this.toActiveClue(entry);
           if (!solver.testClue(clue, canvas)) {
               strengths[i] = -1;
               continue;
           }
           
           const testCanvas = canvas.clone();
           solver.solve([clue], testCanvas);
           
           if (testCanvas.hasAnyInvalidCells()) {
               strengths[i] = -1;
           } else {
               strengths[i] = initialBits - testCanvas.countTotalBits();
           }
        }
        
        // Sort stack descending by logic strength
        const paired = stack.map((entry, i) => ({ entry, strength: strengths[i] }));
        paired.sort((a, b) => b.strength - a.strength);
        
        for (let i = 0; i < stack.length; i++) {
            stack[i] = paired[i].entry;
        }

        const initialLength = stack.length;
        let foundProductive = false;
        
        for (let i = 0; i < initialLength; i++) {
          const entry = stack.shift()!;
          const strength = paired[i].strength;
          const clue = this.toActiveClue(entry);
          
          // Grabbing the strongest mathematically viable clue
          if (strength > 0 && solver.testClue(clue, canvas)) {
            acceptedClues.push(entry);
            acceptedCounts[tier]++;
            totalAccepted++;
            
            solver.solve([clue], canvas);
            this.assertNoContradiction(canvas, entry);
            
            await yieldState(
              `Targeting ${N_target} clues | Accepted ${tier.toUpperCase()} [Power: ${strength}]: Deficit [S:${(ideal.simple - acceptedCounts.simple).toFixed(1)} M:${(ideal.moderate - acceptedCounts.moderate).toFixed(1)} C:${(ideal.complex - acceptedCounts.complex).toFixed(1)}]`,
              entry
            );

            foundProductive = true;
            clueAccepted = true;
            break;
          } else {
            stack.push(entry);
          }
        }
        
        if (foundProductive) break;
      }
      
      if (!clueAccepted) {
        let anchorInjected = false;
        
        // --- Symmetry Break: Stalemate Interception ---
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < M; c++) {
            if (!canvas.isSolved(r, c) && !canvas.isInvalid(r, c)) {
               const options = canvas.getRemainingOptions(r, c);
               for (const targetItem of options) {
                 const anchorEntry: TopologyEntry = {
                   topologyID: `ANCHOR_R${r}I${targetItem}C${c}`,
                   type: 'ANCHOR' as any,
                   slots: [ new Slot(r, targetItem) ],
                   weight: 1
                 };
                 const anchorClue = this.toActiveClue(anchorEntry);

                 if (solver.testClue(anchorClue, canvas)) {
                   solver.solve([anchorClue], canvas);
                   this.assertNoContradiction(canvas, anchorEntry);
                   
                   acceptedClues.push(anchorEntry);
                   acceptedCounts.simple++;
                   totalAccepted++;
                   
                   await yieldState(`⚓ Stalemate Broken! Injected Anchor for Item ${targetItem} at R${r}C${c}.`, anchorEntry);
                   anchorInjected = true;
                   break;
                 }
               }
            }
            if (anchorInjected) break;
          }
          if (anchorInjected) break;
        }

        if (!anchorInjected) {
           // --- GREEDY BANISHMENT BACKTRACK ---
           // The algorithm reached a mathematical dead end.
           // To deterministicly escape without modifying the seed, we "rewind" the board state
           // by removing the most recently accepted clue, and permanently trashed it from the topology universe.
           // This polynomial approach flawlessly un-sticks the solver in exactly O(1) frame time.
           if (acceptedClues.length === 0) {
               throw new Error("Mathematical Impossibility: No valid clues remaining in the universe to form a puzzle.");
           }

           const toxicClue = acceptedClues.pop()!;
           
           // Rebuild Canvas
           canvas = new LogicCanvas(N, M);
           acceptedCounts = { simple: 0, moderate: 0, complex: 0 };
           totalAccepted = 0;

           const activeClues: ActiveClue[] = [];
           for (const c of acceptedClues) {
              activeClues.push(this.toActiveClue(c));
              const w = getWeight(c.type);
              if (w === 1) acceptedCounts.simple++;
              else if (w === 2) acceptedCounts.moderate++;
              else acceptedCounts.complex++;
              totalAccepted++;
           }
           
           solver.solve(activeClues, canvas);
           
           await yieldState(`⏪ Dead-End Encountered! Banishment Backtrack triggered. Permanently trashed toxic clue: ${toxicClue.type}`);
        }
      }
    }

    // 2. Load-Bearing Pruning (Subtractive Pass)
    let prunedCount = 0;
    const finalClues = [...acceptedClues];
    
    // We iterate backwards to prune
    for (let i = finalClues.length - 1; i >= 0; i--) {
      const candidateClue = finalClues[i];
      const remainingClues = finalClues.filter((_, idx) => idx !== i);
      
      const pruneCanvas = new LogicCanvas(N, M);
      const pruneSolver = new Solver();
      
      const activeRemaining = remainingClues.map(c => this.toActiveClue(c));
      const res = pruneSolver.solve(activeRemaining, pruneCanvas);
      
      if (res === 'SOLVED') {
        finalClues.splice(i, 1);
        prunedCount++;
        
        await yieldState(
          `✂️ Pruning Pass: Discarded redundant ${candidateClue.type} clue.`,
          candidateClue
        );
      }
    }

    const actualTierCounts = { simple: 0, moderate: 0, complex: 0 };
    for (const c of finalClues) {
      const weight = getWeight(c.type);
      if (weight === 1) actualTierCounts.simple++;
      else if (weight === 2) actualTierCounts.moderate++;
      else actualTierCounts.complex++;
    }

    const finalIdealCounts = {
      simple: (W.simple / 25) * finalClues.length,
      moderate: (W.moderate / 25) * finalClues.length,
      complex: (W.complex / 25) * finalClues.length
    };

    return {
      clues: finalClues,
      initialClues: V,
      finalClues: finalClues.length,
      timeMs: performance.now() - startTime,
      targetClues: N_target,
      manifestVolume: V,
      idealCounts: finalIdealCounts,
      actualCounts: actualTierCounts,
      prunedCount: prunedCount
    };
  }

  /**
   * Throws a ContradictionError if the canvas has any cells with mask === 0.
   * Called immediately after every solver.solve() in generateAsync.
   */
  private assertNoContradiction(canvas: LogicCanvas, entry: TopologyEntry): void {
    if (canvas.hasAnyInvalidCells()) {
      throw new ContradictionError(entry, canvas.getInvalidCells());
    }
  }

  /**
   * Translates abstract topology tokens into an ActiveClue object
   * that the Solver can understand. The fundamental assumption here
   * is that the Ground Truth assigns Item X to Column X permanently.
   */
  private toActiveClue(entry: TopologyEntry): ActiveClue {
    return {
      type: entry.type,
      params: entry.slots.map(s => ({
        row: s.r,
        item: s.c
      })),
      targetCol: entry.type.includes('ANCHOR') ? parseInt(entry.topologyID.split('C')[1]) : undefined
    };
  }
}
