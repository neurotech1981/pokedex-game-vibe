import { describe, it, expect } from 'vitest';
import type { Pokemon } from '../../types/pokemon';
import { ELITE_CHANCE, LEGENDARY_CHANCE, recruitChance, rollRecruit } from '../recruitment';
import { findEvolutionTarget, idFromSpeciesUrl } from '../evolution';
import type { ChainNode } from '../evolution';
import type { Rng } from '../battleEngine';

const makePokemon = (id: number, legendary = false): Pokemon => ({
    id,
    name: `mon${id}`,
    image: '',
    types: ['normal'],
    height: 1,
    weight: 10,
    stats: [],
    abilities: [],
    is_legendary: legendary,
});

const POOL = [makePokemon(1), makePokemon(2), makePokemon(3), makePokemon(150, true)];
const rngFrom = (values: number[]): Rng => {
    let i = 0;
    return () => (i < values.length ? values[i++] : 0.5);
};

describe('recruitment', () => {
    it('encounter odds scale with streak and cap at 60%', () => {
        expect(recruitChance(0)).toBeCloseTo(0.3);
        expect(recruitChance(5)).toBeCloseTo(0.45);
        expect(recruitChance(20)).toBe(0.6);
    });

    it('returns null when the encounter roll fails', () => {
        expect(rollRecruit(POOL, 50, 0, rngFrom([0.9]))).toBeNull();
    });

    it('guaranteed offers skip the encounter roll', () => {
        const offer = rollRecruit(POOL, 50, 0, rngFrom([0.5, 0.5, 0.5]), { guaranteed: true });
        expect(offer).not.toBeNull();
    });

    it('rolls a legendary below the legendary threshold', () => {
        // encounter, category < 0.03, pick
        const offer = rollRecruit(POOL, 50, 0, rngFrom([0.1, LEGENDARY_CHANCE - 0.01, 0.0]))!;
        expect(offer.legendary).toBe(true);
        expect(offer.pokemon.id).toBe(150);
        expect(offer.level).toBe(55);
        expect(offer.elite).toBe(false);
    });

    it('rolls an elite between the legendary and elite thresholds', () => {
        const offer = rollRecruit(POOL, 50, 0, rngFrom([0.1, LEGENDARY_CHANCE + ELITE_CHANCE - 0.01, 0.0]))!;
        expect(offer.elite).toBe(true);
        expect(offer.shiny).toBe(true);
        expect(offer.legendary).toBe(false);
        expect(offer.level).toBe(55);
        // elites come from the non-legendary pool
        expect(offer.pokemon.id).not.toBe(150);
    });

    it('rolls a common recruit near the player average otherwise', () => {
        // encounter, category, pick, level jitter (0.9 → +2)
        const offer = rollRecruit(POOL, 50, 0, rngFrom([0.1, 0.5, 0.0, 0.99]))!;
        expect(offer.elite).toBe(false);
        expect(offer.legendary).toBe(false);
        expect(offer.level).toBe(52);
    });

    it('returns null on an empty pool', () => {
        expect(rollRecruit([], 50, 0, rngFrom([0.0]), { guaranteed: true })).toBeNull();
    });
});

// PokeAPI-shaped fixture: bulbasaur → ivysaur (16) → venusaur (32)
const CHAIN_FIXTURE: ChainNode = {
    species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
    evolves_to: [
        {
            species: { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
            evolution_details: [{ min_level: 16 }],
            evolves_to: [
                {
                    species: { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon-species/3/' },
                    evolution_details: [{ min_level: 32 }],
                    evolves_to: [],
                },
            ],
        },
    ],
};

// Level-less chain (trade evolution): haunter → gengar with no min_level
const LEVELLESS_CHAIN: ChainNode = {
    species: { name: 'gastly', url: 'https://pokeapi.co/api/v2/pokemon-species/92/' },
    evolves_to: [
        {
            species: { name: 'haunter', url: 'https://pokeapi.co/api/v2/pokemon-species/93/' },
            evolution_details: [{ min_level: 25 }],
            evolves_to: [
                {
                    species: { name: 'gengar', url: 'https://pokeapi.co/api/v2/pokemon-species/94/' },
                    evolution_details: [{ min_level: null }],
                    evolves_to: [],
                },
            ],
        },
    ],
};

describe('evolution chain-walk', () => {
    it('parses ids from species urls', () => {
        expect(idFromSpeciesUrl('https://pokeapi.co/api/v2/pokemon-species/25/')).toBe(25);
    });

    it('finds the next evolution with its min level', () => {
        expect(findEvolutionTarget(CHAIN_FIXTURE, 1)).toEqual({ id: 2, name: 'ivysaur', minLevel: 16 });
        expect(findEvolutionTarget(CHAIN_FIXTURE, 2)).toEqual({ id: 3, name: 'venusaur', minLevel: 32 });
    });

    it('returns null for fully evolved species', () => {
        expect(findEvolutionTarget(CHAIN_FIXTURE, 3)).toBeNull();
    });

    it('returns null for species not in the chain', () => {
        expect(findEvolutionTarget(CHAIN_FIXTURE, 99)).toBeNull();
    });

    it('defaults level-less evolutions by chain depth (30 / 55)', () => {
        expect(findEvolutionTarget(LEVELLESS_CHAIN, 93)).toEqual({ id: 94, name: 'gengar', minLevel: 55 });
    });
});
