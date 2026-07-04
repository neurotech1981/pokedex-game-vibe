import { describe, it, expect } from 'vitest';
import {
    MAX_LEVEL,
    START_LEVEL,
    addItems,
    applyBattleXp,
    battleXpAmount,
    createProfile,
    getMonProgress,
    updateRecords,
    xpToNext,
} from '../progression';
import { rollBattleRewards, rollItemDrop } from '../../data/rewards';
import type { Rng } from '../battleEngine';

const rngFrom = (values: number[]): Rng => {
    let i = 0;
    return () => (i < values.length ? values[i++] : 0.5);
};

describe('xp curve', () => {
    it('starts cheap and grows with level', () => {
        expect(xpToNext(START_LEVEL)).toBe(15);
        expect(xpToNext(60)).toBe(65);
        expect(xpToNext(99)).toBe(260);
    });

    it('pays more for wins, KOs, survival and streaks', () => {
        expect(battleXpAmount(false, 0, false, 0)).toBe(8);
        expect(battleXpAmount(true, 0, false, 0)).toBe(20);
        expect(battleXpAmount(true, 2, true, 0)).toBe(33);
        expect(battleXpAmount(true, 0, false, 4)).toBe(24); // x1.2
        expect(battleXpAmount(true, 0, false, 20)).toBe(30); // streak capped at 10 → x1.5
        expect(battleXpAmount(true, 0, false, 0, 1.5)).toBe(30); // gauntlet multiplier
    });
});

describe('applyBattleXp', () => {
    it('levels a fresh mon up after one good win', () => {
        const profile = createProfile();
        const { profile: next, gains } = applyBattleXp(
            profile,
            [{ pokemonId: 25, kos: 1, survived: true }],
            true,
            1
        );
        // 20 + 4 + 5 = 29 * 1.05 = 30 XP; level 50 needs 15 → level 51 with 15 left needs 20
        expect(gains[0]).toMatchObject({ pokemonId: 25, amount: 30, fromLevel: 50, toLevel: 51 });
        expect(next.mons[25]).toMatchObject({ level: 51, xp: 15 });
        // pure: original untouched
        expect(profile.mons[25]).toBeUndefined();
    });

    it('gives consolation XP on a loss', () => {
        const profile = createProfile();
        const { profile: next, gains } = applyBattleXp(
            profile,
            [{ pokemonId: 1, kos: 0, survived: false }],
            false,
            0
        );
        expect(gains[0].amount).toBe(8);
        expect(next.mons[1].level).toBe(50);
        expect(next.mons[1].xp).toBe(8);
    });

    it('caps at MAX_LEVEL', () => {
        const profile = createProfile();
        profile.mons[6] = { xp: 0, level: MAX_LEVEL };
        const { profile: next, gains } = applyBattleXp(profile, [{ pokemonId: 6, kos: 3, survived: true }], true, 5);
        expect(next.mons[6].level).toBe(MAX_LEVEL);
        expect(next.mons[6].xp).toBe(0);
        expect(gains[0].progressPct).toBe(1);
    });

    it('getMonProgress defaults unseen mons to the start level', () => {
        expect(getMonProgress(createProfile(), 999)).toEqual({ xp: 0, level: START_LEVEL });
    });
});

describe('records', () => {
    it('tracks streaks across wins and losses', () => {
        let records = createProfile().records;
        records = updateRecords(records, true);
        records = updateRecords(records, true);
        expect(records).toMatchObject({ wins: 2, losses: 0, currentStreak: 2, bestStreak: 2, totalBattles: 2 });
        records = updateRecords(records, false);
        expect(records).toMatchObject({ wins: 2, losses: 1, currentStreak: 0, bestStreak: 2, totalBattles: 3 });
        records = updateRecords(records, true);
        expect(records.currentStreak).toBe(1);
        expect(records.bestStreak).toBe(2);
    });
});

describe('rewards', () => {
    it('rolls the drop table by weight', () => {
        expect(rollItemDrop(rngFrom([0.1]))).toBe('potion');
        expect(rollItemDrop(rngFrom([0.6]))).toBe('fullHeal');
        expect(rollItemDrop(rngFrom([0.9]))).toBe('xAttack');
    });

    it('adds a bonus roll every 3rd streak win and for bosses', () => {
        expect(rollBattleRewards(1, false, rngFrom([0.1]))).toHaveLength(1);
        expect(rollBattleRewards(3, false, rngFrom([0.1, 0.6]))).toEqual(['potion', 'fullHeal']);
        expect(rollBattleRewards(1, true, rngFrom([0.1, 0.9]))).toEqual(['potion', 'xAttack']);
        expect(rollBattleRewards(6, true, rngFrom([0.1, 0.6, 0.9]))).toHaveLength(3);
    });

    it('addItems merges drops into an inventory', () => {
        const items = addItems({ potion: 1, fullHeal: 0, xAttack: 0 }, ['potion', 'fullHeal']);
        expect(items).toEqual({ potion: 2, fullHeal: 1, xAttack: 0 });
    });
});
