import { describe, expect, it } from 'vitest';
import { createBattleMon } from '../battleEngine';
import {
    applyBattleEvs,
    applyVitamin,
    createProfile,
    highestBaseStat,
    registerMonProgress,
} from '../progression';
import { EV_STAT_CAP, EV_TOTAL_CAP, IV_STATS, evTotal } from '../../data/natures';
import { VITAMIN_EV_GAIN } from '../../data/shop';
import { selectLearnsetCandidates } from '../movesets';
import { makePokemon, rngFrom } from './helpers';

const allEvs = (v: number) =>
    Object.fromEntries(IV_STATS.map(s => [s, v])) as Record<(typeof IV_STATS)[number], number>;

describe('createBattleMon with EVs', () => {
    const mon = makePokemon(1, 'testmon', ['normal']); // all base 100

    it('folds EVs as +floor(ev/4) alongside IVs and nature', () => {
        const built = createBattleMon(mon, 1, 0, 50, null, { evs: { attack: 252, speed: 100 } });
        const stat = (name: string) => built.pokemon.stats.find(s => s.stat.name === name)!.base_stat;
        expect(stat('attack')).toBe(100 + 63); // floor(252/4)
        expect(stat('speed')).toBe(100 + 25); // floor(100/4)
        expect(stat('defense')).toBe(100); // untouched
    });

    it('composes with nature and IVs', () => {
        const built = createBattleMon(mon, 1, 0, 50, null, {
            nature: 'adamant',
            ivs: { ...allEvs(0), attack: 31 } as never,
            evs: { attack: 252 },
        });
        const attack = built.pokemon.stats.find(s => s.stat.name === 'attack')!.base_stat;
        expect(attack).toBe(Math.round((100 + 15 + 63) * 1.1)); // 196
    });

    it('EVs alone break the identity shortcut; no opts stays identity', () => {
        const withEvs = createBattleMon(mon, 1, 0, 50, null, { evs: { hp: 4 } });
        expect(withEvs.pokemon).not.toBe(mon);
        const plain = createBattleMon(mon, 1, 0, 50, null);
        expect(plain.pokemon).toBe(mon);
    });
});

describe('applyVitamin', () => {
    const withMon = () => registerMonProgress(createProfile(), { id: 25, level: 5 }, rngFrom([0.5]));

    it('grants +10 EVs to the chosen stat', () => {
        const profile = withMon();
        const after = applyVitamin(profile, 25, 'attack')!;
        expect(after.mons[25].evs?.attack).toBe(VITAMIN_EV_GAIN);
        expect(profile.mons[25].evs?.attack).toBeUndefined(); // immutable
    });

    it('clamps at the per-stat cap and returns null when nothing can be granted', () => {
        let profile = withMon();
        profile = { ...profile, mons: { ...profile.mons, 25: { ...profile.mons[25], evs: { attack: EV_STAT_CAP - 4 } } } };
        const after = applyVitamin(profile, 25, 'attack')!;
        expect(after.mons[25].evs?.attack).toBe(EV_STAT_CAP); // partial grant of 4
        expect(applyVitamin(after, 25, 'attack')).toBeNull(); // stat full
    });

    it('respects the 510 total cap across stats', () => {
        let profile = withMon();
        profile = {
            ...profile,
            mons: { ...profile.mons, 25: { ...profile.mons[25], evs: { attack: 252, defense: 252 } } },
        };
        // 504 used, 6 room left
        const after = applyVitamin(profile, 25, 'speed')!;
        expect(after.mons[25].evs?.speed).toBe(EV_TOTAL_CAP - 504);
        expect(evTotal(after.mons[25].evs)).toBe(EV_TOTAL_CAP);
        expect(applyVitamin(after, 25, 'hp')).toBeNull();
    });

    it('returns null for an unknown mon', () => {
        expect(applyVitamin(createProfile(), 999, 'attack')).toBeNull();
    });
});

describe('applyBattleEvs (trickle)', () => {
    const seeded = () => registerMonProgress(createProfile(), { id: 25, level: 5 }, rngFrom([0.5]));

    it('grants kos*4 + survived 2 into the given stat on a win', () => {
        const profile = seeded();
        const after = applyBattleEvs(profile, [{ pokemonId: 25, kos: 3, survived: true }], true, () => 'speed');
        expect(after.mons[25].evs?.speed).toBe(3 * 4 + 2);
    });

    it('grants nothing on a loss or for zero contribution', () => {
        const profile = seeded();
        expect(applyBattleEvs(profile, [{ pokemonId: 25, kos: 3, survived: true }], false, () => 'speed')).toBe(profile);
        expect(applyBattleEvs(profile, [{ pokemonId: 25, kos: 0, survived: false }], true, () => 'speed')).toBe(profile);
    });

    it('respects caps and skips unknown mons', () => {
        let profile = seeded();
        profile = { ...profile, mons: { ...profile.mons, 25: { ...profile.mons[25], evs: allEvs(85) } } }; // 510 total
        expect(applyBattleEvs(profile, [{ pokemonId: 25, kos: 5, survived: true }], true, () => 'attack')).toBe(profile);
        expect(applyBattleEvs(profile, [{ pokemonId: 999, kos: 5, survived: true }], true, () => 'attack')).toBe(profile);
    });
});

describe('highestBaseStat', () => {
    it('picks the largest base stat, ties break by IV_STATS order', () => {
        const speedy = makePokemon(2, 'speedy', ['normal']);
        speedy.stats.find(s => s.stat.name === 'speed')!.base_stat = 200;
        expect(highestBaseStat(speedy)).toBe('speed');
        const flat = makePokemon(3, 'flat', ['normal']); // all equal → first stat
        expect(highestBaseStat(flat)).toBe('hp');
    });
});

describe('selectLearnsetCandidates (TM/tutor tail)', () => {
    const entry = (name: string, methods: [string, number][]) => ({
        move: { name, url: `https://x/${name}` },
        version_group_details: methods.map(([m, level]) => ({
            level_learned_at: level,
            move_learn_method: { name: m },
        })),
    });

    it('tags level-up first (level desc), then machine/tutor at level 0, deduped', () => {
        const out = selectLearnsetCandidates([
            entry('tackle', [['level-up', 1]]),
            entry('hyper-beam', [['machine', 0]]),
            entry('body-slam', [['tutor', 0]]),
            entry('thunderbolt', [['level-up', 40], ['machine', 0]]), // level-up wins
            entry('growl', [['egg', 0]]), // ignored method
        ] as never);
        expect(out.map(c => `${c.move.name}:${c.method}`)).toEqual([
            'thunderbolt:level-up',
            'tackle:level-up',
            'hyper-beam:machine',
            'body-slam:tutor',
        ]);
        expect(out.find(c => c.move.name === 'hyper-beam')!.level).toBe(0);
    });

    it('caps the machine/tutor tail', () => {
        const many = Array.from({ length: 30 }, (_, i) => entry(`tm-${i}`, [['machine', 0]]));
        const out = selectLearnsetCandidates(many as never, 20, 5);
        expect(out).toHaveLength(5);
        expect(out.every(c => c.method === 'machine')).toBe(true);
    });
});
