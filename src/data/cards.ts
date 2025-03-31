import { Card, CardClass, CardRarity, CardType } from '../types/card';
import { v4 as uuidv4 } from 'uuid';

export const createCard = (
    name: string,
    description: string,
    cost: number,
    type: CardType,
    rarity: CardRarity,
    cardClass: CardClass,
    image: string,
    attack?: number,
    health?: number,
    effects?: any[],
    flavorText?: string,
    artist?: string
): Card => ({
    id: uuidv4(),
    name,
    description,
    cost,
    attack,
    health,
    type,
    rarity,
    class: cardClass,
    image,
    effects,
    flavorText,
    artist
});

export const cards: Card[] = [
    // Fire Type Cards
    createCard(
        'Charizard',
        'Deal 3 damage to all enemy minions',
        7,
        'minion',
        'legendary',
        'fire',
        '/images/cards/charizard.jpg',
        6,
        6,
        [
            {
                type: 'battlecry',
                description: 'Deal 3 damage to all enemy minions',
                target: 'all'
            }
        ],
        "A Pokemon created by recombining Mew's genes. It's said to have the most savage heart among Pokemon."
    ),
    createCard(
        'Flareon',
        'Gain +2 Attack for each Fire minion you control',
        4,
        'minion',
        'rare',
        'fire',
        '/images/cards/flareon.jpg',
        3,
        4,
        [
            {
                type: 'aura',
                description: 'Gain +2 Attack for each Fire minion you control',
                target: 'minion'
            }
        ]
    ),

    // Water Type Cards
    createCard(
        'Blastoise',
        'Deal 2 damage to all enemy minions',
        6,
        'minion',
        'legendary',
        'water',
        '/images/cards/blastoise.jpg',
        5,
        6,
        [
            {
                type: 'battlecry',
                description: 'Deal 2 damage to all enemy minions',
                target: 'all'
            }
        ]
    ),
    createCard(
        'Vaporeon',
        'Restore 3 Health to all friendly minions',
        4,
        'minion',
        'rare',
        'water',
        '/images/cards/vaporeon.jpg',
        3,
        4,
        [
            {
                type: 'battlecry',
                description: 'Restore 3 Health to all friendly minions',
                target: 'all'
            }
        ]
    ),

    // Grass Type Cards
    createCard(
        'Venusaur',
        'Give all friendly minions +2/+2',
        7,
        'minion',
        'legendary',
        'grass',
        '/images/cards/venusaur.jpg',
        5,
        7,
        [
            {
                type: 'battlecry',
                description: 'Give all friendly minions +2/+2',
                target: 'all'
            }
        ]
    ),
    createCard(
        'Leafeon',
        'Gain +2 Health for each Grass minion you control',
        4,
        'minion',
        'rare',
        'grass',
        '/images/cards/leafeon.jpg',
        3,
        4,
        [
            {
                type: 'aura',
                description: 'Gain +2 Health for each Grass minion you control',
                target: 'minion'
            }
        ]
    ),

    // Electric Type Cards
    createCard(
        'Pikachu',
        'Deal 2 damage to a random enemy minion',
        3,
        'minion',
        'common',
        'electric',
        '/images/cards/pikachu.jpg',
        3,
        2,
        [
            {
                type: 'battlecry',
                description: 'Deal 2 damage to a random enemy minion',
                target: 'minion'
            }
        ]
    ),
    createCard(
        'Jolteon',
        'Deal 2 damage to all enemy minions',
        4,
        'minion',
        'rare',
        'electric',
        '/images/cards/jolteon.jpg',
        3,
        4,
        [
            {
                type: 'battlecry',
                description: 'Deal 2 damage to all enemy minions',
                target: 'all'
            }
        ]
    ),

    // Psychic Type Cards
    createCard(
        'Mewtwo',
        'Take control of an enemy minion',
        8,
        'minion',
        'legendary',
        'psychic',
        '/images/cards/mewtwo.jpg',
        6,
        6,
        [
            {
                type: 'battlecry',
                description: 'Take control of an enemy minion',
                target: 'minion'
            }
        ],
        "A Pokemon created by recombining Mew's genes. It's said to have the most savage heart among Pokemon."
    ),
    createCard(
        'Espeon',
        'Draw 2 cards',
        4,
        'minion',
        'rare',
        'psychic',
        '/images/cards/espeon.jpg',
        3,
        4,
        [
            {
                type: 'battlecry',
                description: 'Draw 2 cards',
                target: 'all'
            }
        ]
    ),

    // Fighting Type Cards
    createCard(
        'Machamp',
        'Deal damage equal to its Attack to all enemy minions',
        6,
        'minion',
        'legendary',
        'fighting',
        '/images/cards/machamp.jpg',
        5,
        5,
        [
            {
                type: 'battlecry',
                description: 'Deal damage equal to its Attack to all enemy minions',
                target: 'all'
            }
        ]
    ),
    createCard(
        'Hitmonlee',
        'Deal 2 damage to a minion and gain +2 Attack',
        3,
        'minion',
        'common',
        'fighting',
        '/images/cards/hitmonlee.jpg',
        3,
        2,
        [
            {
                type: 'battlecry',
                description: 'Deal 2 damage to a minion and gain +2 Attack',
                target: 'minion'
            }
        ]
    ),

    // Dark Type Cards
    createCard(
        'Darkrai',
        'Put a random card from your opponent's hand into their deck',
        6,
        'minion',
        'legendary',
        'dark',
        '/images/cards/darkrai.jpg',
        5,
        5,
        [
            {
                type: 'battlecry',
                description: "Put a random card from your opponent's hand into their deck",
                target: 'all'
            }
        ]
    ),
    createCard(
        'Umbreon',
        'Give a friendly minion +3/+3',
        4,
        'minion',
        'rare',
        'dark',
        '/images/cards/umbreon.jpg',
        3,
        4,
        [
            {
                type: 'battlecry',
                description: 'Give a friendly minion +3/+3',
                target: 'minion'
            }
        ]
    ),

    // Steel Type Cards
    createCard(
        'Steelix',
        'Gain +2/+2 for each friendly minion',
        7,
        'minion',
        'legendary',
        'steel',
        '/images/cards/steelix.jpg',
        4,
        6,
        [
            {
                type: 'aura',
                description: 'Gain +2/+2 for each friendly minion',
                target: 'minion'
            }
        ]
    ),
    createCard(
        'Scizor',
        'Deal 2 damage to all enemy minions',
        5,
        'minion',
        'rare',
        'steel',
        '/images/cards/scizor.jpg',
        4,
        4,
        [
            {
                type: 'battlecry',
                description: 'Deal 2 damage to all enemy minions',
                target: 'all'
            }
        ]
    ),

    // Fairy Type Cards
    createCard(
        'Clefairy',
        'Restore 3 Health to your hero',
        3,
        'minion',
        'common',
        'fairy',
        '/images/cards/clefairy.jpg',
        2,
        3,
        [
            {
                type: 'battlecry',
                description: 'Restore 3 Health to your hero',
                target: 'hero'
            }
        ]
    ),
    createCard(
        'Sylveon',
        'Give all friendly minions +1/+1',
        4,
        'minion',
        'rare',
        'fairy',
        '/images/cards/sylveon.jpg',
        3,
        4,
        [
            {
                type: 'battlecry',
                description: 'Give all friendly minions +1/+1',
                target: 'all'
            }
        ]
    ),

    // Neutral Cards
    createCard(
        'Potion',
        'Restore 4 Health to a minion',
        2,
        'spell',
        'common',
        'neutral',
        '/images/cards/potion.jpg',
        undefined,
        undefined,
        [
            {
                type: 'battlecry',
                description: 'Restore 4 Health to a minion',
                target: 'minion'
            }
        ]
    ),
    createCard(
        'Pokeball',
        'Draw a card',
        1,
        'spell',
        'common',
        'neutral',
        '/images/cards/pokeball.jpg',
        undefined,
        undefined,
        [
            {
                type: 'battlecry',
                description: 'Draw a card',
                target: 'all'
            }
        ]
    )
];

export const getStarterDeck = (): Card[] => {
    const starterDeck: Card[] = [];

    // Add 2 copies of each common card
    cards.filter(card => card.rarity === 'common').forEach(card => {
        starterDeck.push({ ...card, id: uuidv4() });
        starterDeck.push({ ...card, id: uuidv4() });
    });

    // Add 1 copy of each rare card
    cards.filter(card => card.rarity === 'rare').forEach(card => {
        starterDeck.push({ ...card, id: uuidv4() });
    });

    // Add 1 copy of each legendary card
    cards.filter(card => card.rarity === 'legendary').forEach(card => {
        starterDeck.push({ ...card, id: uuidv4() });
    });

    return starterDeck;
};