import { LogicCanvas } from './LogicCanvas';
import { Solver, type ActiveClue } from './Solver';
import type { TieringService } from './TieringService';
import type { TopologyEntry } from './PermutationGenerator';

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

export class StructuralSieve {
  /**
   * Phase 4.3: The Structural Sieve Pipeline
   * 
   * Reduces a blank LogicCanvas to a unique solution state strictly by prioritizing 
   * Simple logic over Moderate logic, using Complex logic only as escalations.
   */
  public generate(tieringService: TieringService, N: number, M: number): TopologyEntry[] {
    const canvas = new LogicCanvas(N, M);
    const solver = new Solver();
    
    // Memory-safe clones of the tier queues.
    const simple = [...tieringService.simpleStack];
    const moderate = [...tieringService.moderateStack];
    const complex = [...tieringService.complexStack];

    const acceptedClues: TopologyEntry[] = [];
    
    let simpleFailCounter = 0;
    let moderateFailCounter = 0;
    
    const X = Math.floor(simple.length / (N * M)) + N;
    const Y = Math.floor((N * M) / 2);

    let state: 'SIMPLE' | 'MODERATE' | 'COMPLEX' = 'SIMPLE';

    // Loop until the virtual matrix represents exactly 1 solved truth.
    while (!canvas.isFullySolved()) {
      if (state === 'SIMPLE') {
        if (simple.length === 0 || simpleFailCounter > X) {
          state = 'MODERATE';
          continue;
        }
        
        const entry = simple.shift()!;
        const clue = this.toActiveClue(entry);
        
        if (solver.testClue(clue, canvas)) {
          acceptedClues.push(entry);
          solver.solve([clue], canvas); // Apply clue permanently
          simpleFailCounter = 0;        // Reset tracker
          // Remain in SIMPLE state
        } else {
          simple.push(entry);           // Re-queue to bottom
          simpleFailCounter++;
        }
      } 
      else if (state === 'MODERATE') {
        if (moderate.length === 0 || moderateFailCounter > Y) {
          state = 'COMPLEX';
          continue;
        }

        const entry = moderate.shift()!;
        const clue = this.toActiveClue(entry);

        if (solver.testClue(clue, canvas)) {
          acceptedClues.push(entry);
          solver.solve([clue], canvas); // Apply clue permanently
          
          simpleFailCounter = 0;
          moderateFailCounter = 0;
          state = 'SIMPLE';             // Immediately downgrade upon success
        } else {
          moderate.push(entry);
          moderateFailCounter++;
        }
      }
      else if (state === 'COMPLEX') {
        let found = false;
        
        for (let i = 0; i < complex.length; i++) {
          const entry = complex[i];
          const clue = this.toActiveClue(entry);
          
          if (solver.testClue(clue, canvas)) {
            acceptedClues.push(entry);
            solver.solve([clue], canvas);
            
            complex.splice(i, 1);       // Remove used clue
            simpleFailCounter = 0;
            moderateFailCounter = 0;
            state = 'SIMPLE';
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Safety Net: Cycle remaining stacks once to ensure no possible combination was missed.
          if (this.tryFallbackSweep(simple, canvas, solver, acceptedClues)) {
            simpleFailCounter = 0;
            moderateFailCounter = 0;
            state = 'SIMPLE';
          } else if (this.tryFallbackSweep(moderate, canvas, solver, acceptedClues)) {
             simpleFailCounter = 0;
             moderateFailCounter = 0;
             state = 'SIMPLE';
          } else {
            throw new Error('GenerationError: Unsolvable Topology - Reached a logic stalemate.');
          }
        }
      }
    }

    return acceptedClues;
  }

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
  ): Promise<{ clues: TopologyEntry[]; initialClues: number; finalClues: number; timeMs: number }> {
    const startTime = performance.now();
    const canvas = new LogicCanvas(N, M);
    const solver = new Solver();
    
    const simple = [...tieringService.simpleStack];
    const moderate = [...tieringService.moderateStack];
    const complex = [...tieringService.complexStack];
    
    const initialClues = simple.length + moderate.length + complex.length;

    const acceptedClues: TopologyEntry[] = [];
    
    let simpleFailCounter = 0;
    let moderateFailCounter = 0;
    
    const X = Math.floor(simple.length / (N * M)) + N;
    const Y = Math.floor((N * M) / 2);

    // Hard iteration cap: 3× the total initial clue pool is a generous upper bound.
    // Any healthy run converges well within this. Hitting it signals a logic stalemate
    // that the escalation path alone could not resolve.
    const MAX_SIEVE_ITERATIONS = initialClues * 3;
    let iterationCount = 0;

    let state: 'SIMPLE' | 'MODERATE' | 'COMPLEX' = 'SIMPLE';

    const yieldState = async (msg: string, entry?: TopologyEntry) => {
      await onYield(canvas, { simple: simple.length, moderate: moderate.length, complex: complex.length }, msg, entry);
    };

    while (!canvas.isFullySolved()) {
      if (++iterationCount > MAX_SIEVE_ITERATIONS) {
        throw new Error(
          `GenerationError: Sieve loop exceeded ${MAX_SIEVE_ITERATIONS} iterations ` +
          `(accepted ${acceptedClues.length} of ${initialClues} clues). ` +
          `Canvas has not converged — possible cycle in escalation logic.`
        );
      }

      if (state === 'SIMPLE') {
        if (simple.length === 0 || simpleFailCounter > X) {
          await yieldState(`Escalating to Step B (Moderate): SimpleFail > ${X}`);
          state = 'MODERATE';
          continue;
        }
        
        const entry = simple.shift()!;
        const clue = this.toActiveClue(entry);
        
        if (solver.testClue(clue, canvas)) {
          acceptedClues.push(entry);
          solver.solve([clue], canvas);
          this.assertNoContradiction(canvas, entry);
          simpleFailCounter = 0;
          await yieldState(`Step A: Accepted Simple Clue (${entry.type}) [${entry.slots.map(s => `R${s.r}:I${s.c}`).join(', ')}]`, entry);
        } else {
          simple.push(entry);
          simpleFailCounter++;
        }
      } 
      else if (state === 'MODERATE') {
        if (moderate.length === 0 || moderateFailCounter > Y) {
          await yieldState(`Escalating to Step C (Complex): ModFail > ${Y}`);
          state = 'COMPLEX';
          continue;
        }

        const entry = moderate.shift()!;
        const clue = this.toActiveClue(entry);

        if (solver.testClue(clue, canvas)) {
          acceptedClues.push(entry);
          solver.solve([clue], canvas);
          this.assertNoContradiction(canvas, entry);
          simpleFailCounter = 0;
          moderateFailCounter = 0;
          state = 'SIMPLE';
          await yieldState(`Step B: Accepted Moderate Clue (${entry.type}) [${entry.slots.map(s => `R${s.r}:I${s.c}`).join(', ')}]`, entry);
        } else {
          moderate.push(entry);
          moderateFailCounter++;
        }
      }
      else if (state === 'COMPLEX') {
        let found = false;
        for (let i = 0; i < complex.length; i++) {
          const entry = complex[i];
          const clue = this.toActiveClue(entry);
          
          if (solver.testClue(clue, canvas)) {
            acceptedClues.push(entry);
            solver.solve([clue], canvas);
            this.assertNoContradiction(canvas, entry);
            complex.splice(i, 1);
            simpleFailCounter = 0;
            moderateFailCounter = 0;
            state = 'SIMPLE';
            found = true;
            await yieldState(`Step C: Accepted Complex Clue (${entry.type}) [${entry.slots.map(s => `R${s.r}:I${s.c}`).join(', ')}]`, entry);
            break;
          }
        }
        
        if (!found) {
          // Verify with fallback sweep natively synchronously inside async.
          let fbFound = false;
          for (let i = 0; i < simple.length; i++) {
            const entry = simple[i];
            const clue = this.toActiveClue(entry);
            if (solver.testClue(clue, canvas)) {
              acceptedClues.push(entry);
              solver.solve([clue], canvas);
              this.assertNoContradiction(canvas, entry);
              simple.splice(i, 1);
              simpleFailCounter = 0; moderateFailCounter = 0; state = 'SIMPLE';
              fbFound = true;
              await yieldState(`Fallback: Accepted Simple Clue (${entry.type})`, entry);
              break;
            }
          }
          if (!fbFound) {
            for (let i = 0; i < moderate.length; i++) {
              const entry = moderate[i];
              const clue = this.toActiveClue(entry);
              if (solver.testClue(clue, canvas)) {
                acceptedClues.push(entry);
                solver.solve([clue], canvas);
                this.assertNoContradiction(canvas, entry);
                moderate.splice(i, 1);
                simpleFailCounter = 0; moderateFailCounter = 0; state = 'SIMPLE';
                fbFound = true;
                await yieldState(`Fallback: Accepted Mod Clue (${entry.type})`, entry);
                break;
              }
            }
          }

          if (!fbFound) {
            throw new Error('GenerationError: Unsolvable Topology - Reached a logic stalemate.');
          }
        }
      }
    }

    const timeMs = performance.now() - startTime;
    return { clues: acceptedClues, initialClues, finalClues: acceptedClues.length, timeMs };
  }

  private tryFallbackSweep(
    queue: TopologyEntry[], 
    canvas: LogicCanvas, 
    solver: Solver, 
    acceptedOut: TopologyEntry[]
  ): boolean {
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      const clue = this.toActiveClue(entry);
      if (solver.testClue(clue, canvas)) {
        acceptedOut.push(entry);
        solver.solve([clue], canvas);
        queue.splice(i, 1);
        return true;
      }
    }
    return false;
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
      }))
    };
  }
}
