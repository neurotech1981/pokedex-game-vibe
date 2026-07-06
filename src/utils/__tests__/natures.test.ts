import { describe, it, expect } from 'vitest';
import {
    IV_STATS,
    MAX_IV,
    MAX_IV_TOTAL,
    NATURES,
    getNature,
    ivTotal,
    natureLabel,
    natureMultiplier,
    rollIvs,
    rollNature,
} from '../../data/natures';
import { calculateMaxHp, createBattleMon } from '../battleEngine';
import { registerMonProgress, createProfile } from '../progression';
import { mergeProfile } from '../../hooks/usePlayerProfile';
import { makePokemon, rngFrom } from './helpers';

describe('nature catalog', () => {
    it('has 25 unique natures, exactly 5 neutral', () => {
        expect(NATURES.length).toBe(25);
        expect(new Set(NATURES.map(n => n.id)).size).toBe(25);
        const neutral = NATURES.filter(n => !n.up && !n.down);
        expect(neutral.length).toBe(5);
        // non-neutral natures always have distinct up/down
        NATURES.filter(n => n.up || n.down).forEach(n => {
            expect(n.up).toBeTruthy();
            expect(n.down).toBeTruthy();
            expect(n.up).not.toBe(n.down);
        });
    });

    it('every (up, down) pair is unique across the 20 non-neutral natures', () => {
        const pairs = NATURES.filter(n => n.up).map(n => `${n.up}|${n.down}`);
        expect(new Set(pairs).size).toBe(20);
    });

    it('natureMultiplier returns 1.1/0.9/1 and never touches hp', () => {
        expect(natureMultiplier('adamant', 'attack')).toBe(1.1);
        expect(natureMultiplier('adamant', 'special-attack')).toBe(0.9);
        expect(natureMultiplier('adamant', 'defense')).toBe(1);
        expect(natureMultiplier('adamant', 'hp')).toBe(1);
        expect(natureMultiplier('hardy', 'attack')).toBe(1);
        expect(natureMultiplier(undefined, 'attack')).toBe(1);
        expect(natureMultiplier('not-a-nature', 'attack')).toBe(1);
    });

    it('rollNature and rollIvs stay in bounds even at rng edge values', () => {
        expect(getNature(rollNature(rngFrom([0])))).toBeTruthy();
        expect(getNature(rollNature(rngFrom([0.999999])))).toBeTruthy();
        const low = rollIvs(rngFrom([0, 0, 0, 0, 0, 0]));
        const high = rollIvs(rngFrom([0.999999, 0.999999, 0.999999, 0.999999, 0.999999, 0.999999]));
        IV_STATS.forEach(s => {
            expect(low[s]).toBe(0);
            expect(high[s]).toBe(MAX_IV);
        });
        expect(ivTotal(high)).toBe(MAX_IV_TOTAL);
    });

    it('natureLabel formats arrows for non-neutral natures only', () => {
        expect(natureLabel('adamant')).toBe('Adamant ↑Atk ↓SpA');
        expect(natureLabel('hardy')).toBe('Hardy');
        expect(natureLabel(undefined)).toBe('');
    });
});

describe('createBattleMon with nature/IVs', () => {
    const mon = makePokemon(1, 'testmon', ['normal']); // all base 100
    const allIvs = (v: number) =>
        Object.fromEntries(IV_STATS.map(s => [s, v])) as Record<(typeof IV_STATS)[number], number>;

    it('applies effectiveBase = round((base + floor(iv/2)) * natureMult)', () => {
        const built = createBattleMon(mon, 1, 0, 50, null, { nature: 'adamant', ivs: allIvs(31) });
        const stat = (name: string) => built.pokemon.stats.find(s => s.stat.name === name)!.base_stat;
        expect(stat('attack')).toBe(Math.round((100 + 15) * 1.1)); // 127
        expect(stat('special-attack')).toBe(Math.round((100 + 15) * 0.9)); // 104
        expect(stat('defense')).toBe(115);
        expect(stat('hp')).toBe(115); // IVs raise HP, nature never does
        expect(built.maxHp).toBe(calculateMaxHp({ ...mon, stats: built.pokemon.stats }, 50));
        expect(built.nature).toBe('adamant');
    });

    it('composes with elite statMod and is identity with no opts', () => {
        const boosted = createBattleMon(mon, 1, 0, 50, null, { nature: 'adamant', ivs: allIvs(31), statMod: 1.2 });
        const attack = boosted.pokemon.stats.find(s => s.stat.name === 'attack')!.base_stat;
        expect(attack).toBe(Math.round(115 * 1.1 * 1.2));
        const plain = createBattleMon(mon, 1, 0, 50, null);
        expect(plain.pokemon).toBe(mon); // untouched reference
        expect(plain.nature).toBeUndefined();
    });
});

describe('nature/IV persistence', () => {
    it('registerMonProgress rolls once and never rerolls', () => {
        const p1 = registerMonProgress(createProfile(), { id: 25, level: 5 }, rngFrom([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]));
        const first = p1.mons[25];
        expect(first.nature).toBeTruthy();
        expect(first.ivs).toBeTruthy();
        const p2 = registerMonProgress(p1, { id: 25, level: 12 }, rngFrom([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]));
        expect(p2.mons[25].nature).toBe(first.nature);
        expect(p2.mons[25].ivs).toEqual(first.ivs);
        expect(p2.mons[25].level).toBe(12);
    });

    it('mergeProfile backfills bare mons and preserves filled ones', () => {
        const profile = createProfile();
        profile.mons[1] = { xp: 3, level: 55 }; // pre-natures save
        profile.mons[4] = { xp: 0, level: 50, nature: 'timid', ivs: { hp: 1, attack: 2, defense: 3, 'special-attack': 4, 'special-defense': 5, speed: 6 } };
        const merged = mergeProfile(profile, rngFrom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
        expect(merged.mons[1].nature).toBeTruthy();
        expect(merged.mons[1].ivs).toBeTruthy();
        expect(merged.mons[1].level).toBe(55);
        expect(merged.mons[4].nature).toBe('timid');
        expect(merged.mons[4].ivs!.speed).toBe(6);
        // merging again with a different rng must not change anything
        const again = mergeProfile(merged, rngFrom([0.99]));
        expect(again.mons[1]).toEqual(merged.mons[1]);
    });
});
