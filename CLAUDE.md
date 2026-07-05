# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc && vite build
npm run lint      # ESLint (ts/tsx, --max-warnings 0)
npm test          # Vitest (tests live in src/utils/__tests__/)
npm run deploy    # Build + publish dist/ to gh-pages branch
```

Run a single test file: `npx vitest run src/utils/__tests__/battleEngine.test.ts`

Deployed to GitHub Pages; `vite.config.ts` sets `base: '/pokedex-game-vibe/'`. Asset URLs must use `import.meta.env.BASE_URL` (see `src/utils/soundEffects.ts`).

## What this app is

React 19 + TypeScript + Vite Pokédex/battle simulator using MUI v7, Emotion, framer-motion, and TanStack React Query v5. The package name `pokemon-card-game` and the card-game sections of the README are legacy — see "Legacy code" below.

## Architecture

Single component tree, no router, no global state library:

```
main.tsx  → QueryClientProvider + MUI ThemeProvider (src/theme.ts)
App.tsx   → <Pokemon />
Pokemon.tsx (~1500 lines) → 4 tabs:
  Pokédex            (list/detail/evolutions, favorites, compare)
  TeamBuilder.tsx    (teams persisted to localStorage key "pokemonTeams")
  TypeEffectiveness.tsx
  BattleSimulator.tsx (~3000 lines; receives teams, getTypeColor, TYPE_EFFECTIVENESS as props)
```

### Battle system (the core of the app)

- **Rules engine**: `src/utils/battleEngine.ts` — pure, immutable, rng-injectable. `resolveAction(state, action, chart, rng)` returns `{ state, events: BattleEvent[] }`; the UI never mutates battle state directly. Mechanics: stat stages (±6, `stageMultiplier`), speed-based round order (`beginBattle`, faster active mon leads each round; paralysis halves speed; Quick Claw can steal the lead), physical/special split (`getDamageClass`, Gen-3 type rules; special moves read special-attack/special-defense; burn weakens physical only), weather/terrain, status effects incl. confusion self-hits, energy system, abilities (Overgrow/Blaze/Torrent low-HP boost; Intimidate on-enter; Levitate immunity; Static retaliation; Sturdy survive-at-1HP), and held items (`src/data/items.ts` `HELD_ITEMS`: Leftovers round heal, type boosters, Focus Sash, Quick Claw). `BattleMon.moves` carries the moveset (defaults to type-derived). Tested in `src/utils/__tests__/` (engine, AI, movesets, progression, gauntlet, recruitment; shared fixtures in `helpers.ts`).
- **Movesets**: `src/utils/movesets.ts` — real per-Pokémon level-up learnsets from PokeAPI (`getMovesetForPokemon`, cached per species + localStorage mirror `pokedexGame.movesets.v2`); any fetch failure falls back to `getMovesForTypes`. `getFullLearnset` (≤20 entries, mirror `pokedexGame.learnsets.v1`) feeds the TeamBuilder Move Manager (`MoveManagerDialog`, saves `MonProgress.customMoves`). `mapApiMove` also maps priority / multi-hit / flinch / stat-change debuffs. Battle start is async (`starting` flag guards double-clicks).
- **Combat depth**: priority uses a **momentum model** (a priority move makes you lead the NEXT round — a true interrupt is impossible in the round-first turn model; precedence momentum > Quick Claw > speed in `determineRoundFirst`). Multi-hit loops per-hit damage (survive-once effects check each hit), flinch blocks a defender that hasn't acted this round (`BattleMon.flinched`, consumed on act, cleared on switch/round-end), debuffs lower opponent stages. The `'move'` event carries `damageClass` (drives scene FX). Expert AI predicts lethal threats and retreats to resistant bench mons.
- **Safari & catching**: `src/utils/safari.ts` (biomes → type pools + backdrops, `rollWildEncounter` rarity tiers) and engine support in battleEngine.ts (`EngineState.wild/balls/caught`, `throwBall` action, pure `catchChance`). Caught mons go to the Box; ball economy on `profile.balls` (`BALLS` in data/items.ts, drops in data/rewards.ts).
- **Battle Tower**: `src/utils/tower.ts` — level-50-normalized 3v3 streak ladder (no held items, fixed item loadout — never persists engine items back to the profile), every 7th battle a boss with an elite ace; streaks on `records.towerStreak/towerBestStreak`.
- **Achievements**: `src/utils/achievements.ts` pure catalog + `evaluateAchievements`/`applyAchievements`, run inside useBattleResults after the profile update; earned ids on `profile.achievements`. Trainer Card tab (`TrainerCard.tsx`) renders records/badges/achievements/Box.
- **Hooks split**: battle presentation lives in `src/hooks/useBattleEvents.ts` (log/floating text/SceneFx/processEvents) and consequences in `src/hooks/useBattleResults.ts` (XP/drops/league/tower/catch/achievements/recruit/evolution — applied exactly once per battle); shared UI constants in `components/battle/battleUi.ts`. BattleSimulator keeps mode glue + start handlers.
- **Cries**: `playCry(pokemonId)` in soundEffects.ts streams from the PokeAPI cries GitHub mirror (send-out, faint, Pokédex detail button); best-effort, silent on failure.
- **League Challenge**: `src/data/league.ts` — 8 Kanto gyms → Elite Four → Champion Blue, strict linear unlocks (`isStageUnlocked`), level floors 52→80 scaling with player avg, rosters via cached `fetchLeagueTeam` (PokeAPI), XP ×2, badges persisted in `profile.league.defeated`; post-game Round 2 rematches (+15 levels, ×2.5 XP, `league.defeatedRematches`) unlock at champion. Trainer portraits bundled in `public/assets/trainers/` (Showdown). UI: `LeagueCard` in BattleSetup, portrait chip in battle, badge labels in PostBattlePanel.
- **Orchestration**: `BattleSimulator.tsx` holds React state, bridges engine events → log/sounds/floating text/3D `SceneFx` in `processEvents`, and owns the battle modes: quick vs AI, gauntlet, and **hotseat PvP** (`opponentKind === 'human'` — both teams take input, AI effects disabled, no XP/rewards, both sides get stock inventories). Battle pacing scales with a persisted speed setting (localStorage `battleSpeed`, 1/1.5/2×).
- **AI opponent**: `src/utils/battleAI.ts` — heuristic move scoring over `mon.moves` with difficulties (beginner/intermediate/expert) and personalities (aggressive/defensive/balanced), item use and expert switching.
- **Meta-game** (all pure + tested): `src/utils/progression.ts` (XP curve from level 50, `PlayerProfile` with mons/items/heldItems/records/box persisted via `src/hooks/usePlayerProfile.ts` to localStorage `pokedexGame.profile.v1`; the hook is instantiated ONCE in `Pokemon.tsx` and passed as props to TeamBuilder + BattleSimulator — never instantiate it twice), `src/data/rewards.ts` (post-win item drops + rare held-item drops), `src/utils/gauntlet.ts` (endless escalating stages, HP carry-over, boss every 3rd stage with elite shiny mons), `src/utils/recruitment.ts` (post-win recruit offers, elite/legendary rolls), `src/utils/evolution.ts` (PokeAPI chain-walk, level-up evolutions). TeamBuilder hosts the **Box manager** (Available | Box tabs; add-to-team/release/drag) plus per-slot level/shiny/elite badges and held-item equipping.
- **Battle UI components** in `src/components/battle/`: `BattleScene3D` (r3f arena), `BattleSetup` (team select + records + gauntlet card), `PostBattlePanel` (results, XP bars, drops, recruit/evolution offers), `MoveSelection`, `BattleLog`, `TerrainParticles`, `RecruitOfferCard`, `EvolutionPrompt`.
- Teams changes flow through `Pokemon.tsx` handlers (`onAddPokemonToTeam`, `onEvolvePokemon`) — it owns `teams` and the `pokemonTeams` localStorage persistence.

### Data sources

- Pokémon data comes live from PokeAPI (`https://pokeapi.co/api/v2/`) via `fetch` + React Query inside `Pokemon.tsx` (infinite query for the list; separate queries/fetches for species, evolution chains, forms). No local Pokémon dataset.
- Battle sprites come from the PokeAPI sprites CDN via `src/utils/spriteSources.ts` — animated Showdown GIFs (front + back) with a fallback ladder (showdown → gen-5 animated → static → `front_default`); `src/hooks/useAnimatedTexture.ts` decodes GIFs with gifuct-js into three.js CanvasTextures.
- Moves are single-sourced in `src/data/moves.ts`, keyed by type; a Pokémon's moveset is derived from its types (fallback: Tackle). Items live in `src/data/items.ts`, `TYPE_EFFECTIVENESS` in `src/data/typeChart.ts` (a copy still exists in `Pokemon.tsx`/`TeamBuilder.tsx` — passed as props).

### Presentation subsystems

- Move impact FX: `src/utils/moveAnimationHelper.ts` maps all 18 move types → grid spritesheets under `public/assets/particles/Spritesheets/` (some reused with tints); rendered by `ImpactEffect` inside `battle/BattleScene3D.tsx` (texture-offset animation, additive blending; critical hits add a gold burst overlay + camera shake). Filenames contain spaces/`+` — keep helper paths in sync.
- 3D scene: over-the-shoulder framing (player back sprite near camera, enemy front sprite far), weather fog/particles, `TerrainParticles`. Cinematics: `VsIntro` splash defers `beginBattle` until dismissed (AI/results effects guard on `intro === null`); Pokéball send-out on sprite entry (module-cached texture, NOT useLoader); `CameraRig` fov-only dolly on faints; move-class FX — special = `BeamEffect`, physical = `SlashEffect` + harder lunge, status = `SparkleEffect` (driven by `SceneFx.damageClass`). The arena renders a **gen-6 battle-scene backdrop** (`src/data/battleBackgrounds.ts` picks one per battle: weather/terrain-aware, random pool otherwise, Elite Four chamber for gauntlet bosses; 13 JPGs bundled in `public/assets/backgrounds/`, sourced from Pokémon Showdown). The `Backdrop` plane in `BattleScene3D` is placed along the camera's **view axis** (the r3f camera is tilted toward the origin — don't center planes on camera height) and sized cover-style preserving the 800×480 image aspect; weather multiplies a mood tint onto it. Abstract SkyDome/floor remain as the no-backdrop fallback.
- HUD: framer-motion — panel entrance slides, two-layer HP bar (spring fill + lagging white ghost), animated HP numbers, staggered post-battle panel.
- Sound: `src/utils/soundEffects.ts` — HTMLAudioElement SFX from `public/sounds/`, random battle music from `public/audio/battle/`.
- `battle/BattleLog.tsx` uses `dangerouslySetInnerHTML` for styled log messages — keep log content trusted/escaped.

## Legacy code (do not build on)

Unused: `types/person.ts`, plus legacy card-game type aliases still inside `types/pokemon.ts` (`BattleState`, `Particle`, `StatusEffect`, `Move` — superseded by `battleEngine.ts`/`data/moves.ts`). The `server/` directory contains only a lockfile and node_modules (abandoned multiplayer backend, no source).
