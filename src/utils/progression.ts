import type { Pokemon } from '../types/pokemon';
import type { Move } from '../data/moves';
import type { BallId, BallInventory, HeldInventory, HeldItemId, ItemId, ItemInventory } from '../data/items';
import { createInventory } from '../data/items';
import type { Ivs } from '../data/natures';
import { rollIvs, rollNature } from '../data/natures';
import type { Rng } from './battleEngine';

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
    /** Nature id (data/natures.ts), rolled once on first registration. */
    nature?: string;
    /** Per-stat IVs 0–31, rolled once on first registration. */
    ivs?: Ivs;
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
    /** Beat Red at Mt. Silver — the true ending. */
    champion2: boolean;
    /** Gym ids beaten again in post-game Round 2 rematches. */
    defeatedRematches: string[];
}

/** Per-species Pokédex registration (national dex ids, unique). */
export interface DexProgress {
    seen: number[];
    caught: number[];
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
    /** Kanto Journey adventure progress (see src/data/journey.ts). */
    journey: {
        started: boolean;
        starterId?: number;
        position: string;
        clearedTrainers: string[];
    };
    /** Seen/caught Pokédex registration. */
    dex: DexProgress;
}

export const createProfile = (): PlayerProfile => ({
    version: 1,
    mons: {},
    items: createInventory(),
    heldItems: {},
    records: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, totalBattles: 0, gauntletBestStage: 0, caught: 0, towerStreak: 0, towerBestStreak: 0 },
    box: [],
    league: { defeated: [], champion: false, champion2: false, defeatedRematches: [] },
    balls: { pokeball: 5 },
    achievements: [],
    journey: { started: false, position: 'pallet-town', clearedTrainers: [] },
    dex: { seen: [], caught: [] },
});

export const KANTO_DEX_SIZE = 151;
export const JOHTO_DEX_MAX = 251;

const unionIds = (existing: number[], ids: number[]): number[] => {
    const set = new Set(existing);
    let changed = false;
    for (const id of ids) {
        if (!set.has(id)) {
            set.add(id);
            changed = true;
        }
    }
    return changed ? [...set] : existing;
};

/** Mark species as seen. Returns the same profile reference when nothing is new. */
export const registerDexSeen = (profile: PlayerProfile, ids: number[]): PlayerProfile => {
    const seen = unionIds(profile.dex.seen, ids);
    return seen === profile.dex.seen ? profile : { ...profile, dex: { ...profile.dex, seen } };
};

/** Mark species as caught (caught implies seen). Same-reference when nothing is new. */
export const registerDexCaught = (profile: PlayerProfile, ids: number[]): PlayerProfile => {
    const caught = unionIds(profile.dex.caught, ids);
    const seen = unionIds(profile.dex.seen, ids);
    if (caught === profile.dex.caught && seen === profile.dex.seen) return profile;
    return { ...profile, dex: { seen, caught } };
};

export const dexCompletion = (dex: DexProgress) => {
    const kanto = (ids: number[]) => ids.filter(id => id <= KANTO_DEX_SIZE).length;
    const johto = (ids: number[]) => ids.filter(id => id > KANTO_DEX_SIZE && id <= JOHTO_DEX_MAX).length;
    return {
        kantoSeen: kanto(dex.seen),
        kantoCaught: kanto(dex.caught),
        johtoSeen: johto(dex.seen),
        johtoCaught: johto(dex.caught),
        hasJohto: johto(dex.seen) > 0 || johto(dex.caught) > 0,
    };
};

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
    entry: { id: number; level: number; shiny?: boolean; elite?: boolean },
    rng: Rng = Math.random
): PlayerProfile => {
    const existing = profile.mons[entry.id];
    return registerDexCaught({
        ...profile,
        mons: {
            ...profile.mons,
            [entry.id]: {
                ...existing,
                xp: existing?.xp ?? 0,
                level: Math.max(existing?.level ?? 0, entry.level),
                shiny: entry.shiny || existing?.shiny,
                elite: entry.elite || existing?.elite,
                nature: existing?.nature ?? rollNature(rng),
                ivs: existing?.ivs ?? rollIvs(rng),
            },
        },
    }, [entry.id]);
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
