# Pokémon Battle Game

A fun Pokémon battle game built with React, TypeScript, and Material-UI.

## Features

- Team building with Pokémon selection
- Turn-based battle system
- Type effectiveness calculations
- Status effects and weather conditions
- Battle animations and visual effects
- Sound effects and background music
- Battle statistics tracking

## Development

To run the project locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is deployed on GitHub Pages. To deploy:

1. Make sure you have the gh-pages package installed:
```bash
npm install --save-dev gh-pages
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

3. Go to your repository settings on GitHub:
   - Navigate to Settings > Pages
   - Under "Source", select the "gh-pages" branch
   - Save the changes

Your site will be available at: `https://[your-username].github.io/pokedex-game-vibe/`

## Technologies Used

- React
- TypeScript
- Vite
- Material-UI
- Framer Motion
- Emotion (for styled components)

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
