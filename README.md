# Pokédex Battle Simulator

A full-featured Pokédex and Pokémon battle game built with React 19, TypeScript, three.js and Material-UI. Live Pokémon data from [PokeAPI](https://pokeapi.co).

**Play it:** `https://neurotech1981.github.io/pokedex-game-vibe/`

## Features

### Pokédex
- Browse, search and filter the full national dex (live PokeAPI data)
- Detail pages with stats, evolutions, forms, comparisons — and playable cries
- Favorites, legendary/mythical filters

### Battle simulator
- 3D over-the-shoulder battle scenes (react-three-fiber) with world backgrounds
- Real level-up movesets per Pokémon, customizable in the Team Builder (pick your 4)
- Deep combat: physical/special split, stat stages, priority, multi-hit, flinch,
  status conditions with ambient particle auras, weather & terrain, abilities, held items
- VS intro cinematics, Pokéball send-outs, class-based move FX, camera work, Pokémon cries
- Heuristic AI with difficulties (beginner → expert, with predictive switching) and personalities

### Ways to play
- **Kanto Journey** — the adventure mode: pick a starter, travel Pallet Town → Indigo Plateau,
  battle trainers, catch wild Pokémon and take on gyms along the way
- **Quick battle** vs AI or hotseat PvP on one keyboard
- **Safari expeditions** — explore biomes, weaken wild Pokémon and catch them with Poké Balls
- **Gauntlet** — endless escalating stages with boss fights
- **Pokémon League** — 8 Kanto Gym Leaders, the Elite Four and Champion, then the Johto
  post-game: 8 more gyms and Red at Mt. Silver; badges + Round 2 rematches
- **Battle Tower** — level-normalized pure-skill streak ladder

### Progression
- Persistent trainer profile: XP and levels per Pokémon, evolutions, win records
- Item and Poké Ball economy from battle drops; held-item collection
- Recruitment, Box storage, shiny and elite Pokémon
- Achievements and a Trainer Card

Fully responsive — plays great on phones.

## Development

```bash
npm install
npm run dev       # Vite dev server
npm run build     # typecheck + production build
npm test          # Vitest unit tests (battle engine, AI, progression, ...)
npm run lint      # ESLint
```

## Deployment

```bash
npm run deploy    # build + publish dist/ to the gh-pages branch
```

Deployed via GitHub Pages from the `gh-pages` branch.

## Technologies

- React 19 + TypeScript + Vite
- Material-UI v7, Emotion, framer-motion
- three.js / @react-three/fiber / drei for the battle scene
- TanStack React Query for PokeAPI data
- Vitest

## License

MIT — see [LICENSE](LICENSE).
