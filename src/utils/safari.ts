import type { Pokemon } from '../types/pokemon';
import type { Rng } from './battleEngine';
import type { BackgroundId } from '../data/battleBackgrounds';

/**
 * Safari mode: explore a biome, meet a wild Pokémon, weaken it and throw
 * balls. Pure & rng-injectable.
 */

export type WildRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Biome {
    id: string;
    name: string;
    emoji: string;
    backdrops: BackgroundId[];
    types: string[];
}

export const BIOMES: Biome[] = [
    { id: 'meadow', name: 'Sunny Meadow', emoji: '🌼', backdrops: ['meadow'], types: ['normal', 'grass', 'fairy', 'bug'] },
    { id: 'forest', name: 'Deep Forest', emoji: '🌲', backdrops: ['forest', 'darkmeadow'], types: ['bug', 'grass', 'poison'] },
    { id: 'coast', name: 'Azure Coast', emoji: '🌊', backdrops: ['beach', 'deepsea'], types: ['water', 'ice'] },
    { id: 'cavern', name: 'Echoing Cavern', emoji: '🪨', backdrops: ['earthycave', 'dampcave'], types: ['rock', 'ground', 'poison', 'dark'] },
    { id: 'outskirts', name: 'City Outskirts', emoji: '🏙️', backdrops: ['city'], types: ['electric', 'steel', 'fighting', 'normal'] },
    { id: 'skyruins', name: 'Sky Ruins', emoji: '🌌', backdrops: ['skypillar'], types: ['psychic', 'ghost', 'flying', 'dragon'] },
    { id: 'sands', name: 'Scorched Sands', emoji: '🏜️', backdrops: ['desert', 'orasdesert'], types: ['fire', 'ground'] },
];

export const getBiome = (id: string): Biome | undefined => BIOMES.find(b => b.id === id);

export interface WildEncounter {
    pokemon: Pokemon;
    level: number;
    rarity: WildRarity;
    shiny: boolean;
}

const pick = <T,>(pool: T[], rng: Rng): T => pool[Math.floor(rng() * pool.length)] ?? pool[0];

/**
 * Roll a wild encounter for a biome. Rarity: common 70% / uncommon 20%
 * (+3 levels) / rare 8% (+5 levels, 15% shiny) / legendary 2% (+8 levels).
 * Returns null only when the pool has no biome-matching Pokémon at all.
 */
export const rollWildEncounter = (
    pool: Pokemon[],
    biome: Biome,
    playerAvgLevel: number,
    rng: Rng
): WildEncounter | null => {
    const inBiome = pool.filter(p => p.types.some(t => biome.types.includes(t)));
    if (inBiome.length === 0) return null;

    const commons = inBiome.filter(p => !p.is_legendary && !p.is_mythical);
    const legendaries = inBiome.filter(p => p.is_legendary || p.is_mythical);
    const baseLevel = Math.max(5, Math.min(100, playerAvgLevel + Math.floor(rng() * 7) - 3));

    const roll = rng();
    if (roll < 0.02 && legendaries.length > 0) {
        return {
            pokemon: pick(legendaries, rng),
            level: Math.min(100, baseLevel + 8),
            rarity: 'legendary',
            shiny: false,
        };
    }
    const commonPool = commons.length > 0 ? commons : inBiome;
    if (roll < 0.1) {
        return {
            pokemon: pick(commonPool, rng),
            level: Math.min(100, baseLevel + 5),
            rarity: 'rare',
            shiny: rng() < 0.15,
        };
    }
    if (roll < 0.3) {
        return {
            pokemon: pick(commonPool, rng),
            level: Math.min(100, baseLevel + 3),
            rarity: 'uncommon',
            shiny: false,
        };
    }
    return { pokemon: pick(commonPool, rng), level: baseLevel, rarity: 'common', shiny: false };
};
