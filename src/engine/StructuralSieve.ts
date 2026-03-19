import { LogicCanvas } from './LogicCanvas';
import { Solver, type ActiveClue } from './Solver';
import type { TieringService } from './TieringService';
import type { TopologyEntry } from './PermutationGenerator';

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
