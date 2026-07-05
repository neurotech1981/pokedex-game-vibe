import { describe, it, expect } from 'vitest';
import { TOWER_LEVEL, TOWER_TEAM_SIZE, isTowerBossBattle, pickTowerOpponents } from '../tower';
import { makePokemon, rngFrom } from './helpers';

const POOL = [
    makePokemon(1, 'a', ['grass']),
    makePokemon(2, 'b', ['fire']),
    makePokemon(3, 'c', ['water']),
    makePokemon(4, 'd', ['rock']),
    makePokemon(5, 'e', ['electric']),
];

describe('battle tower', () => {
    it('boss cadence is every 7th battle', () => {
        expect(isTowerBossBattle(7)).toBe(true);
        expect(isTowerBossBattle(14)).toBe(true);
        expect([1, 2, 3, 4, 5, 6, 8, 13].some(isTowerBossBattle)).toBe(false);
    });

    it('picks a full team without duplicates from a big enough pool', () => {
        const team = pickTowerOpponents(POOL, 1, rngFrom([0.1, 0.3, 0.5, 0.7, 0.9, 0.2]));
        expect(team).toHaveLength(TOWER_TEAM_SIZE);
        expect(new Set(team.map(t => t.pokemon.id)).size).toBe(TOWER_TEAM_SIZE);
        expect(team.every(t => !t.elite)).toBe(true); // battle 1: no boss
    });

    it('boss battles mark the ace elite', () => {
        const team = pickTowerOpponents(POOL, 7, rngFrom([0.1, 0.3, 0.5, 0.7, 0.9, 0.2]));
        expect(team[team.length - 1].elite).toBe(true);
        expect(team.slice(0, -1).every(t => !t.elite)).toBe(true);
    });

    it('empty pool yields no opponents; tower level is the normalized 50', () => {
        expect(pickTowerOpponents([], 1, () => 0.5)).toEqual([]);
        expect(TOWER_LEVEL).toBe(50);
    });
});
