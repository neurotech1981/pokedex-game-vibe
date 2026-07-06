import type { BattleAction, BattleMon, TeamId } from './battleEngine';
import type { Pokemon } from '../types/pokemon';
import type { Ability } from '../types/abilities';
import type { Move } from '../data/moves';
import type { BallInventory, HeldItemId, ItemInventory } from '../data/items';

/**
 * Battle replays: a battle is fully reconstructable from the team configs,
 * the seeded engine rng (utils/rng.ts) and the recorded step list. BOTH
 * sides' actions are recorded — the AI is never re-run on playback, so AI
 * changes can't corrupt old replays. Each mon snapshot stores the EFFECTIVE
 * pokemon object (stats already rewritten for nature/IVs/statMod), which
 * makes playback exact and fully offline — no PokeAPI fetch, no re-derived
 * stats. Stored outside the profile in a dedicated key, newest first,
 * capped at MAX_REPLAYS.
 */

export const REPLAY_FORMAT = 1;
export const MAX_REPLAYS = 20;
const STORAGE_KEY = 'pokedexGame.replays.v1';

export interface ReplayMonConfig {
    /** Effective pokemon (stats as they entered battle) — rebuild is exact. */
    pokemon: Pokemon;
    level: number;
    shiny?: boolean;
    heldItem?: HeldItemId;
    moves: Move[];
    ability: Ability | null;
    /** Starting HP fraction (gauntlet carry-over); 1 = full. */
    currentHpPct?: number;
}

export type ReplayStep =
    | { kind: 'action'; team: TeamId; action: BattleAction }
    | { kind: 'forcedSwitch'; team: TeamId; targetKey: string };

export interface BattleReplay {
    format: number;
    seed: number;
    /** ISO timestamp — doubles as the replay's unique id. */
    date: string;
    mode: string;
    label: string;
    winner: TeamId | null;
    hotseat: boolean;
    teams: { 1: ReplayMonConfig[]; 2: ReplayMonConfig[] };
    items: { 1: ItemInventory; 2: ItemInventory };
    wild?: boolean;
    balls?: BallInventory;
    steps: ReplayStep[];
}

export const canPlayReplay = (replay: BattleReplay): boolean =>
    replay.format === REPLAY_FORMAT && (replay.teams?.[1]?.length ?? 0) > 0 && (replay.teams?.[2]?.length ?? 0) > 0;

/** Snapshot a freshly-created BattleMon (pre-beginBattle) into a rebuildable config. */
export const monConfigFrom = (mon: BattleMon): ReplayMonConfig => ({
    pokemon: mon.pokemon,
    level: mon.level,
    shiny: mon.shiny,
    heldItem: mon.heldItem,
    moves: mon.moves,
    ability: mon.ability,
    currentHpPct: mon.currentHp < mon.maxHp ? mon.currentHp / mon.maxHp : undefined,
});

export const loadReplays = (): BattleReplay[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const persist = (replays: BattleReplay[]): BattleReplay[] => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(replays));
        return replays;
    } catch {
        // Storage full — drop the older half and retry once
        try {
            const trimmed = replays.slice(0, Math.ceil(replays.length / 2));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            return trimmed;
        } catch {
            return replays; // give up silently; replays are a luxury feature
        }
    }
};

/** Prepend the new replay, keep the newest MAX_REPLAYS. */
export const saveReplay = (replay: BattleReplay): BattleReplay[] =>
    persist([replay, ...loadReplays()].slice(0, MAX_REPLAYS));

export const deleteReplay = (date: string): BattleReplay[] =>
    persist(loadReplays().filter(r => r.date !== date));
