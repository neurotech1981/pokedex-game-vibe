import { describe, it, expect } from 'vitest';
import {
    KANTO_DEX_SIZE,
    createProfile,
    dexCompletion,
    registerDexCaught,
    registerDexSeen,
    registerMonProgress,
} from '../progression';
import { mergeProfile } from '../../hooks/usePlayerProfile';
import { evaluateAchievements } from '../achievements';
import { makePokemon, rngFrom } from './helpers';

describe('dex registration', () => {
    it('registerDexSeen unions without duplicates and is idempotent', () => {
        const p1 = registerDexSeen(createProfile(), [1, 4, 7]);
        expect(p1.dex.seen.sort((a, b) => a - b)).toEqual([1, 4, 7]);
        const p2 = registerDexSeen(p1, [4, 7]);
        expect(p2).toBe(p1); // same reference when nothing new
        const p3 = registerDexSeen(p2, [4, 25]);
        expect(p3.dex.seen.sort((a, b) => a - b)).toEqual([1, 4, 7, 25]);
    });

    it('registerDexCaught implies seen', () => {
        const p = registerDexCaught(createProfile(), [150]);
        expect(p.dex.caught).toContain(150);
        expect(p.dex.seen).toContain(150);
    });

    it('registerMonProgress marks the species as caught', () => {
        const p = registerMonProgress(createProfile(), { id: 25, level: 5 }, rngFrom([0.5]));
        expect(p.dex.caught).toContain(25);
        expect(p.dex.seen).toContain(25);
    });

    it('dexCompletion splits Kanto and Johto', () => {
        let p = registerDexCaught(createProfile(), [1, 151, 152, 251]);
        p = registerDexSeen(p, [50, 200]);
        const c = dexCompletion(p.dex);
        expect(c.kantoCaught).toBe(2);
        expect(c.johtoCaught).toBe(2);
        expect(c.kantoSeen).toBe(3); // 1, 151, 50
        expect(c.johtoSeen).toBe(3); // 152, 251, 200
        expect(c.hasJohto).toBe(true);
        expect(dexCompletion(createProfile().dex).hasJohto).toBe(false);
    });
});

describe('dex backfill', () => {
    it('derives caught from mons + box on pre-dex saves', () => {
        const profile = createProfile();
        profile.mons[25] = { xp: 0, level: 12 };
        profile.mons[6] = { xp: 3, level: 60 };
        profile.box = [{ pokemon: makePokemon(133, 'eevee', ['normal']), level: 20 }];
        // simulate a save written before dex existed
        const legacy = { ...profile } as Partial<typeof profile>;
        delete legacy.dex;
        const merged = mergeProfile(legacy as typeof profile, rngFrom([0.5]));
        expect(merged.dex.caught.sort((a, b) => a - b)).toEqual([6, 25, 133]);
        expect(merged.dex.seen).toEqual(merged.dex.caught);
    });

    it('preserves an existing dex untouched', () => {
        const profile = createProfile();
        profile.dex = { seen: [1, 2, 3], caught: [1] };
        const merged = mergeProfile(profile, rngFrom([0.5]));
        expect(merged.dex).toEqual({ seen: [1, 2, 3], caught: [1] });
    });
});

describe('dex achievements', () => {
    it('fire at exact Kanto thresholds, ignoring Johto ids', () => {
        const ids = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => i + 1 + offset);
        const at9 = registerDexCaught(createProfile(), [...ids(9), 152, 153]); // Johto ids don't count
        expect(evaluateAchievements(at9)).not.toContain('dex-caught-10');
        const at10 = registerDexCaught(at9, [10]);
        expect(evaluateAchievements(at10)).toContain('dex-caught-10');
        const full = registerDexCaught(createProfile(), ids(KANTO_DEX_SIZE));
        const earned = evaluateAchievements(full);
        expect(earned).toContain('dex-caught-151');
        expect(earned).toContain('dex-caught-100');
        const seen50 = registerDexSeen(createProfile(), ids(50));
        expect(evaluateAchievements(seen50)).toContain('dex-seen-50');
    });
});
