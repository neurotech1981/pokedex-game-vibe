import type { Pokemon } from '../types/pokemon';
import type { BoostableStat, DamageClass, Move, StatusType } from '../data/moves';
import { getMovesForTypes } from '../data/moves';

/**
 * Real per-Pokémon movesets from PokeAPI level-up learnsets.
 *
 * Structure mirrors evolution.ts: a pure, fixture-testable core
 * (selectLevelUpCandidates / mapApiMove / pickMoveset) plus a thin cached
 * fetch layer. Any failure falls back to the type-derived moveset —
 * a battle must never fail to start because of the network.
 */

export interface ApiMoveDetail {
    name: string;
    power: number | null;
    accuracy: number | null;
    priority?: number;
    type: { name: string };
    damage_class: { name: string };
    target?: { name: string } | null;
    stat_changes?: Array<{ change: number; stat: { name: string } }> | null;
    meta?: {
        ailment?: { name: string } | null;
        ailment_chance?: number;
        min_hits?: number | null;
        max_hits?: number | null;
        flinch_chance?: number;
        stat_chance?: number;
    } | null;
}

export interface ApiPokemonMoveEntry {
    move: { name: string; url: string };
    version_group_details: Array<{
        level_learned_at: number;
        move_learn_method: { name: string };
    }>;
}

const STATUS_AILMENTS = new Set<StatusType>(['paralysis', 'sleep', 'poison', 'burn', 'freeze', 'confusion']);

// PokeAPI stat names → engine BoostableStat (special stats fold into their
// physical counterparts; accuracy/evasion unmodeled)
const STAT_NAME_MAP: Record<string, BoostableStat> = {
    attack: 'attack',
    defense: 'defense',
    speed: 'speed',
    'special-attack': 'attack',
    'special-defense': 'defense',
};
const MAX_CANDIDATES = 8;
const MOVESET_SIZE = 4;

export const prettifyMoveName = (apiName: string): string =>
    apiName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

/** Convert a PokeAPI move payload into an engine Move. */
export const mapApiMove = (detail: ApiMoveDetail): Move => {
    const power = detail.power ?? 0;
    const damageClass = detail.damage_class.name as DamageClass;
    const move: Move = {
        name: prettifyMoveName(detail.name),
        type: detail.type.name,
        power: damageClass === 'status' ? 0 : power,
        accuracy: (detail.accuracy ?? 100) / 100,
        energyCost: Math.max(10, Math.round((power || 40) / 4) + 5),
        damageClass,
    };
    const ailment = detail.meta?.ailment?.name;
    if (ailment && STATUS_AILMENTS.has(ailment as StatusType)) {
        const chance = detail.meta?.ailment_chance ?? 0;
        move.statusEffect = {
            type: ailment as StatusType,
            // PokeAPI reports 0 for "always" (pure status moves like Thunder Wave)
            chance: chance > 0 ? chance / 100 : damageClass === 'status' ? 1 : 0.1,
        };
    }

    if (detail.priority && detail.priority !== 0) {
        move.priority = detail.priority;
    }
    if (detail.meta?.min_hits && detail.meta?.max_hits) {
        move.multiHit = { min: detail.meta.min_hits, max: detail.meta.max_hits };
    }
    if (detail.meta?.flinch_chance && detail.meta.flinch_chance > 0) {
        move.flinchChance = detail.meta.flinch_chance / 100;
    }

    // Stat changes: self-buffs map to the existing boost specialEffect,
    // opponent debuffs get their own field. Accuracy/evasion are skipped —
    // the engine's stat stages are attack/defense/speed only.
    const statChange = detail.stat_changes?.find(c => STAT_NAME_MAP[c.stat.name] !== undefined);
    if (statChange) {
        const stat = STAT_NAME_MAP[statChange.stat.name];
        const statChance = detail.meta?.stat_chance ?? 0;
        const chance = statChance > 0 ? statChance / 100 : damageClass === 'status' ? 1 : 0.1;
        const targetsUser = detail.target?.name === 'user' || detail.target?.name === 'user-and-allies';
        if (targetsUser && statChange.change > 0 && !move.specialEffect) {
            move.specialEffect = { type: 'boost', value: statChange.change, chance, stat };
        } else if (!targetsUser && statChange.change < 0) {
            move.debuff = { stat, stages: -statChange.change, chance };
        }
    }
    return move;
};

/** Pick the level-up learnset, strongest (latest-learned) first. */
export const selectLevelUpCandidates = (
    entries: ApiPokemonMoveEntry[],
    limit: number = MAX_CANDIDATES
): { move: { name: string; url: string }; level: number }[] =>
    entries
        .map(entry => {
            const levels = entry.version_group_details
                .filter(d => d.move_learn_method.name === 'level-up')
                .map(d => d.level_learned_at);
            return levels.length > 0 ? { move: entry.move, level: Math.max(...levels) } : null;
        })
        .filter((e): e is { move: { name: string; url: string }; level: number } => e !== null)
        .sort((a, b) => b.level - a.level)
        .slice(0, limit);

/** Compose the final ≤4 moveset: mostly damaging moves, one status slot if available. */
export const pickMoveset = (moves: Move[]): Move[] => {
    const damaging = moves.filter(m => m.power > 0);
    const status = moves.filter(m => m.power <= 0);
    // All-status learnset: just take what exists
    if (damaging.length === 0) return status.slice(0, MOVESET_SIZE);
    const picked = damaging.slice(0, status.length > 0 ? MOVESET_SIZE - 1 : MOVESET_SIZE);
    if (status.length > 0) picked.push(status[0]);
    return picked.slice(0, MOVESET_SIZE);
};

// ---------------------------------------------------------------------------
// Fetch layer with caches (per-move, per-Pokémon, plus a localStorage mirror)
// ---------------------------------------------------------------------------

// v2: v1 mirrors predate priority/multiHit/flinch/debuff fields
const STORAGE_KEY = 'pokedexGame.movesets.v2';

const readMirror = (): Record<number, Move[]> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
};

const writeMirror = (id: number, moves: Move[]): void => {
    try {
        const mirror = readMirror();
        mirror[id] = moves;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mirror));
    } catch {
        // storage full — cache misses are fine
    }
};

const moveDetailCache = new Map<string, Promise<ApiMoveDetail>>();

const fetchMoveDetail = (url: string): Promise<ApiMoveDetail> => {
    let cached = moveDetailCache.get(url);
    if (!cached) {
        cached = fetch(url).then(res => {
            if (!res.ok) throw new Error(`move ${url}: HTTP ${res.status}`);
            return res.json();
        }).catch(err => {
            moveDetailCache.delete(url); // allow retry
            throw err;
        });
        moveDetailCache.set(url, cached);
    }
    return cached;
};

const movesetCache = new Map<number, Promise<Move[]>>();

const fetchMoveset = async (pokemon: Pokemon): Promise<Move[]> => {
    const mirrored = readMirror()[pokemon.id];
    if (mirrored && mirrored.length > 0) return mirrored;

    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
    if (!res.ok) throw new Error(`pokemon ${pokemon.id}: HTTP ${res.status}`);
    const data = await res.json();
    const candidates = selectLevelUpCandidates(data.moves as ApiPokemonMoveEntry[]);
    if (candidates.length === 0) throw new Error('no level-up moves');

    const settled = await Promise.allSettled(candidates.map(c => fetchMoveDetail(c.move.url)));
    const moves = settled
        .filter(r => r.status === 'fulfilled')
        .map(r => mapApiMove(r.value));
    const moveset = pickMoveset(moves);
    if (moveset.length === 0) throw new Error('no usable moves');

    writeMirror(pokemon.id, moveset);
    return moveset;
};

// ---------------------------------------------------------------------------
// Full learnset (for the Move Manager) — unlike movesets, failures REJECT so
// the UI can show a retry; battles never depend on this path.
// ---------------------------------------------------------------------------

export interface LearnsetEntry {
    move: Move;
    level: number;
}

const LEARNSET_STORAGE_KEY = 'pokedexGame.learnsets.v1';
const LEARNSET_LIMIT = 20;

const readLearnsetMirror = (): Record<number, LearnsetEntry[]> => {
    try {
        return JSON.parse(localStorage.getItem(LEARNSET_STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
};

const writeLearnsetMirror = (id: number, entries: LearnsetEntry[]): void => {
    try {
        const mirror = readLearnsetMirror();
        mirror[id] = entries;
        localStorage.setItem(LEARNSET_STORAGE_KEY, JSON.stringify(mirror));
    } catch {
        // storage full — cache misses are fine
    }
};

const learnsetCache = new Map<number, Promise<LearnsetEntry[]>>();

const fetchLearnset = async (pokemon: Pokemon): Promise<LearnsetEntry[]> => {
    const mirrored = readLearnsetMirror()[pokemon.id];
    if (mirrored && mirrored.length > 0) return mirrored;

    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
    if (!res.ok) throw new Error(`pokemon ${pokemon.id}: HTTP ${res.status}`);
    const data = await res.json();
    const candidates = selectLevelUpCandidates(data.moves as ApiPokemonMoveEntry[], LEARNSET_LIMIT);
    if (candidates.length === 0) throw new Error('no level-up moves');

    const settled = await Promise.allSettled(
        candidates.map(async c => ({ move: mapApiMove(await fetchMoveDetail(c.move.url)), level: c.level }))
    );
    const entries = settled
        .filter((r): r is PromiseFulfilledResult<LearnsetEntry> => r.status === 'fulfilled')
        .map(r => r.value);
    if (entries.length === 0) throw new Error('no usable learnset moves');

    writeLearnsetMirror(pokemon.id, entries);
    return entries;
};

/** Full level-up learnset (≤20, level desc). Rejects on failure — callers retry. */
export const getFullLearnset = (pokemon: Pokemon): Promise<LearnsetEntry[]> => {
    let cached = learnsetCache.get(pokemon.id);
    if (!cached) {
        cached = fetchLearnset(pokemon).catch(err => {
            learnsetCache.delete(pokemon.id); // allow retry
            throw err;
        });
        learnsetCache.set(pokemon.id, cached);
    }
    return cached;
};

/**
 * The mon's real moveset, cached per species. Falls back to the
 * type-derived moves on any failure.
 */
export const getMovesetForPokemon = (pokemon: Pokemon): Promise<Move[]> => {
    let cached = movesetCache.get(pokemon.id);
    if (!cached) {
        cached = fetchMoveset(pokemon).catch(() => {
            movesetCache.delete(pokemon.id); // allow retry next battle
            return getMovesForTypes(pokemon.types);
        });
        movesetCache.set(pokemon.id, cached);
    }
    return cached;
};
