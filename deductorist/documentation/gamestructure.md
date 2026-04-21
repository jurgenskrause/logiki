# Logiki Data Layer (v1.0)

This document provides the technical specifications and implementation instructions for the Logiki binary manifest system. It covers the structure of the `.bin` manifest, the bit-packing schema for clues, and instructions for both the Packer Script and Manifest Loader.

## 1. The Binary Specification (.bin)
The manifest is a single, contiguous binary blob designed for O(1) lookup and minimal memory overhead.

### 1.1. File Header (First 16 Bytes)
| Offset | Size | Value | Description |
| :--- | :--- | :--- | :--- |
| 0x00 | 4 | `0x4C 0x47 0x4B 0x21` | Magic Bytes: "LGK!" |
| 0x04 | 1 | `0x01` | Version Byte |
| 0x05 | 3 | [Reserved] | Alignment padding |
| 0x08 | 4 | Uint32 | Entry Count (Total number of puzzles) |
| 0x0C | 4 | Uint32 | Header Checksum (CRC32 of offsets 0x00-0x0B) |

### 1.2. The Index Table
Immediately follows the header. Each entry represents one puzzle (e.g., 5 difficulties × 7 days = 35 entries).

**Entry Size: 36 bytes.**
- **Key (32 bytes)**: The `HMAC_SHA256(DateString + DifficultyInt, SecretSalt)`.
- **Offset (4 bytes)**: `Uint32` pointer to the start of the Puzzle Data Block relative to file start.

### 1.3. Puzzle Data Block
| Component | Size | Logic |
| :--- | :--- | :--- |
| **Metadata** | 2 Bytes | Bits 0-3: N, Bits 4-7: M, Bits 8-11: Difficulty, Bits 12-15: Unused. |
| **Clue Count** | 1 Byte | Uint8 number of clues. |
| **Clue Stream** | Variable | A sequence of 32-bit (4-byte) Clue Packets. |
| **Integrity Hash**| 32 Bytes | The SHA-256 hash of the 1D Solution Grid. |

---

## 2. Clue Bit-Packing Schema (The 32-Bit Packet)
To ensure fixed-length efficiency, every `ActiveClue` is packed into a 4-byte unsigned integer.

| Bits | Width | Description |
| :--- | :--- | :--- |
| 0-3 | 4 | Type Enum (0: VERTICAL, 1: LEFT_OF, 2: ADJACENT, etc.) |
| 4-6 | 3 | Param 1 Row: Category Index (0-7) |
| 7-9 | 3 | Param 1 Item: Item Index (0-7) |
| 10-12 | 3 | Param 2 Row: Category Index (0-7) |
| 13-15 | 3 | Param 2 Item: Item Index (0-7) |
| 16-18 | 3 | Param 3 Row: Category Index (0-7) |
| 19-21 | 3 | Param 3 Item: Item Index (0-7) |
| 22-24 | 3 | Target Column: Used for ANCHOR types (0-7) |
| 25-31 | 7 | Padding: Reserved for future clue modifiers. |

---

## 3. Implementation Workflow

### 3.1. Packer Script (Server-Side)
**Goal**: Ingest generated puzzle arrays and output `daily.bin`.

1.  **Pre-Generation**: Iterate through time chunks (e.g., 7 days) and difficulty levels. Generate the solution (`Uint8Array`) and `ActiveClue[]` array for each.
2.  **Hashing**: 
    - Generate Index Key: `HMAC_SHA256(DateString + Difficulty, RandomSalt)`.
    - Generate Integrity Hash: `SHA256(solution_grid)`. *Note: The raw solution grid is never written to the file.*
3.  **Buffer Assembly**: 
    - Assemble Data Blocks to determine offsets.
    - Populate Index Table with keys/offsets.
    - Write Header, Index Table, and Data Blocks into a single Buffer.

### 3.2. Manifest Loader (Client-Side)
**Goal**: Efficiently retrieve and verify the puzzle.

1.  **Seek**: Fetch `daily.bin`. Generate the day's key using the same HMAC logic. Perform O(1) lookup in the Index Table to find the offset.
2.  **Hydration**: Jump to the offset, read Metadata and Clue Count. Iterate through the Clue Stream, unpacking 32-bit integers into `ActiveClue` objects.
3.  **Verification**: Upon completion, the Engine produces a `Uint8Array`. Run `SHA256` on it and compare against the Integrity Hash. If they match, trigger the win state.

---

## 4. Logical Integrity Rules
- **Redundancy**: All clues must be necessary to reach a unique solution (pruned via the `StructuralSieve`).
- **Solvability**: The clues must allow a human (or a Fixed-Point Solver) to resolve every cell without guessing.
- **Uniqueness**: Only one solution grid must satisfy all provided clues.
