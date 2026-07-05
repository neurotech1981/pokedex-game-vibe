import type { BoostableStat } from './moves';

export type ItemId = 'potion' | 'fullHeal' | 'xAttack';

export type ItemEffect =
    | { type: 'heal'; percent: number }
    | { type: 'cureStatus' }
    | { type: 'boost'; stat: BoostableStat; stages: number };

export interface BattleItem {
    id: ItemId;
    name: string;
    description: string;
    effect: ItemEffect;
}

export const ITEMS: Record<ItemId, BattleItem> = {
    potion: {
        id: 'potion',
        name: 'Potion',
        description: 'Restores 50% of max HP.',
        effect: { type: 'heal', percent: 50 },
    },
    fullHeal: {
        id: 'fullHeal',
        name: 'Full Heal',
        description: 'Cures any status condition.',
        effect: { type: 'cureStatus' },
    },
    xAttack: {
        id: 'xAttack',
        name: 'X-Attack',
        description: 'Sharply raises Attack (+2 stages).',
        effect: { type: 'boost', stat: 'attack', stages: 2 },
    },
};

export const ITEM_IDS: ItemId[] = ['potion', 'fullHeal', 'xAttack'];

export type ItemInventory = Record<ItemId, number>;

export const createInventory = (): ItemInventory => ({
    potion: 2,
    fullHeal: 1,
    xAttack: 1,
});

// ---------------------------------------------------------------------------
// Held items: equipped on a Pokémon in the Team Builder, passive in battle.
// ---------------------------------------------------------------------------

export type HeldItemId =
    | 'leftovers'
    | 'charcoal'
    | 'mysticWater'
    | 'magnet'
    | 'miracleSeed'
    | 'focusSash'
    | 'quickClaw';

export type HeldItemEffect =
    | { type: 'endOfRoundHeal'; fraction: number }
    | { type: 'typeBoost'; moveType: string; multiplier: number }
    | { type: 'survive' }
    | { type: 'movePriority'; chance: number };

export interface HeldItem {
    id: HeldItemId;
    name: string;
    description: string;
    effect: HeldItemEffect;
}

export const HELD_ITEMS: Record<HeldItemId, HeldItem> = {
    leftovers: {
        id: 'leftovers',
        name: 'Leftovers',
        description: 'Restores 1/16 of max HP at the end of every round.',
        effect: { type: 'endOfRoundHeal', fraction: 1 / 16 },
    },
    charcoal: {
        id: 'charcoal',
        name: 'Charcoal',
        description: 'Boosts Fire-type moves by 20%.',
        effect: { type: 'typeBoost', moveType: 'fire', multiplier: 1.2 },
    },
    mysticWater: {
        id: 'mysticWater',
        name: 'Mystic Water',
        description: 'Boosts Water-type moves by 20%.',
        effect: { type: 'typeBoost', moveType: 'water', multiplier: 1.2 },
    },
    magnet: {
        id: 'magnet',
        name: 'Magnet',
        description: 'Boosts Electric-type moves by 20%.',
        effect: { type: 'typeBoost', moveType: 'electric', multiplier: 1.2 },
    },
    miracleSeed: {
        id: 'miracleSeed',
        name: 'Miracle Seed',
        description: 'Boosts Grass-type moves by 20%.',
        effect: { type: 'typeBoost', moveType: 'grass', multiplier: 1.2 },
    },
    focusSash: {
        id: 'focusSash',
        name: 'Focus Sash',
        description: 'Survives a knockout hit from full HP with 1 HP (once per battle).',
        effect: { type: 'survive' },
    },
    quickClaw: {
        id: 'quickClaw',
        name: 'Quick Claw',
        description: '20% chance to move first each round regardless of Speed.',
        effect: { type: 'movePriority', chance: 0.2 },
    },
};

export const HELD_ITEM_IDS: HeldItemId[] = [
    'leftovers',
    'charcoal',
    'mysticWater',
    'magnet',
    'miracleSeed',
    'focusSash',
    'quickClaw',
];

export type HeldInventory = Partial<Record<HeldItemId, number>>;

// ---------------------------------------------------------------------------
// Poké Balls: thrown at wild Pokémon in Safari encounters.
// ---------------------------------------------------------------------------

export type BallId = 'pokeball' | 'greatball' | 'ultraball';

export interface Ball {
    id: BallId;
    name: string;
    description: string;
    /** Multiplies the base catch chance. */
    modifier: number;
}

export const BALLS: Record<BallId, Ball> = {
    pokeball: {
        id: 'pokeball',
        name: 'Poké Ball',
        description: 'A standard ball for catching wild Pokémon.',
        modifier: 1,
    },
    greatball: {
        id: 'greatball',
        name: 'Great Ball',
        description: 'A high-performance ball — 1.5× catch rate.',
        modifier: 1.5,
    },
    ultraball: {
        id: 'ultraball',
        name: 'Ultra Ball',
        description: 'An ultra-high-performance ball — 2× catch rate.',
        modifier: 2,
    },
};

export const BALL_IDS: BallId[] = ['pokeball', 'greatball', 'ultraball'];

export type BallInventory = Partial<Record<BallId, number>>;
