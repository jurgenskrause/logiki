Technical Documentation Policy: Deductorist
1. The Core Objective
The goal of documentation is to minimize "Time to Understanding" for any developer (including your future self). Documentation is a technical product and should be treated with the same rigor as code.

2. Documentation Pillars
All external documentation must adhere to these four principles:

Decoupled but Linked: Documentation lives outside the code (e.g., Markdown files in a /docs folder or a Wiki), but must reference specific modules or logic controllers.

Reason-Centric: Focus on why a specific architecture was chosen (e.g., "Why use Svelte stores over local state for the puzzle grid?").

Searchable: Use clear, consistent headers and a flat file structure to ensure information is discoverable via simple text search.

Minimalist: If the code is self-explanatory, do not document it. Document the interactions between components that are not visible at the file level.

3. Required Documentation Categories
A. Architectural Overview (The Map)
A high-level document describing how the data flows through the application.

State Management: How the puzzle state is initialized, modified, and validated.

Dependency Graph: A description of how major systems (UI, Logic Engine, Asset Loader) interact.

Third-Party Integrations: List of all external libraries and the specific reason for their inclusion.

B. The Logic Engine (The Rules)
Since this is a puzzle game, the "Source of Truth" for game rules must be documented in plain English.

Constraint Satisfaction: How the engine determines if a move is valid.

Win/Loss Conditions: The exact logic triggers for game completion.

Solver Logic: If the codebase includes an automated solver or hint generator, the underlying algorithm must be explained.

C. Onboarding & Environment (The Setup)
A README.md or DEVELOPMENT.md that allows a fresh developer to go from git clone to a running build in under five minutes.

Strict version requirements for Node.js/package managers.

Environment variables and secret management.

Build commands and CI/CD pipeline explanations.

4. Style & Standard Operating Procedures
Format: All documentation must be written in Markdown. It is portable, version-controllable, and platform-agnostic.

Visuals: Use Mermaid.js or simple ASCII flowcharts for logic paths. Do not rely on external binary image files that cannot be easily updated.

The "Outdated is Dangerous" Rule: If a feature is deprecated, the documentation must be updated or deleted in the same Pull Request. Documentation is a "definition of done" requirement.

Tone: Technical, objective, and concise. Use active voice. Avoid fluff, introductory filler, and "marketing speak."

5. Maintenance Protocol
Review: Documentation is subject to peer review during the PR process.

Stale Checks: Every quarter, perform a "Doc-Sprints" to prune information that no longer matches the current state of the codebase.