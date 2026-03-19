# Logiki Development Roadmap & Functional Summary

This document serves as feedback for the architecture team. It contextualizes the development history, placing the completed functionality into a logical sequence, and provides a structural inventory of every core engine object and function.

## Phase 1: Foundational Geometry and State
**Goal**: Build the atomic structural units and grid representations decoupled from interactive logic and cosmetic components.
- **Conversation Context:** Initializing Coordinate System
- **Core Objects & Functions:**
  - `CoordinateSpace` (class): Represents the `MxN` universe. Manages internal `slots` arrays, provides `getSlot(row, col)`.
  - `Slot` (class): The absolute atomic unit; a 2D coordinate representing [(row, col)](file:///home/jurgens/Development/Logiki0.1/src/engine/handlers/AdjacentHandler.ts#4-72).
  - `GameState` (class): Orchestrates overarching session states.
  - `SolutionGrid` (class): Used mathematically as the definitive "ground truth" answer sheet during clue generation.

## Phase 2: Topology and Relationship Manifests
**Goal**: Pre-calculate and cache all valid mathematical relationships in the grid offline to guarantee high-performance, seed-independent puzzle generation at runtime.
- **Conversation Context:** Generating Ground Truth, Generating Topology Manifest, Refactoring Gapped Exclusion Logic, Topology Audit Implementation
- **Core Objects & Functions:**
  - `RuleTemplates`: Pure deterministic predicate functions confirming if arguments fulfill logic rules:
    - *Horizontals:* `IS_ADJACENT(A,B)`, `IS_LEFT_OF(A,B)`, `IS_SEQUENCE_THREE(A,B,C)`, `IS_GAPPED_EXCLUSION(A,C,B)`
    - *Verticals:* `IS_VERTICAL(A,B)`, `IS_VERTICAL_NOT(A,B)`, `IS_VERTICAL_TRIO(A,B,C)`, `IS_VERTICAL_DISJUNCTIVE_EXCLUSION(A,B,C)`
  - `PermutationGenerator`:
    - `buildTopologyLibrary(rows, cols)`: Exhaustively sweeps through reality to evaluate `RuleTemplates` against all permutations.
    - Yields `TopologyEntry` structures, deterministic strings (`makeID`, `getPrefix`), and tokenizations (`slotToken`).
  - `TopologyManifest` (class) / `TopologyLibrary` (type): Stores all cached topological relationships across all permutations.
  - UI Implementation:
    - `TopologyAuditUI` (React): A diagnostic dashboard detailing manifest density, mathematical collision testing, and generator performance benchmarks.

## Phase 3: Constraint Propagation and Engine Handlers
**Goal**: Build out the deterministic deduction engine capable of pruning mathematically disproven values given an initial configuration of clues.
- **Conversation Context:** Phase 3 Optimizations and Review, Implementing Vertical Not Clue, Fixing AdjacentHandler Expression Error
- **Core Objects & Functions:**
  - `LogicCanvas` (class): Tracks possibility viability using Bitmask flags mapped to `ItemIndex`.
    - Features recent `O(1)` optimized internal contradiction detection.
    - Functions: `isPossible`, `prune`, `isItemSolvedAt`.
  - `Solver` (class): Evaluates arrays of `ActiveClue`s and filters logic through context handlers. Yields a stateful `SolverResult`.
  - **Logic Handlers**: Evaluates context and executes bit-level pruning rules on the canvas.
    - [handleAdjacent(clue, canvas)](file:///home/jurgens/Development/Logiki0.1/src/engine/handlers/AdjacentHandler.ts#4-72)
    - `handleLeftOf(clue, canvas)`
    - `handleGappedNotMiddle(clue, canvas)`
    - `handleSequenceThree(clue, canvas)`
    - `handleVerticalPair(clue, canvas)`
    - `handleVerticalTrio(clue, canvas)`
    - `handleVerticalDisjunctiveXor(clue, canvas)`
    - `handleVerticalNot(clue, canvas)`
    - `handleVerticalNotTrio(clue, canvas)`

## Phase 4: Clue Discovery and Generation
**Goal**: Inspect fully realized `SolutionGrid` structures to discover sets of coordinates matching rule profiles, forming playable, accurate clues.
- **Core Objects & Functions:**
  - `SelectionDeck` (class): Orchestrates predictable deck shuffling and random choices required for balanced board generation without duplicate draws.
  - **TopologyScanners**: Implement the `TopologyScanner` interface to extract tuples of items.
    - `AdjacentScanner`, `LeftOfScanner`, `GappedExclusionScanner`, `SequenceThreeScanner`
    - `VerticalScanner`, `VerticalTrioScanner`, `VerticalNotScanner`, `VerticalNotTrioScanner`, `VerticalDisjunctiveExclusionScanner`
  - [/utils/random.ts](file:///home/jurgens/Development/Logiki0.1/src/utils/random.ts): Contains `seedHash(seed)` and `seededRandom(seed)` implementation ensuring algorithmic cross-platform reproducibility.
  - [/utils/themeRegistry.ts](file:///home/jurgens/Development/Logiki0.1/src/utils/themeRegistry.ts): Decoupled visual configuration returning tokens (`getAsset`, `getFallbackEmoji`) separate from engine execution.

---

### Final Takeaways
The transition from Phase 2 heavily optimizing up-front `TopologyManifest` generation into Phase 3's highly optimized `LogicCanvas` operations has successfully reduced $O(N^2)$ checks and establishes an architecturally clean MVC separation where math engines and visual UI renderers run distinct from each other.
