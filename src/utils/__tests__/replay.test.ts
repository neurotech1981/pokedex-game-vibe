import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mulberry32, randomSeed } from '../rng';
import type { BattleReplay, ReplayStep } from '../replay';
import { MAX_REPLAYS, REPLAY_FORMAT, canPlayReplay, loadReplays, monConfigFrom, saveReplay, deleteReplay } from '../replay';
import type { BattleEvent, BattleMon, EngineState, Rng, TeamId } from '../battleEngine';
import {
    beginBattle,
    createBattleMon,
    createEngineState,
    getActiveMon,
    getSwitchableMons,
    resolveAction,
    resolveForcedSwitch,
} from '../battleEngine';
import { TYPE_EFFECTIVENESS } from '../../data/typeChart';
import { createInventory } from '../../data/items';
import { makePokemon } from './helpers';

describe('mulberry32', () => {
    it('same seed → identical sequence; different seeds diverge; values in [0,1)', () => {
        const a = mulberry32(1234);
        const b = mulberry32(1234);
        const c = mulberry32(4321);
        const seqA = Array.from({ length: 50 }, () => a());
        const seqB = Array.from({ length: 50 }, () => b());
        const seqC = Array.from({ length: 50 }, () => c());
        expect(seqA).toEqual(seqB);
        expect(seqA).not.toEqual(seqC);
        seqA.forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        });
        const seed = randomSeed();
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
    });
});

/** Drive a battle to completion with scripted picks, recording every step. */
const playBattle = (state: EngineState, rng: Rng) => {
    const steps: ReplayStep[] = [];
    const events: BattleEvent[] = [];
    let result = beginBattle(state, rng);
    events.push(...result.events);
    let guard = 0;
    while (result.state.phase !== 'gameOver' && guard++ < 200) {
        if (result.state.phase === 'awaitingSwitch') {
            const team = result.state.pendingSwitch as TeamId;
            const target = getSwitchableMons(result.state, team)[0];
            steps.push({ kind: 'forcedSwitch', team, targetKey: target.key });
            result = resolveForcedSwitch(result.state, target.key, rng);
        } else {
            const team = result.state.currentTurn;
            const mon = getActiveMon(result.state, team);
            const move = mon.moves.find(m => m.energyCost <= mon.energy) ?? mon.moves[0];
            const action = { kind: 'move' as const, move };
            steps.push({ kind: 'action', team, action });
            result = resolveAction(result.state, action, TYPE_EFFECTIVENESS, rng);
        }
        events.push(...result.events);
    }
    return { finalState: result.state, steps, events };
};

/** Re-run recorded steps against a rebuilt state (the playback path). */
const replaySteps = (state: EngineState, steps: ReplayStep[], rng: Rng) => {
    const events: BattleEvent[] = [];
    let result = beginBattle(state, rng);
    events.push(...result.events);
    for (const step of steps) {
        if (result.state.phase === 'gameOver') break;
        result = step.kind === 'action'
            ? resolveAction(result.state, step.action, TYPE_EFFECTIVENESS, rng)
            : resolveForcedSwitch(result.state, step.targetKey, rng);
        events.push(...result.events);
    }
    return { finalState: result.state, events };
};

const buildTeams = (): { team1: BattleMon[]; team2: BattleMon[] } => {
    const charizard = makePokemon(6, 'charizard', ['fire', 'flying'], { attack: 120, speed: 110 });
    const blastoise = makePokemon(9, 'blastoise', ['water'], { defense: 120 });
    const venusaur = makePokemon(3, 'venusaur', ['grass', 'poison'], { hp: 110 });
    const raichu = makePokemon(26, 'raichu', ['electric'], { speed: 120 });
    const team1 = [
        createBattleMon(charizard, 1, 0, 55, null, { nature: 'adamant', ivs: { hp: 31, attack: 31, defense: 10, 'special-attack': 5, 'special-defense': 12, speed: 31 } }),
        createBattleMon(venusaur, 1, 1, 52, null),
    ];
    const team2 = [
        createBattleMon(blastoise, 2, 0, 54, null, { statMod: 1.15 }),
        createBattleMon(raichu, 2, 1, 53, null),
    ];
    return { team1, team2 };
};

describe('replay determinism (record → rebuild → re-run)', () => {
    it('reproduces the identical final state and event stream', () => {
        const seed = 987654321;
        const { team1, team2 } = buildTeams();
        const live = createEngineState(team1, team2);
        const configs = {
            1: live.order[1].map(k => monConfigFrom(live.mons[k])),
            2: live.order[2].map(k => monConfigFrom(live.mons[k])),
        };
        const recorded = playBattle(live, mulberry32(seed));
        expect(recorded.finalState.phase).toBe('gameOver');

        // Rebuild exactly the way BattleSimulator playback does
        const rebuilt1 = configs[1].map((cfg, i) => createBattleMon(cfg.pokemon, 1, i, cfg.level, cfg.ability, {
            shiny: cfg.shiny, moves: cfg.moves, heldItem: cfg.heldItem, currentHpPct: cfg.currentHpPct,
        }));
        const rebuilt2 = configs[2].map((cfg, i) => createBattleMon(cfg.pokemon, 2, i, cfg.level, cfg.ability, {
            shiny: cfg.shiny, moves: cfg.moves, heldItem: cfg.heldItem, currentHpPct: cfg.currentHpPct,
        }));
        const replayed = replaySteps(createEngineState(rebuilt1, rebuilt2), recorded.steps, mulberry32(seed));

        expect(replayed.finalState.winner).toBe(recorded.finalState.winner);
        expect(replayed.events).toEqual(recorded.events);
        // Every mon ends on identical HP/status
        for (const key of Object.keys(recorded.finalState.mons)) {
            expect(replayed.finalState.mons[key].currentHp).toBe(recorded.finalState.mons[key].currentHp);
            expect(replayed.finalState.mons[key].status).toEqual(recorded.finalState.mons[key].status);
        }
    });

    it('monConfigFrom round-trips a nature/IV mon to identical stats', () => {
        const { team1 } = buildTeams();
        const cfg = monConfigFrom(team1[0]);
        const rebuilt = createBattleMon(cfg.pokemon, 1, 0, cfg.level, cfg.ability, {
            shiny: cfg.shiny, moves: cfg.moves, heldItem: cfg.heldItem, currentHpPct: cfg.currentHpPct,
        });
        expect(rebuilt.pokemon.stats).toEqual(team1[0].pokemon.stats);
        expect(rebuilt.maxHp).toBe(team1[0].maxHp);
        expect(rebuilt.currentHp).toBe(team1[0].currentHp);
        expect(rebuilt.moves).toEqual(team1[0].moves);
        expect(rebuilt.key).toBe(team1[0].key);
    });

    it('a different seed produces a different event stream (sanity)', () => {
        const { team1, team2 } = buildTeams();
        const a = playBattle(createEngineState(team1, team2), mulberry32(1));
        const { team1: t1b, team2: t2b } = buildTeams();
        const b = playBattle(createEngineState(t1b, t2b), mulberry32(2));
        expect(a.events).not.toEqual(b.events);
    });
});

describe('replay storage', () => {
    const store = new Map<string, string>();
    beforeEach(() => {
        store.clear();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).localStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v); },
            removeItem: (k: string) => { store.delete(k); },
        };
    });
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).localStorage;
    });

    const makeReplay = (n: number): BattleReplay => ({
        format: REPLAY_FORMAT,
        seed: n,
        date: `2026-07-07T00:00:${String(n).padStart(2, '0')}.000Z`,
        mode: 'Quick battle',
        label: `battle ${n}`,
        winner: 1,
        hotseat: false,
        teams: {
            1: [monConfigFrom(createBattleMon(makePokemon(25, 'pikachu', ['electric']), 1, 0, 50, null))],
            2: [monConfigFrom(createBattleMon(makePokemon(19, 'rattata', ['normal']), 2, 0, 50, null))],
        },
        items: { 1: createInventory(), 2: createInventory() },
        steps: [],
    });

    it('caps at MAX_REPLAYS, newest first', () => {
        for (let i = 0; i < MAX_REPLAYS + 5; i++) saveReplay(makeReplay(i));
        const replays = loadReplays();
        expect(replays.length).toBe(MAX_REPLAYS);
        expect(replays[0].label).toBe(`battle ${MAX_REPLAYS + 4}`); // newest kept
        expect(replays[replays.length - 1].label).toBe('battle 5'); // oldest evicted
    });

    it('deleteReplay removes by date; canPlayReplay rejects other formats', () => {
        saveReplay(makeReplay(1));
        saveReplay(makeReplay(2));
        deleteReplay(makeReplay(1).date);
        expect(loadReplays().map(r => r.seed)).toEqual([2]);
        expect(canPlayReplay(makeReplay(1))).toBe(true);
        expect(canPlayReplay({ ...makeReplay(1), format: REPLAY_FORMAT + 1 })).toBe(false);
    });
});
