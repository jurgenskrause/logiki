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
    public nodesVisited = 0;

    /**
     * Counts the total number of valid solutions for the given canvas and clues.
     * Terminate early if the count exceeds a threshold.
     */
    public count(canvas: LogicCanvas, clues: ActiveClue[], limit: number = 100, onNode?: (nodes: number) => void, maxNodes: number = Infinity): number {
        const initialCanvas = canvas.clone();
        
        // Initial propagation
        const result = this.logicSolver.solve(clues, initialCanvas);
        if (result === 'CONTRADICTION') return 0;
        if (result === 'SOLVED') return 1;

        this.nodesVisited = 0; // Reset for each new count call
        return this.recursiveCount(initialCanvas, clues, limit, onNode, maxNodes);
    }

    private recursiveCount(canvas: LogicCanvas, clues: ActiveClue[], limit: number, onNode?: (nodes: number) => void, maxNodes: number = Infinity): number {
        this.nodesVisited++;
        if (this.nodesVisited >= maxNodes) return -1;
        
        if (this.nodesVisited % 500 === 0 && onNode) {
            onNode(this.nodesVisited);
        }
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
                const subCount = this.recursiveCount(branchCanvas, clues, limit - totalCount, onNode, maxNodes);
                if (subCount === -1) return -1;
                totalCount += subCount;
            }
        }

        return totalCount;
    }
}
