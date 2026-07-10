import type { Rng } from '../utils/battleEngine';

/**
 * Classic 25-nature table: each non-neutral nature raises one non-HP stat
 * by 10% and lowers another by 10%. HP is never nature-modified. IVs are
 * per-stat 0–31 rolls made once when a mon is first registered; the battle
 * engine folds both into effective base stats (see createBattleMon).
 */

export type NatureStat = 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

export interface Nature {
    id: string;
    name: string;
    up?: NatureStat;
    down?: NatureStat;
}

const n = (id: string, up?: NatureStat, down?: NatureStat): Nature => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    up,
    down,
});

export const NATURES: Nature[] = [
    // +attack
    n('lonely', 'attack', 'defense'),
    n('brave', 'attack', 'speed'),
    n('adamant', 'attack', 'special-attack'),
    n('naughty', 'attack', 'special-defense'),
    // +defense
    n('bold', 'defense', 'attack'),
    n('relaxed', 'defense', 'speed'),
    n('impish', 'defense', 'special-attack'),
    n('lax', 'defense', 'special-defense'),
    // +speed
    n('timid', 'speed', 'attack'),
    n('hasty', 'speed', 'defense'),
    n('jolly', 'speed', 'special-attack'),
    n('naive', 'speed', 'special-defense'),
    // +special-attack
    n('modest', 'special-attack', 'attack'),
    n('mild', 'special-attack', 'defense'),
    n('quiet', 'special-attack', 'speed'),
    n('rash', 'special-attack', 'special-defense'),
    // +special-defense
    n('calm', 'special-defense', 'attack'),
    n('gentle', 'special-defense', 'defense'),
    n('sassy', 'special-defense', 'speed'),
    n('careful', 'special-defense', 'special-attack'),
    // neutral
    n('hardy'),
    n('docile'),
    n('serious'),
    n('bashful'),
    n('quirky'),
];

export const getNature = (id: string | undefined): Nature | undefined =>
    id ? NATURES.find(nat => nat.id === id) : undefined;

export const natureMultiplier = (natureId: string | undefined, statName: string): number => {
    const nature = getNature(natureId);
    if (!nature) return 1;
    if (nature.up === statName) return 1.1;
    if (nature.down === statName) return 0.9;
    return 1;
};

export const rollNature = (rng: Rng): string =>
    NATURES[Math.min(NATURES.length - 1, Math.floor(rng() * NATURES.length))].id;

export const IV_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;
export type IvStat = (typeof IV_STATS)[number];
export type Ivs = Record<IvStat, number>;

export const MAX_IV = 31;

export const rollIvs = (rng: Rng): Ivs => {
    const ivs = {} as Ivs;
    for (const stat of IV_STATS) {
        ivs[stat] = Math.min(MAX_IV, Math.floor(rng() * (MAX_IV + 1)));
    }
    return ivs;
};

export const ivTotal = (ivs: Ivs): number => IV_STATS.reduce((sum, stat) => sum + ivs[stat], 0);

export const MAX_IV_TOTAL = MAX_IV * IV_STATS.length;

/**
 * EVs (effort values): trained points on top of IVs — from shop vitamins
 * and a small battle trickle. Sparse map, missing stat = 0. Folded into
 * battle stats as +floor(ev/4) in createBattleMon.
 */
export type Evs = Partial<Record<IvStat, number>>;

export const EV_STAT_CAP = 252;
export const EV_TOTAL_CAP = 510;

export const evTotal = (evs: Evs | undefined): number =>
    IV_STATS.reduce((sum, stat) => sum + (evs?.[stat] ?? 0), 0);

/** Short UI blurb like "Adamant ↑Atk ↓SpA" (neutral natures get no arrows). */
export const natureLabel = (natureId: string | undefined): string => {
    const nature = getNature(natureId);
    if (!nature) return '';
    if (!nature.up || !nature.down) return nature.name;
    const abbr: Record<NatureStat, string> = {
        attack: 'Atk',
        defense: 'Def',
        'special-attack': 'SpA',
        'special-defense': 'SpD',
        speed: 'Spe',
    };
    return `${nature.name} ↑${abbr[nature.up]} ↓${abbr[nature.down]}`;
};
