# Logiki Architecture and Tech Stack

## Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS 4
- **Language**: TypeScript 5.9
- **Linting**: ESLint

## System Architecture

The Logiki engine is designed around a discrete coordinate system, immutable states, bitmask-based possibility space representation, and runtime constraint propagation. It firmly separates game math from game display.

### Core Engine Components
- **CoordinateSpace** & **Slot**: Defines the basic geometric boundaries (an `M x N` grid) and its discrete atomic units (`Slot`s).
- **LogicCanvas**: Uses typed bitmasks to track the possibility space of every coordinate for every item. Designed for high performance, providing `O(1)` pruning operations and real-time contradiction detection.
- **Solver**: A deterministic deduction engine that processes `ActiveClue` items, routing them to specific handlers, and propagates state mutations throughout the `LogicCanvas`.
- **GameState**: The top-level state manager for interactive application data.
- **SolutionGrid**: Represents a ground-truth, fully solved and mathematically valid grid environment.
- **SelectionDeck**: Provides seeded determinism for shuffling, dealing, and selecting options during procedural generation.

### Generation & Topology
The puzzle generation model is built upon a pre-calculated mathematical "manifest" of all possible spatial relationships, avoiding runtime geometry calculations.
- **TopologyManifest** / **TopologyLibrary**: Stores all valid geometric correlations (`TopologyEntry` values) into an indexed cache.
- **PermutationGenerator**: A brute-force utility that sweeps through the coordinate bounds to discover every valid spatial configuration, producing deterministic identifiers (`topologyID`).
- **RuleTemplates**: Contains pure predicate functions (e.g., `IS_ADJACENT`, `IS_VERTICAL_NOT`) that evaluate if a given set of `Slot`s satisfy a specific logic requirement.

### Verification Handlers (Constraint Logic)
Handlers evaluate instances of specific clue types against an active puzzle state, pruning mathematically impossible states. They evaluate edge cases, propagate constraints, and rely on logic symmetry.
- `AdjacentHandler`, `LeftOfHandler`: Horizontal spatial logic.
- `SequenceThreeHandler`: Ordered item sequences.
- `VerticalPairHandler`, `VerticalTrioHandler`: Column-based positive logic.
- `VerticalNotHandler`, `VerticalNotTrioHandler`: Column-based negative/exclusion logic.
- `VerticalDisjunctiveXorHandler`: Exclusive-or vertical constraints.
- `GappedNotMiddleHandler`: Exclusion bounding logic.

### Relationship Scanners (Clue Generation)
Scanners traverse a finalized `SolutionGrid` to discover valid relationships that meet a specific rule's signature. This is used to extract playable clues from a generated ground-truth board.
- Horizontals: `AdjacentScanner`, `LeftOfScanner`, `SequenceThreeScanner`, `GappedExclusionScanner`.
- Verticals: `VerticalScanner`, `VerticalTrioScanner`, `VerticalNotScanner`, `VerticalNotTrioScanner`, `VerticalDisjunctiveExclusionScanner`.

### User Interface Layer
- **App**: Main React entry point assembling the views.
- **Components**: UI modules such as `TopologyAuditUI` (a diagnostic debug dashboard for library density) and `ClueShowcase`.
