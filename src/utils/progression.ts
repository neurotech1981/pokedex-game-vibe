import type { Pokemon } from '../types/pokemon';
import type { Move } from '../data/moves';
import type { BallId, BallInventory, HeldInventory, HeldItemId, ItemId, ItemInventory } from '../data/items';
import { createInventory } from '../data/items';

/**
 * Pure progression logic: the persistent player profile, XP curve and
 * level-ups. All functions are side-effect free; persistence lives in
 * src/hooks/usePlayerProfile.ts.
 */

export const START_LEVEL = 50;
export const MAX_LEVEL = 100;

export interface MonProgress {
    xp: number;
    level: number;
    shiny?: boolean;
    elite?: boolean;
    /** Level at which the player declined an evolution offer (don't re-ask until next level-up). */
    declinedEvolveAt?: number;
    /** Held item equipped in the Team Builder. */
    heldItem?: HeldItemId;
    /** Player-picked moveset (≤4) from the Move Manager; unset → auto. */
    customMoves?: Move[];
}

export interface PlayerRecords {
    wins: number;
    losses: number;
    currentStreak: number;
    bestStreak: number;
    totalBattles: number;
    gauntletBestStage: number;
    /** Wild Pokémon caught with balls (Safari mode). */
    caught: number;
    /** Current and best Battle Tower win streaks. */
    towerStreak: number;
    towerBestStreak: number;
}

/** A recruited Pokémon parked outside any team. */
export interface BoxPokemon {
    pokemon: Pokemon;
    level: number;
    shiny?: boolean;
    elite?: boolean;
}

export interface LeagueProgress {
    /** League stage ids beaten, in any storage order (gating is positional). */
    defeated: string[];
    champion: boolean;
    /** Gym ids beaten again in post-game Round 2 rematches. */
    defeatedRematches: string[];
}

export interface PlayerProfile {
    version: 1;
    /** Per-species progress, keyed by national dex id. */
    mons: Record<number, MonProgress>;
    items: ItemInventory;
    /** Owned held items (equipping happens per-mon via MonProgress.heldItem). */
    heldItems: HeldInventory;
    records: PlayerRecords;
    box: BoxPokemon[];
    league: LeagueProgress;
    balls: BallInventory;
    /** Earned achievement ids (see src/utils/achievements.ts). */
    achievements: string[];
}

export const createProfile = (): PlayerProfile => ({
    version: 1,
    mons: {},
    items: createInventory(),
    heldItems: {},
    records: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, totalBattles: 0, gauntletBestStage: 0, caught: 0, towerStreak: 0, towerBestStreak: 0 },
    box: [],
    league: { defeated: [], champion: false, defeatedRematches: [] },
    balls: { pokeball: 5 },
    achievements: [],
});

export const getMonProgress = (profile: PlayerProfile, pokemonId: number): MonProgress =>
    profile.mons[pokemonId] ?? { xp: 0, level: START_LEVEL };

/** XP required to go from `level` to `level + 1`. Roughly a win per level early on. */
export const xpToNext = (level: number): number => 15 + 5 * (level - START_LEVEL);

export interface BattleXpEntry {
    pokemonId: number;
    kos: number;
    survived: boolean;
}

export interface XpGain {
    pokemonId: number;
    amount: number;
    fromLevel: number;
    toLevel: number;
    /** XP progress toward the next level after applying, as 0..1 (1 at MAX_LEVEL). */
    progressPct: number;
}

export const battleXpAmount = (
    won: boolean,
    kos: number,
    survived: boolean,
    streak: number,
    multiplier = 1
): number => {
    const base = won ? 20 + 4 * kos + (survived ? 5 : 0) : 8;
    return Math.round(base * (1 + Math.min(streak, 10) * 0.05) * multiplier);
};

/**
 * Apply post-battle XP to every participating mon. Returns the updated
 * profile plus per-mon gain summaries for the results screen.
 */
export const applyBattleXp = (
    profile: PlayerProfile,
    entries: BattleXpEntry[],
    won: boolean,
    streak: number,
    multiplier = 1
): { profile: PlayerProfile; gains: XpGain[] } => {
    const mons = { ...profile.mons };
    const gains: XpGain[] = [];

    for (const entry of entries) {
        const current = mons[entry.pokemonId] ?? { xp: 0, level: START_LEVEL };
        const amount = battleXpAmount(won, entry.kos, entry.survived, streak, multiplier);
        let { xp, level } = current;
        const fromLevel = level;
        xp += amount;
        while (level < MAX_LEVEL && xp >= xpToNext(level)) {
            xp -= xpToNext(level);
            level += 1;
        }
        if (level >= MAX_LEVEL) {
            level = MAX_LEVEL;
            xp = 0;
        }
        mons[entry.pokemonId] = { ...current, xp, level };
        gains.push({
            pokemonId: entry.pokemonId,
            amount,
            fromLevel,
            toLevel: level,
            progressPct: level >= MAX_LEVEL ? 1 : xp / xpToNext(level),
        });
    }

    return { profile: { ...profile, mons }, gains };
};

/**
 * Merge a recruited/boxed mon into per-species progress: keeps the best
 * level and any shiny/elite flags. Shared by battle recruitment and the
 * Box manager.
 */
export const registerMonProgress = (
    profile: PlayerProfile,
    entry: { id: number; level: number; shiny?: boolean; elite?: boolean }
): PlayerProfile => {
    const existing = profile.mons[entry.id];
    return {
        ...profile,
        mons: {
            ...profile.mons,
            [entry.id]: {
                ...existing,
                xp: existing?.xp ?? 0,
                level: Math.max(existing?.level ?? 0, entry.level),
                shiny: entry.shiny || existing?.shiny,
                elite: entry.elite || existing?.elite,
            },
        },
    };
};

export const updateRecords = (records: PlayerRecords, won: boolean): PlayerRecords => {
    const currentStreak = won ? records.currentStreak + 1 : 0;
    return {
        ...records,
        wins: records.wins + (won ? 1 : 0),
        losses: records.losses + (won ? 0 : 1),
        totalBattles: records.totalBattles + 1,
        currentStreak,
        bestStreak: Math.max(records.bestStreak, currentStreak),
    };
};

/** Merge item drops into an inventory. */
export const addItems = (inventory: ItemInventory, drops: ItemId[]): ItemInventory => {
    const next = { ...inventory };
    for (const id of drops) {
        next[id] = (next[id] ?? 0) + 1;
    }
    return next;
};

/** Merge ball drops into the owned pool. */
export const addBalls = (inventory: BallInventory, drops: BallId[]): BallInventory => {
    const next = { ...inventory };
    for (const id of drops) {
        next[id] = (next[id] ?? 0) + 1;
    }
    return next;
};

/** Merge held-item drops into the owned pool. */
export const addHeldItems = (inventory: HeldInventory, drops: HeldItemId[]): HeldInventory => {
    const next = { ...inventory };
    for (const id of drops) {
        next[id] = (next[id] ?? 0) + 1;
    }
    return next;
};

/** How many copies of a held item are free to equip (owned minus equipped). */
export const availableHeldItems = (profile: PlayerProfile, itemId: HeldItemId): number => {
    const owned = profile.heldItems[itemId] ?? 0;
    const equipped = Object.values(profile.mons).filter(m => m.heldItem === itemId).length;
    return Math.max(0, owned - equipped);
};
