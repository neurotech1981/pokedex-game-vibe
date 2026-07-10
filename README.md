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
  post-game (8 more gyms and Red at Mt. Silver), then the **Hoenn expansion**: 8 Hoenn gyms,
  a new Elite Four and Champion Steven; badges + Round 2 rematches
- **Battle Tower** — level-normalized pure-skill streak ladder

### Progression
- Persistent trainer profile: XP and levels per Pokémon, evolutions, win records
- **Natures & IVs** — every Pokémon you register rolls one of the 25 classic natures
  (±10% stat spreads) and per-stat IVs, shown in the Team Builder and felt in battle
- **Pokédex completion** — seen/caught registration for every species, completion bars
  on the Trainer Card, badges on the dex grid and completion achievements up to Kanto Master
- **PokéCoins & the Poké Mart** — earn coins from every win (streaks, bosses and league
  stages pay more), claim a daily reward, and spend it all on items, Poké Balls, held items
  and vitamins in the shop
- **EV training** — feed vitamins to a Pokémon or let battle wins trickle effort into its
  strongest stat (classic 252/510 caps)
- **TMs & Move Tutor** — unlock machine/tutor moves with coins in the Move Manager
- Item and Poké Ball economy from battle drops; held-item collection
- Recruitment, Box storage, shiny and elite Pokémon
- Achievements (they pay coins too) and a Trainer Card

### Replays & save safety
- **Battle replays** — every finished battle is recorded (deterministic seeded engine);
  rewatch the last 20 from the Trainer Card with full 3D playback
- **Share codes** — copy a compact code for any team or replay and send it to a friend;
  they paste it in and get your exact team or watch your battle
- **Save export/import** — download your entire save as JSON and restore it anywhere
- **Installable PWA** — add it to your home screen; gen 1–3 sprites, artwork and cries are
  bundled, so core play works fully offline

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
