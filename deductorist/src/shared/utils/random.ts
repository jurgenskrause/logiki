/**
 * Non-cryptographic string hash (FNV-1a 32-bit).
 * Standard FNV-1a constants:
 * Offset Basis: 2166136261
 * Prime: 16777619
 */
export function seedHash(seed: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Seeded PRNG based on the Mulberry32 algorithm.
 * Returns a generator function that yields floats between 0 (inclusive) and 1 (exclusive).
 *
 * @param seed A 32-bit unsigned integer
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
