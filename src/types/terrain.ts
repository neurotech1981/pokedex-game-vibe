export type TerrainType = 'none' | 'electric' | 'grassy' | 'psychic' | 'misty';

export interface TerrainEffect {
    type: TerrainType;
    duration: number;
    visualEffect: string;
    damageMultiplier: number;
    statusEffectChance: number;
}

export const TERRAIN_EFFECTS: Record<TerrainType, TerrainEffect> = {
    none: {
        type: 'none',
        duration: 0,
        visualEffect: '',
        damageMultiplier: 1,
        statusEffectChance: 1
    },
    electric: {
        type: 'electric',
        duration: 5,
        visualEffect: '⚡',
        damageMultiplier: 1.3,
        statusEffectChance: 1.2
    },
    grassy: {
        type: 'grassy',
        duration: 5,
        visualEffect: '🌿',
        damageMultiplier: 1.2,
        statusEffectChance: 1.1
    },
    psychic: {
        type: 'psychic',
        duration: 5,
        visualEffect: '🔮',
        damageMultiplier: 1.25,
        statusEffectChance: 1.15
    },
    misty: {
        type: 'misty',
        duration: 5,
        visualEffect: '💫',
        damageMultiplier: 0.8,
        statusEffectChance: 0.5
    }
};