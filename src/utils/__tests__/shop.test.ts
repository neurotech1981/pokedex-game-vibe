import { describe, expect, it } from 'vitest';
import {
    BALL_PRICES,
    DAILY_BASE,
    DAILY_STREAK_BONUS,
    DAILY_STREAK_CAP,
    HELD_PRICES,
    ITEM_PRICES,
    STARTING_COINS,
    coinsForBattle,
    dailyRewardAmount,
} from '../../data/shop';
import { addCoins, claimDailyReward, createProfile, spendCoins } from '../progression';
import { applyAchievements, getAchievement } from '../achievements';
import { mergeProfile } from '../../hooks/usePlayerProfile';

describe('coinsForBattle', () => {
    const base = { won: true, streak: 0 } as const;

    it('pays nothing on a loss, regardless of mode', () => {
        expect(coinsForBattle({ won: false, mode: 'league', leagueKind: 'champion', streak: 5 })).toBe(0);
        expect(coinsForBattle({ won: false, mode: 'quick', streak: 5 })).toBe(0);
    });

    it('orders modes: league > gauntlet > tower base > quick > wild', () => {
        const league = coinsForBattle({ ...base, mode: 'league', leagueKind: 'gym' });
        const gauntlet = coinsForBattle({ ...base, mode: 'gauntlet' });
        const tower = coinsForBattle({ ...base, mode: 'tower', towerStreak: 0 });
        const quick = coinsForBattle({ ...base, mode: 'quick' });
        const wild = coinsForBattle({ ...base, mode: 'wild' });
        expect(league).toBeGreaterThan(gauntlet);
        expect(gauntlet).toBeGreaterThan(tower);
        expect(tower).toBeGreaterThan(quick);
        expect(quick).toBeGreaterThan(wild);
    });

    it('league pays by kind: champion > elite4 > gym', () => {
        const gym = coinsForBattle({ ...base, mode: 'league', leagueKind: 'gym' });
        const e4 = coinsForBattle({ ...base, mode: 'league', leagueKind: 'elite4' });
        const champ = coinsForBattle({ ...base, mode: 'league', leagueKind: 'champion' });
        expect(champ).toBeGreaterThan(e4);
        expect(e4).toBeGreaterThan(gym);
    });

    it('rematches pay MORE than first clears (they are harder content)', () => {
        const first = coinsForBattle({ ...base, mode: 'league', leagueKind: 'gym' });
        const rematch = coinsForBattle({ ...base, mode: 'league', leagueKind: 'gym', leagueRematch: true });
        expect(rematch).toBeGreaterThan(first);
    });

    it('boss doubling applies to gauntlet and tower but never league', () => {
        const gauntlet = coinsForBattle({ ...base, mode: 'gauntlet' });
        const gauntletBoss = coinsForBattle({ ...base, mode: 'gauntlet', isBoss: true });
        expect(gauntletBoss).toBe(gauntlet * 2);
        const champ = coinsForBattle({ ...base, mode: 'league', leagueKind: 'champion' });
        const champBoss = coinsForBattle({ ...base, mode: 'league', leagueKind: 'champion', isBoss: true });
        expect(champBoss).toBe(champ); // league is priced by kind — no double-dip
    });

    it('streak bonus grows then caps at 10', () => {
        const at0 = coinsForBattle({ ...base, mode: 'quick', streak: 0 });
        const at5 = coinsForBattle({ ...base, mode: 'quick', streak: 5 });
        const at10 = coinsForBattle({ ...base, mode: 'quick', streak: 10 });
        const at25 = coinsForBattle({ ...base, mode: 'quick', streak: 25 });
        expect(at5).toBeGreaterThan(at0);
        expect(at10).toBeGreaterThan(at5);
        expect(at25).toBe(at10);
    });

    it('tower pay grows with tower streak and caps at 8', () => {
        const s0 = coinsForBattle({ ...base, mode: 'tower', towerStreak: 0 });
        const s8 = coinsForBattle({ ...base, mode: 'tower', towerStreak: 8 });
        const s20 = coinsForBattle({ ...base, mode: 'tower', towerStreak: 20 });
        expect(s8).toBeGreaterThan(s0);
        expect(s20).toBe(s8);
    });

    it('catching a wild mon pays a bonus over just winning', () => {
        const win = coinsForBattle({ ...base, mode: 'wild' });
        const caught = coinsForBattle({ ...base, mode: 'wild', caught: true });
        expect(caught).toBeGreaterThan(win);
    });
});

describe('coin helpers', () => {
    it('spendCoins deducts and preserves immutability', () => {
        const profile = createProfile();
        const after = spendCoins(profile, 100);
        expect(after?.coins).toBe(STARTING_COINS - 100);
        expect(profile.coins).toBe(STARTING_COINS);
    });

    it('spendCoins allows exact balance and rejects insufficiency', () => {
        const profile = createProfile();
        expect(spendCoins(profile, STARTING_COINS)?.coins).toBe(0);
        expect(spendCoins(profile, STARTING_COINS + 1)).toBeNull();
    });

    it('addCoins is a no-op reference for zero', () => {
        const profile = createProfile();
        expect(addCoins(profile, 0)).toBe(profile);
        expect(addCoins(profile, 50).coins).toBe(STARTING_COINS + 50);
    });

    it('every shop price is a positive integer', () => {
        [...Object.values(ITEM_PRICES), ...Object.values(BALL_PRICES), ...Object.values(HELD_PRICES)].forEach(p => {
            expect(Number.isInteger(p)).toBe(true);
            expect(p).toBeGreaterThan(0);
        });
    });
});

describe('claimDailyReward', () => {
    it('first claim pays the base amount and starts a streak', () => {
        const result = claimDailyReward(createProfile(), '2026-07-10');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(DAILY_BASE);
        expect(result!.streak).toBe(1);
        expect(result!.profile.coins).toBe(STARTING_COINS + DAILY_BASE);
        expect(result!.profile.lastDailyClaim).toBe('2026-07-10');
    });

    it('rejects a second claim on the same day', () => {
        const first = claimDailyReward(createProfile(), '2026-07-10')!;
        expect(claimDailyReward(first.profile, '2026-07-10')).toBeNull();
    });

    it('consecutive days grow the streak bonus', () => {
        let profile = claimDailyReward(createProfile(), '2026-07-10')!.profile;
        const day2 = claimDailyReward(profile, '2026-07-11')!;
        expect(day2.streak).toBe(2);
        expect(day2.amount).toBe(DAILY_BASE + DAILY_STREAK_BONUS);
        profile = day2.profile;
        // crosses a month boundary correctly
        const endOfMonth = claimDailyReward({ ...profile, lastDailyClaim: '2026-07-31', dailyStreak: 3 }, '2026-08-01')!;
        expect(endOfMonth.streak).toBe(4);
    });

    it('a missed day resets the streak to 1', () => {
        const first = claimDailyReward(createProfile(), '2026-07-10')!;
        const later = claimDailyReward(first.profile, '2026-07-13')!;
        expect(later.streak).toBe(1);
        expect(later.amount).toBe(DAILY_BASE);
    });

    it('streak bonus caps', () => {
        expect(dailyRewardAmount(DAILY_STREAK_CAP + 1)).toBe(DAILY_BASE + DAILY_STREAK_BONUS * DAILY_STREAK_CAP);
        expect(dailyRewardAmount(99)).toBe(dailyRewardAmount(DAILY_STREAK_CAP + 1));
    });
});

describe('coins persistence & achievements', () => {
    it('mergeProfile backfills coins for pre-coin saves and preserves existing balances', () => {
        const old = { version: 1, mons: {} } as never;
        expect(mergeProfile(old).coins).toBe(STARTING_COINS);
        const withCoins = { version: 1, coins: 4200 } as never;
        expect(mergeProfile(withCoins).coins).toBe(4200);
    });

    it('applyAchievements pays coin rewards exactly once', () => {
        const profile = createProfile();
        const reward = getAchievement('first-win')?.reward?.coins ?? 0;
        expect(reward).toBeGreaterThan(0);
        const after = applyAchievements(profile, ['first-win']);
        expect(after.coins).toBe(STARTING_COINS + reward);
        expect(after.achievements).toContain('first-win');
    });
});
