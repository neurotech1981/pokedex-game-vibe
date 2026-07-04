// Ability Types
export type AbilityTrigger = 'onAttack' | 'onDefend' | 'onEnter' | 'onFaint' | 'onStatus' | 'onTurnStart' | 'onTurnEnd';
export type AbilityTarget = 'self' | 'opponent' | 'both' | 'all';

export interface AbilityEffect {
    type: 'heal' | 'boost' | 'status' | 'damage' | 'weather' | 'terrain' | 'immunity' | 'intimidate' | 'retaliate' | 'survive';
    value: number;
    duration?: number;
    chance?: number;
    statusType?: 'paralysis' | 'burn' | 'freeze' | 'sleep' | 'poison' | 'confusion';
    immuneType?: string;
}

export interface Ability {
    name: string;
    description: string;
    trigger: AbilityTrigger;
    target: AbilityTarget;
    effect: AbilityEffect;
    animation?: {
        type: 'heal' | 'boost' | 'status' | 'damage' | 'weather' | 'terrain';
        color: string;
        duration: number;
    };
}

// Ability definitions
export const ABILITIES: { [key: string]: Ability } = {
    Overgrow: {
        name: 'Overgrow',
        description: 'Powers up Grass-type moves when HP is low',
        trigger: 'onAttack',
        target: 'self',
        effect: {
            type: 'boost',
            value: 1.5,
            chance: 0.3
        },
        animation: {
            type: 'boost',
            color: '#4CAF50',
            duration: 1000
        }
    },
    Blaze: {
        name: 'Blaze',
        description: 'Powers up Fire-type moves when HP is low',
        trigger: 'onAttack',
        target: 'self',
        effect: {
            type: 'boost',
            value: 1.5,
            chance: 0.3
        },
        animation: {
            type: 'boost',
            color: '#F44336',
            duration: 1000
        }
    },
    Torrent: {
        name: 'Torrent',
        description: 'Powers up Water-type moves when HP is low',
        trigger: 'onAttack',
        target: 'self',
        effect: {
            type: 'boost',
            value: 1.5,
            chance: 0.3
        },
        animation: {
            type: 'boost',
            color: '#2196F3',
            duration: 1000
        }
    },
    Intimidate: {
        name: 'Intimidate',
        description: 'Lowers the opposing Pokémon\'s attack on entry',
        trigger: 'onEnter',
        target: 'opponent',
        effect: {
            type: 'intimidate',
            value: -1
        },
        animation: {
            type: 'status',
            color: '#7E57C2',
            duration: 1000
        }
    },
    Levitate: {
        name: 'Levitate',
        description: 'Grants immunity to Ground-type moves',
        trigger: 'onDefend',
        target: 'self',
        effect: {
            type: 'immunity',
            value: 0,
            immuneType: 'ground'
        },
        animation: {
            type: 'status',
            color: '#B39DDB',
            duration: 1000
        }
    },
    Static: {
        name: 'Static',
        description: 'May paralyze attackers on contact',
        trigger: 'onDefend',
        target: 'opponent',
        effect: {
            type: 'retaliate',
            value: 0,
            chance: 0.3,
            statusType: 'paralysis'
        },
        animation: {
            type: 'status',
            color: '#FFC107',
            duration: 1000
        }
    },
    Sturdy: {
        name: 'Sturdy',
        description: 'Survives a knockout hit from full HP with 1 HP',
        trigger: 'onDefend',
        target: 'self',
        effect: {
            type: 'survive',
            value: 1
        },
        animation: {
            type: 'boost',
            color: '#90A4AE',
            duration: 1000
        }
    }
};

// Derive a battle ability from a Pokémon's types (single source of truth
// for both battle setup and any preview UI).
export const getAbilityForTypes = (types: string[]): Ability | null => {
    if (types.includes('grass')) return ABILITIES.Overgrow;
    if (types.includes('fire')) return ABILITIES.Blaze;
    if (types.includes('water')) return ABILITIES.Torrent;
    if (types.includes('electric')) return ABILITIES.Static;
    if (types.includes('rock') || types.includes('steel')) return ABILITIES.Sturdy;
    if (types.includes('flying') || types.includes('ghost')) return ABILITIES.Levitate;
    if (types.includes('dark') || types.includes('fighting')) return ABILITIES.Intimidate;
    return null;
};