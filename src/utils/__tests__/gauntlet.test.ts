import { describe, it, expect } from 'vitest';
import type { Pokemon } from '../../types/pokemon';
import {
    ELITE_LEVEL_BONUS,
    ELITE_STAT_MOD,
    createGauntletStage,
    isBossStage,
    nextStageHpPct,
    stageDifficulty,
    stageLevel,
    stageTeamSize,
} from '../gauntlet';
import { createBattleMon } from '../battleEngine';
import type { Rng } from '../battleEngine';

const makePokemon = (id: number): Pokemon => ({
    id,
    name: `mon${id}`,
    image: '',
    types: ['normal'],
    height: 1,
    weight: 10,
    stats: [
        { base_stat: 100, stat: { name: 'hp' } },
        { base_stat: 100, stat: { name: 'attack' } },
        { base_stat: 100, stat: { name: 'defense' } },
        { base_stat: 100, stat: { name: 'speed' } },
    ],
    abilities: [],
});

const POOL = Array.from({ length: 20 }, (_, i) => makePokemon(i + 1));
const rngFrom = (values: number[]): Rng => {
    let i = 0;
    return () => (i < values.length ? values[i++] : 0.5);
};

describe('stage scaling', () => {
    it('team size ramps 1 → 6', () => {
        expect(stageTeamSize(1)).toBe(1);
        expect(stageTeamSize(2)).toBe(2);
        expect(stageTeamSize(4)).toBe(3);
        expect(stageTeamSize(9)).toBe(5);
        expect(stageTeamSize(11)).toBe(6);
        expect(stageTeamSize(30)).toBe(6);
    });

    it('levels climb from just below the player average', () => {
        expect(stageLevel(1, 50)).toBe(50);
        expect(stageLevel(3, 50)).toBe(54);
        expect(stageLevel(10, 50)).toBe(68);
        expect(stageLevel(40, 90)).toBe(100); // capped
    });

    it('difficulty becomes expert from stage 4', () => {
        expect(stageDifficulty(1)).toBe('intermediate');
        expect(stageDifficulty(3)).toBe('intermediate');
        expect(stageDifficulty(4)).toBe('expert');
    });

    it('every 3rd stage is a boss', () => {
        expect([1, 2, 3, 4, 5, 6, 9].map(isBossStage)).toEqual([false, false, true, false, false, true, true]);
    });
});

describe('createGauntletStage', () => {
    it('builds distinct opponents at the stage level', () => {
        const stage = createGauntletStage(POOL, 2, 50, () => 0.4);
        expect(stage.opponents).toHaveLength(2);
        expect(stage.isBoss).toBe(false);
        const ids = stage.opponents.map(o => o.pokemon.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(stage.opponents.every(o => o.level === stageLevel(2, 50))).toBe(true);
    });

    it('boss stages field an elite ace', () => {
        const stage = createGauntletStage(POOL, 3, 50, rngFrom([0.1, 0.2, 0.3, 0.4]));
        expect(stage.isBoss).toBe(true);
        const ace = stage.opponents[stage.opponents.length - 1];
        expect(ace.shiny).toBe(true);
        expect(ace.statMod).toBe(ELITE_STAT_MOD);
        expect(ace.level).toBe(stageLevel(3, 50) + ELITE_LEVEL_BONUS);
        // non-ace opponents are normal
        expect(stage.opponents.slice(0, -1).every(o => !o.shiny)).toBe(true);
    });

    it('elite stat mod boosts derived stats via createBattleMon', () => {
        const normal = createBattleMon(makePokemon(1), 2, 0, 60, null);
        const elite = createBattleMon(makePokemon(1), 2, 0, 60, null, { statMod: ELITE_STAT_MOD, shiny: true });
        expect(elite.maxHp).toBeGreaterThan(normal.maxHp);
        expect(elite.shiny).toBe(true);
        expect(elite.pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat).toBe(115);
    });
});

describe('carry-over between stages', () => {
    it('survivors heal 40%, fainted mons return at 30%', () => {
        expect(nextStageHpPct(50, 100)).toBeCloseTo(0.9);
        expect(nextStageHpPct(90, 100)).toBe(1);
        expect(nextStageHpPct(0, 100)).toBe(0.3);
    });

    it('createBattleMon applies a starting HP fraction', () => {
        const mon = createBattleMon(makePokemon(1), 1, 0, 50, null, { currentHpPct: 0.3 });
        expect(mon.currentHp).toBe(Math.round(mon.maxHp * 0.3));
        const full = createBattleMon(makePokemon(1), 1, 0, 50, null);
        expect(full.currentHp).toBe(full.maxHp);
    });
});
