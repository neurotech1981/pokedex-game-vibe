import type { Rng } from './battleEngine';

/**
 * Seedable PRNG (mulberry32): same seed → identical sequence, which is what
 * makes battle replays deterministic. Not cryptographic — game logic only.
 */
export const mulberry32 = (seed: number): Rng => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/** Fresh 32-bit seed for a new battle. */
export const randomSeed = (): number => (Math.random() * 4294967296) >>> 0;
