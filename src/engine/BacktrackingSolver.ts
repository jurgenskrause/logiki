import { LogicCanvas } from './LogicCanvas';
import { Solver, type ActiveClue } from './Solver';

/**
 * Phase 7.0: Backtracking Solver
 * 
 * Exhaustively counts the number of valid grid completions that satisfy
 * the current LogicCanvas state and the given set of ActiveClues.
 */
export class BacktrackingSolver {
    private logicSolver = new Solver();

    /**
     * Counts the total number of valid solutions for the given canvas and clues.
     * Terminate early if the count exceeds a threshold (e.g., if we only care if count > 1).
     */
    public count(canvas: LogicCanvas, clues: ActiveClue[], limit: number = 100): number {
        const initialCanvas = canvas.clone();
        
        // Initial propagation
        const result = this.logicSolver.solve(clues, initialCanvas);
        if (result === 'CONTRADICTION') return 0;
        if (result === 'SOLVED') return 1;

        return this.recursiveCount(initialCanvas, clues, limit);
    }

    private recursiveCount(canvas: LogicCanvas, clues: ActiveClue[], limit: number): number {
        if (canvas.isFullySolved()) return 1;
        if (limit <= 0) return 0;

        // Find the cell with the smallest number of possibilities (>1) to minimize branching
        let bestR = -1;
        let bestC = -1;
        let minOptions = 999;

        for (let r = 0; r < canvas.height; r++) {
            for (let c = 0; c < canvas.width; c++) {
                if (!canvas.isSolved(r, c) && !canvas.isInvalid(r, c)) {
                    const options = canvas.getRemainingOptions(r, c);
                    if (options.length < minOptions) {
                        minOptions = options.length;
                        bestR = r;
                        bestC = c;
                    }
                }
            }
        }

        if (bestR === -1) return 0;

        const options = canvas.getRemainingOptions(bestR, bestC);
        let totalCount = 0;

        for (const option of options) {
            if (totalCount >= limit) break;

            const branchCanvas = canvas.clone();
            branchCanvas.isolateItem(bestR, bestC, option);
            
            const result = this.logicSolver.solve(clues, branchCanvas);
            
            if (result === 'CONTRADICTION') continue;
            
            if (result === 'SOLVED') {
                totalCount += 1;
            } else {
                totalCount += this.recursiveCount(branchCanvas, clues, limit - totalCount);
            }
        }

        return totalCount;
    }
}
