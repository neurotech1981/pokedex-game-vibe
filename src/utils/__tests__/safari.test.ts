import { describe, it, expect } from 'vitest';
import { BIOMES, getBiome, rollWildEncounter } from '../safari';
import { catchChance, createBattleMon, createEngineState, getActiveMon, resolveAction } from '../battleEngine';
import { makePokemon, makeState, rngFrom } from './helpers';

const POOL = [
    makePokemon(1, 'leafy', ['grass']),
    makePokemon(2, 'flamey', ['fire']),
    makePokemon(3, 'soggy', ['water']),
    makePokemon(4, 'rocky', ['rock']),
    makePokemon(5, 'sparky', ['electric']),
    makePokemon(6, 'spooky', ['ghost']),
    { ...makePokemon(150, 'mysto', ['psychic']), is_legendary: true },
];

describe('safari biomes + encounters', () => {
    it('every biome has a non-empty pool from a diverse dex', () => {
        for (const biome of BIOMES) {
            const encounter = rollWildEncounter(POOL, biome, 50, () => 0.5);
            expect(encounter, biome.id).not.toBeNull();
        }
    });

    it('rarity tiers roll from fixed rng', () => {
        const meadow = getBiome('meadow')!;
        // rng order: level jitter, rarity roll, pick, (shiny for rare)
        expect(rollWildEncounter(POOL, meadow, 50, rngFrom([0.5, 0.5, 0]))!.rarity).toBe('common');
        expect(rollWildEncounter(POOL, meadow, 50, rngFrom([0.5, 0.2, 0]))!.rarity).toBe('uncommon');
        const rare = rollWildEncounter(POOL, meadow, 50, rngFrom([0.5, 0.05, 0, 0.1]))!;
        expect(rare.rarity).toBe('rare');
        expect(rare.shiny).toBe(true);
    });

    it('legendary tier requires a legendary in the biome pool', () => {
        const skyruins = getBiome('skyruins')!;
        const legendary = rollWildEncounter(POOL, skyruins, 50, rngFrom([0.5, 0.01, 0]))!;
        expect(legendary.rarity).toBe('legendary');
        expect(legendary.pokemon.id).toBe(150);
        // meadow has no legendaries → falls through to rare tier instead
        const meadow = getBiome('meadow')!;
        expect(rollWildEncounter(POOL, meadow, 50, rngFrom([0.5, 0.01, 0, 0.9]))!.rarity).toBe('rare');
    });

    it('returns null when no species matches the biome', () => {
        const coast = getBiome('coast')!;
        expect(rollWildEncounter([makePokemon(1, 'leafy', ['grass'])], coast, 50, () => 0.5)).toBeNull();
    });
});

describe('catching', () => {
    const wildState = () => {
        const team1 = [createBattleMon(makePokemon(1, 'hero', ['fire']), 1, 0, 50, null)];
        const wild = [createBattleMon(makePokemon(2, 'target', ['normal']), 2, 0, 50, null)];
        return createEngineState(team1, wild, undefined, { wild: true, balls: { pokeball: 2, ultraball: 1 } });
    };

    it('catchChance scales with HP, status, ball and legendary', () => {
        const mon = createBattleMon(makePokemon(2, 'target', ['normal']), 2, 0, 50, null);
        const fullHp = catchChance(mon, 1);
        mon.currentHp = Math.floor(mon.maxHp * 0.7); // weakened but not clamped
        const midHp = catchChance(mon, 1);
        expect(midHp).toBeGreaterThan(fullHp * 2);
        expect(catchChance(mon, 2)).toBeGreaterThan(midHp); // better ball
        mon.status = { type: 'sleep', turns: 3 };
        expect(catchChance(mon, 1)).toBeGreaterThan(midHp); // sleep bonus
        mon.currentHp = 1;
        expect(catchChance(mon, 2)).toBeLessThanOrEqual(0.9); // clamp

        const legend = createBattleMon({ ...makePokemon(150, 'mysto', ['psychic']), is_legendary: true }, 2, 0, 50, null);
        legend.currentHp = Math.floor(legend.maxHp * 0.7);
        mon.status = null;
        mon.currentHp = Math.floor(mon.maxHp * 0.7);
        expect(catchChance(legend, 1)).toBeLessThan(catchChance(mon, 1));
    });

    it('a successful throw catches the mon and ends the battle', () => {
        const state = wildState();
        getActiveMon(state, 2).currentHp = 1; // near-certain catch
        const { state: next, events } = resolveAction(state, { kind: 'throwBall', ballId: 'pokeball' }, undefined, rngFrom([0.01]));
        expect(events.some(e => e.kind === 'ballThrown' && e.shakes === 3)).toBe(true);
        expect(events.some(e => e.kind === 'caught')).toBe(true);
        expect(next.phase).toBe('gameOver');
        expect(next.winner).toBe(1);
        expect(next.caught).toBe(getActiveMon(state, 2).key);
        expect(next.balls.pokeball).toBe(1); // consumed
    });

    it('a failed throw consumes the ball and the turn', () => {
        const state = wildState(); // full HP → low chance
        const { state: next, events } = resolveAction(state, { kind: 'throwBall', ballId: 'pokeball' }, undefined, rngFrom([0.99]));
        expect(events.some(e => e.kind === 'brokeFree')).toBe(true);
        expect(next.phase).toBe('selecting');
        expect(next.balls.pokeball).toBe(1);
        expect(next.currentTurn).toBe(2); // wild mon's turn now
    });

    it('throws are rejected outside wild battles and without balls', () => {
        const normal = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const rejected = resolveAction(normal, { kind: 'throwBall', ballId: 'pokeball' }, undefined, () => 0);
        expect(rejected.state).toBe(normal);

        const state = wildState();
        state.balls = { pokeball: 0 };
        const noBalls = resolveAction(state, { kind: 'throwBall', ballId: 'pokeball' }, undefined, () => 0);
        expect(noBalls.state).toBe(state);
    });
});
