import type { BallId, HeldItemId, ItemId } from './items';

/**
 * The PokéCoin economy: every balance number in the game lives here so
 * retuning is a one-file edit. Sources: battle wins (coinsForBattle),
 * daily reward, achievement rewards (tiers in achievements.ts). Sinks:
 * the Poké Mart (these prices) and, later, vitamins/TM unlocks.
 */

export const STARTING_COINS = 300;

export const ITEM_PRICES: Record<ItemId, number> = {
    potion: 150,
    fullHeal: 200,
    xAttack: 250,
};

export const BALL_PRICES: Record<BallId, number> = {
    pokeball: 100,
    greatball: 200,
    ultraball: 400,
};

export const HELD_PRICES: Record<HeldItemId, number> = {
    charcoal: 800,
    mysticWater: 800,
    magnet: 800,
    miracleSeed: 800,
    leftovers: 1200,
    quickClaw: 1200,
    focusSash: 1500,
};

// Daily reward: base + streak bonus for consecutive-day claims.
export const DAILY_BASE = 100;
export const DAILY_STREAK_BONUS = 25;
export const DAILY_STREAK_CAP = 6;

/** Coins paid for a daily claim at the given consecutive-day streak (1-based). */
export const dailyRewardAmount = (streak: number): number =>
    DAILY_BASE + DAILY_STREAK_BONUS * Math.min(Math.max(streak - 1, 0), DAILY_STREAK_CAP);

export type CoinBattleMode = 'quick' | 'journey' | 'wild' | 'gauntlet' | 'league' | 'tower';

export interface CoinBattleOpts {
    won: boolean;
    mode: CoinBattleMode;
    /** Wild encounter ended in a catch (bonus). */
    caught?: boolean;
    leagueKind?: 'gym' | 'elite4' | 'champion';
    /** Round 2 rematch — harder (+15 levels), pays MORE, mirroring the XP bonus. */
    leagueRematch?: boolean;
    towerStreak?: number;
    /** Gauntlet/tower boss battles pay double (league is already priced by kind). */
    isBoss?: boolean;
    /** records.currentStreak after this battle. */
    streak: number;
}

const LEAGUE_COINS: Record<'gym' | 'elite4' | 'champion', number> = {
    gym: 150,
    elite4: 220,
    champion: 300,
};

export const REMATCH_COIN_MULTIPLIER = 1.5;

/** Pure coin payout for a finished battle. Losses pay nothing. */
export const coinsForBattle = (opts: CoinBattleOpts): number => {
    if (!opts.won) return 0;
    let base: number;
    switch (opts.mode) {
        case 'wild':
            base = 40 + (opts.caught ? 25 : 0);
            break;
        case 'gauntlet':
            base = 80;
            break;
        case 'tower':
            base = 70 + 10 * Math.min(opts.towerStreak ?? 0, 8);
            break;
        case 'league':
            base = LEAGUE_COINS[opts.leagueKind ?? 'gym'];
            if (opts.leagueRematch) base = Math.round(base * REMATCH_COIN_MULTIPLIER);
            break;
        default:
            base = 60; // quick + journey trainers
    }
    if (opts.isBoss && (opts.mode === 'gauntlet' || opts.mode === 'tower')) base *= 2;
    return base + 5 * Math.min(opts.streak, 10);
};
