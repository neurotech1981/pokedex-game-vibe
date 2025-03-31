// Ability Types
export type AbilityTrigger = 'onAttack' | 'onDefend' | 'onFaint' | 'onStatus' | 'onTurnStart' | 'onTurnEnd';
export type AbilityTarget = 'self' | 'opponent' | 'both' | 'all';

export interface AbilityEffect {
    type: 'heal' | 'boost' | 'status' | 'damage' | 'weather' | 'terrain';
    value: number;
    duration?: number;
    chance?: number;
    statusType?: 'paralysis' | 'burn' | 'freeze' | 'sleep' | 'poison' | 'confusion';
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
    }
};