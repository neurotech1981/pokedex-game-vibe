import type { Pokemon } from '../types/pokemon';
import type { Rng } from './battleEngine';
import type { AIDifficulty, AIPersonality } from './battleAI';

/**
 * Gauntlet mode: fight an endless run of escalating AI teams with one team.
 * HP carries over between stages, every 3rd stage is a boss fielding an
 * elite (shiny, stat-boosted) Pokémon. Pure & rng-injectable.
 */

export const GAUNTLET_XP_MULTIPLIER = 1.5;

export const ELITE_STAT_MOD = 1.15;
export const ELITE_LEVEL_BONUS = 5;

export interface GauntletOpponent {
    pokemon: Pokemon;
    level: number;
    shiny?: boolean;
    statMod?: number;
}

export interface GauntletStage {
    /** 1-based stage number. */
    index: number;
    opponents: GauntletOpponent[];
    difficulty: AIDifficulty;
    personality: AIPersonality;
    isBoss: boolean;
}

export const isBossStage = (index: number): boolean => index % 3 === 0;

/** Team size ramps 1 → 6 over the first ~11 stages. */
export const stageTeamSize = (index: number): number => Math.min(6, Math.ceil((index + 1) / 2));

/** Enemy level relative to the player's average, climbing each stage. */
export const stageLevel = (index: number, playerAvgLevel: number): number =>
    Math.max(5, Math.min(100, playerAvgLevel - 2 + 2 * index));

export const stageDifficulty = (index: number): AIDifficulty =>
    index >= 4 ? 'expert' : 'intermediate';

const PERSONALITIES: AIPersonality[] = ['aggressive', 'defensive', 'balanced'];

/** HP fraction a mon starts the next stage with: survivors heal 40%, fainted mons return at 30%. */
export const nextStageHpPct = (currentHp: number, maxHp: number): number =>
    currentHp <= 0 ? 0.3 : Math.min(1, currentHp / maxHp + 0.4);

export const createGauntletStage = (
    pool: Pokemon[],
    index: number,
    playerAvgLevel: number,
    rng: Rng
): GauntletStage => {
    const size = Math.min(stageTeamSize(index), Math.max(1, pool.length));
    const level = stageLevel(index, playerAvgLevel);
    const boss = isBossStage(index);

    // Draw `size` distinct opponents from the pool
    const candidates = [...pool];
    const opponents: GauntletOpponent[] = [];
    for (let i = 0; i < size; i++) {
        const pick = Math.floor(rng() * candidates.length);
        const [pokemon] = candidates.splice(pick, 1);
        opponents.push({ pokemon, level });
    }

    // Bosses field an elite ace as their last mon
    if (boss && opponents.length > 0) {
        const ace = opponents[opponents.length - 1];
        ace.shiny = true;
        ace.statMod = ELITE_STAT_MOD;
        ace.level = Math.min(100, ace.level + ELITE_LEVEL_BONUS);
    }

    return {
        index,
        opponents,
        difficulty: stageDifficulty(index),
        personality: PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)] ?? 'balanced',
        isBoss: boss,
    };
};
