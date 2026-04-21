# Logiki: Puzzle Generation & Solver Pipeline

This document explains the entire pipeline used to generate and solve grid-based logic puzzles within the Logiki engine. The architecture is broken into several discrete phases: building the topological reality, synthesizing clues, solving the board through simulated human deduction, and ensuring minimal solvability.

## 1. The Foundation: Coordinate Space & Solution Grid
The puzzle universe is defined by an $M \times N$ grid, where $M$ is the number of categories (rows) and $N$ is the number of items per category (columns/slots).

1. **CoordinateSpace**: A rigid, immutable matrix of `Slot` objects. It is completely independent of the game state and defines the geometry of the puzzle.
2. **SolutionGrid**: The "Answer Key". Using a deterministic PRNG seeded at the start of generation, items within each category are shuffled and assigned to slots. This forms the absolute truth that the generated puzzle must solve toward.

## 2. Permutation Generation: The Topology Manifest
Instead of randomly guessing clues and checking if they fit, the engine performs an exhaustive geometric sweep to find *all possible* relationships. 

### Sweeping and Deduplication
The engine uses specific **Topology Scanners** to blindly iterate through combinations of slots in the `CoordinateSpace`. Since many loops inherently generate permutations rather than combinations (e.g., identifying [R0C1, R0C2] and then [R0C2, R0C1] as adjacent), the engine uses a rigorous deduplication process.

To avoid duplicate clues, every discovered geometric relationship is assigned a deterministic `topologyID`. The slots involved in the relationship are sorted (top-to-bottom, left-to-right) before the ID is generated. The `TopologyManifest` uses a Map keyed by this `topologyID`. Any symmetric or identical relationships naturally map to the exact same entry, ensuring the manifest contains a perfectly unique set of clues. 

### Clue Generation Types
The following clue types are swept and inserted into the Manifest:

- **VERTICAL**: Sweeps all combinations of two slots in the same column, across different rows.
- **VERTICAL_NOT**: Sweeps all combinations of two slots in different rows and different columns.
- **VERTICAL_TRIO**: Sweeps all combinations of three slots sharing the exact same column.
- **VERTICAL_NOT_TRIO**: Selects an anchor slot, then finds two other slots in different rows that do not share a column with each other, representing a state where the anchor shares a column with *one of* the other two.
- **VERTICAL_DISJUNCTIVE_EXCLUSION**: Identifies one anchor slot and two sibling slots in the same row. The anchor must vertically align with exactly one of the siblings.
- **ADJACENT**: Sweeps pairs of slots in different rows that are exactly 1 column apart ($|c_1 - c_2| == 1$).
- **LEFT_OF**: Sweeps pairs of slots in different rows where slot A's column is strictly less than slot B's column.
- **SEQUENCE_THREE**: Sweeps three slots in different rows that exist in sequentially ascending contiguous columns ($c$, $c+1$, $c+2$).
- **GAPPED_EXCLUSION**: Identifies two anchor slots separated by exactly one column empty space ($c$ and $c+2$). Sweeps the entire board to identify a third slot that is *not* located in the middle column ($c+1$).

Once the unhydrated geometric manifest is compiled, the `SolutionGrid` is used to "hydrate" the slots into actual puzzle Items, establishing the `masterPool` of true clues.

## 3. The Logic Canvas & Deductive Solver
The engine simulates human logic using a forward-only deductive solver rather than pure backtracking search.

- **Logic Canvas**: A possibility matrix representing the board state. Initially, every item is in a "superposition" where it could be in any slot. It tracks state using bitmasks (where each bit represents a column possibility).
- **The Solver (Fixed-Point Iteration)**: The solver applies a set of clues to the canvas in a loop until no more deductions can be made (a "fixed point"). The solver relies on three steps per iteration:
  
### I. External Inference (Clue Handlers)
For every active clue, the solver routes the clue to a specific Handler. The handler queries the `LogicCanvas` and prunes impossible bits. The solver applies logic symmetrically (e.g., if A restricts B, then B restricts A).

- **VERTICAL (and TRIOS)**: Uses Bitmask Intersection. If an item cannot be in column $c$, its vertical partners also cannot be in column $c$.
- **VERTICAL_NOT (and TRIOS)**: If an item is *solved* and locked into column $c$, its negated partner's bit for column $c$ is pruned.
- **ADJACENT**: For Item A, the handler looks at Item B. If Item B cannot be placed at $c-1$ or $c+1$, then Item A cannot be placed at $c$. This operates bi-directionally.
- **LEFT_OF**: The handler identifies the left-most valid column for A and the right-most valid column for B. It prunes any bits for A that are at or to the right of B's right-most edge, and prunes any bits for B that are at or to the left of A's left-most edge.
- **SEQUENCE_THREE**: For Item A, if B is not possible at $c+1$ OR C is not possible at $c+2$, A is pruned from $c$. Similar symmetrical sliding-window logic applies to B and C.
- **VERTICAL_DISJUNCTIVE_EXCLUSION**: For Anchor A and siblings {B, C}, if neither B nor C are possible at column $c$, then A cannot be placed at $c$.
- **GAPPED_EXCLUSION**: For anchors A and C and separated item B. If A is placed at $c$ and C is placed at $c+2$, B cannot be at $c+1$. If B is *solved* at $c+1$, then the frame [A at $c$, C at $c+2$] is invalid.

### II. Internal Inference
Applies universal logic rules inherent to the grid structure:
- *Naked Singles*: If a cell is solved, that item cannot exist in any other cell in that row.
- *Hidden Singles (Row Sweep)*: If an item has only one possible valid slot left in its row, it must be there.

### III. Cross-Category Cleaning (Vertical Isolation)
Ensures that if two items from different categories are locked into the same column, their possibility masks across the rest of the board remain perfectly synchronized.

## 4. The Structural Sieve: Generating the Puzzle
The `StructuralSieve` iteratively adds clues from the `masterPool` until the puzzle converges to exactly one valid solution. It acts to rapidly collapse the entropy of the `LogicCanvas`.

### Clue Selection (Adaptive Entropy Batching)
To maximize generation speed, the size of sampled clue batches scales dynamically based on the current logical "entropy" of the board (the percentage of grid possibilities remaining).

1. **Early Game (High Entropy, $>60\%$ remaining)**: Finding a good clue is extremely easy. The Sieve samples a lightning-fast batch of **$K = 20$** clues, scoring each by how many bits it prunes, and commits the best one.
2. **Mid Game (Medium Entropy, $20-60\%$ remaining)**: Basic deductions are established. The Sieve needs more specific cross-category intersections. It samples a batch of **$K = 50$** clues.
3. **Late Game (Low Entropy, $<20\%$ remaining)**: The board is mostly solved and the vast majority of active clues are redundant "No-Ops". The Sieve samples a massive batch of **$K = 150$** clues to sift for a breakthrough.

### Stalemates & Anchors
If the clue selection process stagnates or if the maximum $K=150$ batch yields absolutely zero pruning clues, the Sieve injects an **Anchor Clue**—a direct, absolute assignment of an item to a slot. This breaks spatial symmetries and provides a foothold for relational clues to cascade.

## 5. Verification: The Backtracking Solver
While the fixed-point solver tests human-deducible logic, the `BacktrackingSolver` exhaustively counts the total number of mathematically valid grids that satisfy the active clues. It branches on the cell with the fewest remaining options to minimize the search tree.

- This is used to verify that the generated puzzle has *exactly one* valid solution (`solCount === 1`).
- If it returns $>1$, the Sieve must select more clues to further constrain the grid.

## 6. The Pruner: Minimization
Once the `StructuralSieve` successfully finds a set of clues that yields a unique solution, the puzzle often has redundant clues.

The **Minimization Phase** removes unnecessary clues:
1. It iterates through the generated clue list.
2. It temporarily removes a clue and tests if the puzzle can still be fully solved by the Deductive Solver.
3. If the puzzle is still `SOLVED`, the clue was structurally redundant and is permanently discarded.
4. If the puzzle results in `AMBIGUOUS`, the clue is "load-bearing" and is kept.

This ensures the final output is a minimal elegant recipe of clues that lead to a deductively sound, uniquely solvable puzzle.
