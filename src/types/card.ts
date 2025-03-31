export type CardType = 'minion' | 'spell' | 'weapon' | 'hero' | 'hero_power';
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardClass = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'fighting' | 'dark' | 'steel' | 'fairy' | 'dragon' | 'normal';

export interface Card {
    id: string;
    name: string;
    description: string;
    cost: number;
    attack?: number;
    health?: number;
    type: CardType;
    rarity: CardRarity;
    class: CardClass;
    image: string;
    effects: CardEffect[];
    flavorText?: string;
    artist?: string;
}

export interface CardEffect {
    type: 'battlecry' | 'deathrattle' | 'aura' | 'trigger';
    target?: 'minion' | 'hero' | 'all';
    value?: number;
    condition?: string;
    action: string;
}

export interface Player {
    id: string;
    name: string;
    hero: Card;
    deck: Card[];
    hand: Card[];
    board: Card[];
    mana: number;
    maxMana: number;
    health: number;
    maxHealth: number;
    heroPower: Card;
}

export interface GameState {
    players: Player[];
    currentPlayer: number;
    currentTurn: number;
    gameOver: boolean;
    lastPlayedCard?: Card;
    battleLog: string[];
    effects: GameEffect[];
}

export interface GameEffect {
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'draw' | 'discard';
    source: Card;
    target: Card | Player;
    value: number;
    duration?: number;
}

export type GameAction =
    | { type: 'playCard'; cardId: string; playerId: number }
    | { type: 'attack'; attackerId: string; defenderId: string; playerId: number }
    | { type: 'useHeroPower'; playerId: number }
    | { type: 'endTurn'; playerId: number }
    | { type: 'concede'; playerId: number };