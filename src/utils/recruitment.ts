import type { Pokemon } from '../types/pokemon';
import type { Rng } from './battleEngine';
import { ELITE_STAT_MOD } from './gauntlet';

/**
 * Post-battle recruitment: after a win there's a chance a wild Pokémon
 * offers to join — sometimes an elite (shiny, stat-boosted) or even a
 * legendary. Pure & rng-injectable.
 */

export const LEGENDARY_CHANCE = 0.03;
export const ELITE_CHANCE = 0.12;

export interface RecruitOffer {
    pokemon: Pokemon;
    level: number;
    shiny: boolean;
    elite: boolean;
    legendary: boolean;
}

/** Encounter odds grow with the win streak: 30% base, +3% per win, capped at 60%. */
export const recruitChance = (streak: number): number => Math.min(0.6, 0.3 + 0.03 * streak);

export const rollRecruit = (
    pool: Pokemon[],
    playerAvgLevel: number,
    streak: number,
    rng: Rng,
    opts: { guaranteed?: boolean } = {}
): RecruitOffer | null => {
    if (pool.length === 0) return null;
    if (!opts.guaranteed && rng() >= recruitChance(streak)) return null;

    const category = rng();
    const legendaries = pool.filter(p => p.is_legendary || p.is_mythical);
    const commons = pool.filter(p => !p.is_legendary && !p.is_mythical);

    if (category < LEGENDARY_CHANCE && legendaries.length > 0) {
        const pokemon = legendaries[Math.floor(rng() * legendaries.length)];
        return {
            pokemon,
            level: Math.min(100, playerAvgLevel + 5),
            shiny: false,
            elite: false,
            legendary: true,
        };
    }

    const commonPool = commons.length > 0 ? commons : pool;
    const pokemon = commonPool[Math.floor(rng() * commonPool.length)];

    if (category < LEGENDARY_CHANCE + ELITE_CHANCE) {
        return {
            pokemon,
            level: Math.min(100, playerAvgLevel + 5),
            shiny: true,
            elite: true,
            legendary: false,
        };
    }

    return {
        pokemon,
        level: Math.max(5, Math.min(100, playerAvgLevel + Math.floor(rng() * 5) - 2)),
        shiny: false,
        elite: false,
        legendary: false,
    };
};

/** Stat multiplier a recruit fights with (elites keep their boost forever). */
export const recruitStatMod = (elite: boolean | undefined): number => (elite ? ELITE_STAT_MOD : 1);
