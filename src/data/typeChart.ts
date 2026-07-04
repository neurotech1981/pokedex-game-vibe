export interface TypeChartEntry {
    superEffective: string[];
    notVeryEffective: string[];
    noEffect: string[];
}

export type TypeChart = { [key: string]: TypeChartEntry };

export const TYPE_EFFECTIVENESS: TypeChart = {
    normal: {
        superEffective: [],
        notVeryEffective: ['rock', 'steel'],
        noEffect: ['ghost'],
    },
    fire: {
        superEffective: ['grass', 'ice', 'bug', 'steel'],
        notVeryEffective: ['fire', 'water', 'rock', 'dragon'],
        noEffect: [],
    },
    water: {
        superEffective: ['fire', 'ground', 'rock'],
        notVeryEffective: ['water', 'grass', 'dragon'],
        noEffect: [],
    },
    electric: {
        superEffective: ['water', 'flying'],
        notVeryEffective: ['electric', 'grass', 'dragon'],
        noEffect: ['ground'],
    },
    grass: {
        superEffective: ['water', 'ground', 'rock'],
        notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
        noEffect: [],
    },
    ice: {
        superEffective: ['grass', 'ground', 'flying', 'dragon'],
        notVeryEffective: ['fire', 'water', 'ice', 'steel'],
        noEffect: [],
    },
    fighting: {
        superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'],
        notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
        noEffect: ['ghost'],
    },
    poison: {
        superEffective: ['grass', 'fairy'],
        notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],
        noEffect: ['steel'],
    },
    ground: {
        superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'],
        notVeryEffective: ['grass', 'bug'],
        noEffect: ['flying'],
    },
    flying: {
        superEffective: ['grass', 'fighting', 'bug'],
        notVeryEffective: ['electric', 'rock', 'steel'],
        noEffect: [],
    },
    psychic: {
        superEffective: ['fighting', 'poison'],
        notVeryEffective: ['psychic', 'steel'],
        noEffect: ['dark'],
    },
    bug: {
        superEffective: ['grass', 'psychic', 'dark'],
        notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
        noEffect: [],
    },
    rock: {
        superEffective: ['fire', 'ice', 'flying', 'bug'],
        notVeryEffective: ['fighting', 'ground', 'steel'],
        noEffect: [],
    },
    ghost: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['dark'],
        noEffect: ['normal'],
    },
    dragon: {
        superEffective: ['dragon'],
        notVeryEffective: ['steel'],
        noEffect: ['fairy'],
    },
    dark: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['fighting', 'dark', 'fairy'],
        noEffect: [],
    },
    steel: {
        superEffective: ['ice', 'rock', 'fairy'],
        notVeryEffective: ['fire', 'water', 'electric', 'steel'],
        noEffect: [],
    },
    fairy: {
        superEffective: ['fighting', 'dragon', 'dark'],
        notVeryEffective: ['fire', 'poison', 'steel'],
        noEffect: [],
    },
};

export const calculateTypeEffectiveness = (
    moveType: string,
    defenderTypes: string[],
    chart: TypeChart = TYPE_EFFECTIVENESS
): number => {
    const entry = chart[moveType];
    if (!entry) return 1;
    let multiplier = 1;
    for (const defenderType of defenderTypes) {
        if (entry.superEffective.includes(defenderType)) {
            multiplier *= 2;
        } else if (entry.notVeryEffective.includes(defenderType)) {
            multiplier *= 0.5;
        } else if (entry.noEffect.includes(defenderType)) {
            multiplier *= 0;
        }
    }
    return multiplier;
};
