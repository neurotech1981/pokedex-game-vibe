import type { Pokemon } from '../../types/pokemon';
import type { EngineState, Rng } from '../battleEngine';
import { createBattleMon, createEngineState } from '../battleEngine';

/** Shared fixtures for the battle test suites. */

export const makePokemon = (
    id: number,
    name: string,
    types: string[],
    {
        hp = 100,
        attack = 100,
        defense = 100,
        speed = 100,
        specialAttack = 100,
        specialDefense = 100,
    } = {}
): Pokemon => ({
    id,
    name,
    image: '',
    types,
    height: 1,
    weight: 10,
    stats: [
        { base_stat: hp, stat: { name: 'hp' } },
        { base_stat: attack, stat: { name: 'attack' } },
        { base_stat: defense, stat: { name: 'defense' } },
        { base_stat: specialAttack, stat: { name: 'special-attack' } },
        { base_stat: specialDefense, stat: { name: 'special-defense' } },
        { base_stat: speed, stat: { name: 'speed' } },
    ],
    abilities: [],
});

export const rngFrom = (values: number[]): Rng => {
    let i = 0;
    return () => (i < values.length ? values[i++] : 0.5);
};

export const makeState = (
    team1Pokemon: Pokemon[],
    team2Pokemon: Pokemon[],
    level = 50
): EngineState => {
    const team1 = team1Pokemon.map((p, i) => createBattleMon(p, 1, i, level, null));
    const team2 = team2Pokemon.map((p, i) => createBattleMon(p, 2, i, level, null));
    return createEngineState(team1, team2);
};
