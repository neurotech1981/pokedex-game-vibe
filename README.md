# Pokémon Card Game

A Hearthstone-style card game featuring Pokémon characters and abilities.

## Features

- Turn-based card game with Pokémon-themed cards
- Different card types: minions, spells, and hero powers
- Card effects: battlecry, deathrattle, aura, and trigger effects
- AI opponent with basic decision-making
- Beautiful UI with card animations and effects

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pokemon-card-game.git
cd pokemon-card-game
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## How to Play

1. Each player starts with 30 health and 1 mana crystal
2. Players draw 3 cards at the start of the game
3. Each turn:
   - Draw a card (except for the first player's first turn)
   - Gain a mana crystal (up to 10)
   - Play cards by spending mana
   - Attack with minions
   - Use hero power
   - End turn

### Card Types

- **Minions**: Creatures that can attack and defend
- **Spells**: One-time effects that can target minions or heroes
- **Hero Powers**: Special abilities that can be used once per turn

### Card Effects

- **Battlecry**: Triggers when the card is played
- **Deathrattle**: Triggers when the card is destroyed
- **Aura**: Continuous effect while the card is in play
- **Trigger**: Effect that activates under specific conditions

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
