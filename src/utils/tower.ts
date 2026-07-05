import type { Pokemon } from '../types/pokemon';
import type { Rng } from './battleEngine';

/**
 * Battle Tower: a level-normalized streak ladder. Every mon on both sides
 * fights at level 50 with no held items — team building and move choice
 * decide, not grinding. Every 7th battle is a boss with an elite ace.
 */

export const TOWER_LEVEL = 50;
export const TOWER_TEAM_SIZE = 3;

/** Battle number = current streak + 1 (the battle about to be fought). */
export const isTowerBossBattle = (battleNumber: number): boolean =>
    battleNumber > 0 && battleNumber % 7 === 0;

export interface TowerOpponent {
    pokemon: Pokemon;
    /** Boss aces get the elite stat bonus. */
    elite: boolean;
}

/** Pick a random opposing team; the last slot of a boss battle is elite. */
export const pickTowerOpponents = (
    pool: Pokemon[],
    battleNumber: number,
    rng: Rng
): TowerOpponent[] => {
    if (pool.length === 0) return [];
    const picks: Pokemon[] = [];
    const seen = new Set<number>();
    // Sample without replacement (falls back to repeats on tiny pools)
    for (let i = 0; i < TOWER_TEAM_SIZE; i++) {
        let candidate = pool[Math.floor(rng() * pool.length)];
        for (let tries = 0; tries < 10 && seen.has(candidate.id) && seen.size < pool.length; tries++) {
            candidate = pool[Math.floor(rng() * pool.length)];
        }
        seen.add(candidate.id);
        picks.push(candidate);
    }
    const boss = isTowerBossBattle(battleNumber);
    return picks.map((pokemon, i) => ({ pokemon, elite: boss && i === picks.length - 1 }));
};
