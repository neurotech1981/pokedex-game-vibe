import { describe, it, expect } from 'vitest';
import { MOVES, STRUGGLE } from '../../data/moves';
import type { Move } from '../../data/moves';
import { ABILITIES } from '../../types/abilities';
import {
    BattleMon,
    beginBattle,
    calculateMaxHp,
    calculateDamage,
    createBattleMon,
    createEngineState,
    effectiveSpeed,
    getActiveMon,
    resolveAction,
    resolveForcedSwitch,
    setWeather,
    stageMultiplier,
} from '../battleEngine';

import { makePokemon, makeState, rngFrom } from './helpers';

const FLAMETHROWER = MOVES.fire.find(m => m.name === 'Flamethrower')!;
const SYNTHESIS = MOVES.grass.find(m => m.name === 'Synthesis')!;
const RAIN_DANCE = MOVES.water.find(m => m.name === 'Rain Dance')!;

describe('calculateMaxHp', () => {
    it('uses the standard HP formula', () => {
        const mon = makePokemon(1, 'testmon', ['normal'], { hp: 50 });
        expect(calculateMaxHp(mon, 50)).toBe(Math.floor((2 * 50 * 50) / 100) + 50 + 10);
    });
});

describe('calculateDamage', () => {
    const attacker = (types: string[]): BattleMon =>
        createBattleMon(makePokemon(1, 'atk', types), 1, 0, 50, null);
    const defender = (types: string[]): BattleMon =>
        createBattleMon(makePokemon(2, 'def', types), 2, 0, 50, null);
    const move: Move = { name: 'Test Blast', type: 'fire', power: 90, accuracy: 1, energyCost: 25 };
    const options = { weather: 'none', terrain: 'none', rng: () => 0.5 } as const;

    it('is deterministic with an injected rng', () => {
        // base: ((2*50/5+2)*90*(100/100))/50 + 2 = 41.6; x2 effectiveness; x0.925 roll
        const result = calculateDamage(attacker(['water']), defender(['grass']), move, { ...options });
        expect(result).toEqual({ damage: 77, isCritical: false, effectiveness: 2 });
    });

    it('applies STAB', () => {
        const result = calculateDamage(attacker(['fire']), defender(['normal']), move, { ...options });
        expect(result.damage).toBe(Math.round(41.6 * 1.5 * 0.925));
    });

    it('returns zero damage on type immunity', () => {
        const electric: Move = { ...move, type: 'electric' };
        const result = calculateDamage(attacker(['electric']), defender(['ground']), electric, { ...options });
        expect(result).toEqual({ damage: 0, isCritical: false, effectiveness: 0 });
    });

    it('applies critical hits from the rng', () => {
        const rng = rngFrom([0.0, 1.0]); // crit roll, then max damage roll
        const result = calculateDamage(attacker(['water']), defender(['normal']), move, { ...options, rng });
        expect(result.isCritical).toBe(true);
        expect(result.damage).toBe(Math.round(41.6 * 1.5));
    });

    it('halves physical output when the attacker is burned', () => {
        const physical: Move = { name: 'Test Slam', type: 'fighting', power: 90, accuracy: 1, energyCost: 25 };
        const burned = attacker(['water']);
        burned.status = { type: 'burn', turns: 5 };
        const result = calculateDamage(burned, defender(['normal']), physical, { ...options });
        // fighting vs normal is super effective (x2)
        expect(result.damage).toBe(Math.round(41.6 * 0.5 * 2 * 0.925));
    });

    it('burn does not weaken special attacks', () => {
        const burned = attacker(['water']);
        burned.status = { type: 'burn', turns: 5 };
        // fire "Test Blast" is special under the Gen-3 split
        const result = calculateDamage(burned, defender(['normal']), move, { ...options });
        expect(result.damage).toBe(Math.round(41.6 * 0.925));
    });

    it('special moves use special-attack vs special-defense', () => {
        // Asymmetric stats prove which pair is read: huge special-attack, tiny attack
        const specialist = createBattleMon(
            makePokemon(9, 'nuker', ['water'], { attack: 10, specialAttack: 200 }),
            1, 0, 50, null
        );
        const sturdyWall = createBattleMon(
            makePokemon(10, 'wall', ['normal'], { defense: 200, specialDefense: 50 }),
            2, 0, 50, null
        );
        const special = calculateDamage(specialist, sturdyWall, move, { ...options }); // fire = special
        const physical = calculateDamage(specialist, sturdyWall, { ...move, type: 'fighting' }, { ...options });
        // special: 200/50 ratio → strong; physical: 10/200 → weak
        expect(special.damage).toBeGreaterThan(physical.damage * 10);
    });
});

describe('resolveAction: moves', () => {
    it('deducts energy, deals damage and passes the turn', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, () => 0.5);

        expect(events.map(e => e.kind)).toContain('move');
        expect(events.map(e => e.kind)).toContain('damage');
        const actor = getActiveMon(next, 1);
        // 100 - 25 cost + 12 regen
        expect(actor.energy).toBe(87);
        const target = getActiveMon(next, 2);
        expect(target.currentHp).toBeLessThan(target.maxHp);
        expect(next.currentTurn).toBe(2);
        // original state untouched
        expect(getActiveMon(state, 2).currentHp).toBe(getActiveMon(state, 2).maxHp);
    });

    it('rejects unaffordable moves without consuming the turn', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).energy = 5;
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER });
        expect(events[0]).toEqual({ kind: 'noEnergy', monKey: getActiveMon(state, 1).key, moveName: 'Flamethrower' });
        expect(next).toBe(state);
    });

    it('Struggle is always affordable', () => {
        const state = makeState([makePokemon(1, 'a', ['normal'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).energy = 0;
        const { events } = resolveAction(state, { kind: 'move', move: STRUGGLE }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'damage')).toBe(true);
    });

    it('misses when the accuracy roll fails', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const lowAcc: Move = { ...FLAMETHROWER, accuracy: 0.5 };
        const { state: next, events } = resolveAction(state, { kind: 'move', move: lowAcc }, undefined, rngFrom([0.9]));
        expect(events.some(e => e.kind === 'miss')).toBe(true);
        expect(getActiveMon(next, 2).currentHp).toBe(getActiveMon(next, 2).maxHp);
        expect(next.currentTurn).toBe(2);
    });

    it('applies status effects when the roll succeeds', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        // accuracy, crit, damage roll, status roll (< 0.1 burn chance)
        const rng = rngFrom([0.5, 0.5, 0.5, 0.05]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, rng);
        expect(events.some(e => e.kind === 'statusApplied')).toBe(true);
        expect(getActiveMon(next, 2).status?.type).toBe('burn');
    });

    it('blocks a paralyzed actor when the roll fails', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).status = { type: 'paralysis', turns: 5 };
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, rngFrom([0.1]));
        expect(events.some(e => e.kind === 'blocked')).toBe(true);
        expect(getActiveMon(next, 2).currentHp).toBe(getActiveMon(next, 2).maxHp);
        expect(next.currentTurn).toBe(2);
    });

    it('ticks poison damage on the actor at end of turn', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const actor = getActiveMon(state, 1);
        actor.status = { type: 'poison', turns: 3 };
        // paralysis-free statuses: poison does not block, so no canAct roll for poison
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, () => 0.5);
        const tick = events.find(e => e.kind === 'statusDamage');
        expect(tick).toBeDefined();
        const nextActor = getActiveMon(next, 1);
        expect(nextActor.currentHp).toBe(nextActor.maxHp - Math.floor(nextActor.maxHp / 8));
        expect(nextActor.status?.turns).toBe(2);
    });

    it('heals with special-effect moves', () => {
        const state = makeState([makePokemon(1, 'a', ['grass'])], [makePokemon(2, 'b', ['normal'])]);
        const actor = getActiveMon(state, 1);
        actor.currentHp = Math.floor(actor.maxHp / 2);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: SYNTHESIS }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'heal')).toBe(true);
        expect(getActiveMon(next, 1).currentHp).toBeGreaterThan(actor.currentHp);
    });

    it('sets weather from weather moves', () => {
        const state = makeState([makePokemon(1, 'a', ['water'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: RAIN_DANCE }, undefined, () => 0.5);
        expect(next.weather).toBe('rain');
        expect(next.weatherTurns).toBe(5);
        expect(events.some(e => e.kind === 'weatherChanged')).toBe(true);
    });
});

describe('faints, switches and game over', () => {
    it('forces a switch when the defender faints with a bench', () => {
        const state = makeState(
            [makePokemon(1, 'a', ['fire'])],
            [makePokemon(2, 'b', ['normal']), makePokemon(3, 'c', ['normal'])]
        );
        getActiveMon(state, 2).currentHp = 1;
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'faint')).toBe(true);
        expect(next.phase).toBe('awaitingSwitch');
        expect(next.pendingSwitch).toBe(2);

        const benchKey = next.order[2][1];
        const { state: after, events: switchEvents } = resolveForcedSwitch(next, benchKey);
        expect(after.phase).toBe('selecting');
        expect(after.active[2]).toBe(benchKey);
        expect(switchEvents[0]).toMatchObject({ kind: 'switch', forced: true, team: 2 });
    });

    it('ends the game when the last opposing mon faints', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 2).currentHp = 1;
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, () => 0.5);
        expect(next.phase).toBe('gameOver');
        expect(next.winner).toBe(1);
        expect(events.some(e => e.kind === 'gameOver')).toBe(true);
    });

    it('ignores invalid forced switches', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next } = resolveForcedSwitch(state, state.order[2][0]);
        expect(next).toBe(state);
    });

    it('allows voluntary switching and consumes the turn', () => {
        const state = makeState(
            [makePokemon(1, 'a', ['fire']), makePokemon(2, 'b', ['water'])],
            [makePokemon(3, 'c', ['normal'])]
        );
        const benchKey = state.order[1][1];
        const { state: next, events } = resolveAction(state, { kind: 'switch', targetKey: benchKey });
        expect(next.active[1]).toBe(benchKey);
        expect(events[0]).toMatchObject({ kind: 'switch', forced: false, team: 1 });
        expect(next.currentTurn).toBe(2);
    });
});

describe('items', () => {
    it('Potion heals 50% of max HP, consumes the turn and decrements inventory', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const actor = getActiveMon(state, 1);
        actor.currentHp = 1;
        const { state: next, events } = resolveAction(state, { kind: 'item', itemId: 'potion' }, undefined, () => 0.5);
        expect(events[0]).toMatchObject({ kind: 'itemUsed', team: 1, itemId: 'potion' });
        const healed = getActiveMon(next, 1);
        expect(healed.currentHp).toBe(1 + Math.round(healed.maxHp * 0.5));
        expect(next.items[1].potion).toBe(1);
        expect(next.currentTurn).toBe(2);
        expect(getActiveMon(state, 1).currentHp).toBe(1);
    });

    it('Potion healing caps at max HP', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const actor = getActiveMon(state, 1);
        actor.currentHp = actor.maxHp - 10;
        const { state: next, events } = resolveAction(state, { kind: 'item', itemId: 'potion' }, undefined, () => 0.5);
        const heal = events.find(e => e.kind === 'heal');
        expect(heal).toMatchObject({ kind: 'heal', amount: 10 });
        expect(getActiveMon(next, 1).currentHp).toBe(getActiveMon(next, 1).maxHp);
    });

    it('Full Heal cures status conditions', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).status = { type: 'paralysis', turns: 5 };
        const { state: next, events } = resolveAction(state, { kind: 'item', itemId: 'fullHeal' }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'statusCured')).toBe(true);
        expect(getActiveMon(next, 1).status).toBeNull();
        expect(next.items[1].fullHeal).toBe(0);
    });

    it('X-Attack raises attack by two stages', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next, events } = resolveAction(state, { kind: 'item', itemId: 'xAttack' }, undefined, () => 0.5);
        expect(events.find(e => e.kind === 'statStage')).toMatchObject({ stat: 'attack', delta: 2, stage: 2 });
        expect(getActiveMon(next, 1).stages.attack).toBe(2);
    });

    it('rejects pointless or unavailable item use without consuming the turn', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const potionAtFull = resolveAction(state, { kind: 'item', itemId: 'potion' });
        expect(potionAtFull.state).toBe(state);

        state.items[1].fullHeal = 0;
        getActiveMon(state, 1).status = { type: 'burn', turns: 5 };
        const emptyBag = resolveAction(state, { kind: 'item', itemId: 'fullHeal' });
        expect(emptyBag.state).toBe(state);
    });
});

describe('weather chip damage and countdown', () => {
    it('damages non-immune mons and expires at end of the round', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['water'])]);
        const { state: withSand } = setWeather(state, 'sandstorm');
        withSand.weatherTurns = 1;
        withSand.currentTurn = 2;
        withSand.acted = { 1: true, 2: false }; // team 2 closes out the round

        const { state: next, events } = resolveAction(withSand, { kind: 'pass' }, undefined, () => 0.5);
        const chips = events.filter(e => e.kind === 'weatherDamage');
        expect(chips).toHaveLength(2);
        expect(next.weather).toBe('none');
        const mon = getActiveMon(next, 1);
        expect(mon.currentHp).toBe(mon.maxHp - Math.max(1, Math.floor(mon.maxHp / 16)));
    });

    it('spares immune types', () => {
        const state = makeState([makePokemon(1, 'a', ['rock'])], [makePokemon(2, 'b', ['steel'])]);
        const { state: withSand } = setWeather(state, 'sandstorm');
        withSand.currentTurn = 2;
        withSand.acted = { 1: true, 2: false };
        const { events } = resolveAction(withSand, { kind: 'pass' }, undefined, () => 0.5);
        expect(events.filter(e => e.kind === 'weatherDamage')).toHaveLength(0);
    });
});

describe('stat stages', () => {
    it('computes standard stage multipliers and clamps at ±6', () => {
        expect(stageMultiplier(0)).toBe(1);
        expect(stageMultiplier(1)).toBe(1.5);
        expect(stageMultiplier(2)).toBe(2);
        expect(stageMultiplier(6)).toBe(4);
        expect(stageMultiplier(-1)).toBeCloseTo(2 / 3);
        expect(stageMultiplier(-6)).toBe(0.25);
    });

    it('boost moves raise the targeted stat by stages', () => {
        const CALM_MIND = MOVES.psychic.find(m => m.name === 'Calm Mind')!;
        const state = makeState([makePokemon(1, 'a', ['psychic'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: CALM_MIND }, undefined, () => 0.4);
        expect(events.find(e => e.kind === 'statStage')).toMatchObject({ stat: 'attack', delta: 1, stage: 1 });
        expect(getActiveMon(next, 1).stages.attack).toBe(1);
    });

    it('attack stages scale damage and clamp at +6', () => {
        const move: Move = { name: 'Test Blast', type: 'fire', power: 90, accuracy: 1, energyCost: 25 };
        const attackerMon = createBattleMon(makePokemon(1, 'atk', ['water']), 1, 0, 50, null);
        const defenderMon = createBattleMon(makePokemon(2, 'def', ['normal']), 2, 0, 50, null);
        const options = { weather: 'none', terrain: 'none', rng: () => 0.5 } as const;
        const base = calculateDamage(attackerMon, defenderMon, move, { ...options }).damage;
        attackerMon.stages.attack = 2;
        const boosted = calculateDamage(attackerMon, defenderMon, move, { ...options }).damage;
        expect(boosted).toBeGreaterThan(base * 1.8);
        defenderMon.stages.defense = 2;
        const defended = calculateDamage(attackerMon, defenderMon, move, { ...options }).damage;
        expect(defended).toBeLessThan(boosted);
    });

    it('stages never exceed +6', () => {
        const state = makeState([makePokemon(1, 'a', ['dark'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).stages.attack = 5;
        const NASTY_PLOT = MOVES.dark.find(m => m.name === 'Nasty Plot')!;
        const { state: next, events } = resolveAction(state, { kind: 'move', move: NASTY_PLOT }, undefined, () => 0.4);
        expect(getActiveMon(next, 1).stages.attack).toBe(6);
        expect(events.find(e => e.kind === 'statStage')).toMatchObject({ delta: 1, stage: 6 });
    });
});

describe('speed-based turn order', () => {
    it('the faster lead moves first at battle start', () => {
        const state = makeState(
            [makePokemon(1, 'slow', ['normal'], { speed: 60 })],
            [makePokemon(2, 'fast', ['normal'], { speed: 130 })]
        );
        const { state: begun } = beginBattle(state, () => 0.9);
        expect(begun.roundFirst).toBe(2);
        expect(begun.currentTurn).toBe(2);
    });

    it('paralysis halves effective speed and flips the order', () => {
        const fast = createBattleMon(makePokemon(1, 'fast', ['normal'], { speed: 100 }), 1, 0, 50, null);
        expect(effectiveSpeed(fast)).toBe(100);
        fast.status = { type: 'paralysis', turns: 5 };
        expect(effectiveSpeed(fast)).toBe(50);

        const state = makeState(
            [makePokemon(1, 'fast', ['normal'], { speed: 100 })],
            [makePokemon(2, 'mid', ['normal'], { speed: 80 })]
        );
        getActiveMon(state, 1).status = { type: 'paralysis', turns: 5 };
        const { state: begun } = beginBattle(state, () => 0.9);
        expect(begun.roundFirst).toBe(2);
    });

    it('recomputes the leader every round', () => {
        const state = makeState(
            [makePokemon(1, 'fast', ['normal'], { speed: 130 })],
            [makePokemon(2, 'slow', ['normal'], { speed: 60 })]
        );
        const { state: begun } = beginBattle(state, () => 0.9);
        expect(begun.currentTurn).toBe(1);
        // Team 1 acts, round not over → team 2 up next
        const { state: afterFirst } = resolveAction(begun, { kind: 'pass' }, undefined, () => 0.5);
        expect(afterFirst.currentTurn).toBe(2);
        expect(afterFirst.acted[1]).toBe(true);
        // Team 2 closes the round → the faster team 1 leads again
        const { state: afterRound } = resolveAction(afterFirst, { kind: 'pass' }, undefined, () => 0.5);
        expect(afterRound.currentTurn).toBe(1);
        expect(afterRound.acted).toEqual({ 1: false, 2: false });
        expect(afterRound.turnCount).toBe(begun.turnCount + 1);
    });
});

describe('abilities', () => {
    it('Intimidate lowers the opposing attack on battle start', () => {
        const team1 = [createBattleMon(makePokemon(1, 'growly', ['dark']), 1, 0, 50, ABILITIES.Intimidate)];
        const team2 = [createBattleMon(makePokemon(2, 'prey', ['normal']), 2, 0, 50, null)];
        const state = createEngineState(team1, team2);
        const { state: begun, events } = beginBattle(state, () => 0.9);
        expect(events.some(e => e.kind === 'abilityActivated' && e.abilityName === 'Intimidate')).toBe(true);
        expect(getActiveMon(begun, 2).stages.attack).toBe(-1);
    });

    it('Intimidate fires again when switching in', () => {
        const team1 = [
            createBattleMon(makePokemon(1, 'lead', ['normal']), 1, 0, 50, null),
            createBattleMon(makePokemon(2, 'growly', ['dark']), 1, 1, 50, ABILITIES.Intimidate),
        ];
        const team2 = [createBattleMon(makePokemon(3, 'prey', ['normal']), 2, 0, 50, null)];
        const state = createEngineState(team1, team2);
        const { state: next, events } = resolveAction(state, { kind: 'switch', targetKey: team1[1].key }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'abilityActivated' && e.abilityName === 'Intimidate')).toBe(true);
        expect(getActiveMon(next, 2).stages.attack).toBe(-1);
    });

    it('Levitate blocks its immune type entirely', () => {
        const EARTHQUAKE = MOVES.ground.find(m => m.name === 'Earthquake')!;
        const team1 = [createBattleMon(makePokemon(1, 'digger', ['ground']), 1, 0, 50, null)];
        const team2 = [createBattleMon(makePokemon(2, 'floaty', ['electric']), 2, 0, 50, ABILITIES.Levitate)];
        const state = createEngineState(team1, team2);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: EARTHQUAKE }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'abilityActivated' && e.abilityName === 'Levitate')).toBe(true);
        expect(events.find(e => e.kind === 'damage')).toMatchObject({ amount: 0, effectiveness: 0 });
        expect(getActiveMon(next, 2).currentHp).toBe(getActiveMon(next, 2).maxHp);
    });

    it('Static can paralyze the attacker on contact', () => {
        const team1 = [createBattleMon(makePokemon(1, 'puncher', ['fighting']), 1, 0, 50, null)];
        const team2 = [createBattleMon(makePokemon(2, 'sparky', ['electric'], { hp: 200 }), 2, 0, 50, ABILITIES.Static)];
        const state = createEngineState(team1, team2);
        const BRICK_BREAK = MOVES.fighting.find(m => m.name === 'Brick Break')!;
        // accuracy, crit, damage roll, then retaliate roll below Static's 0.3 chance
        const rng = rngFrom([0.5, 0.5, 0.5, 0.1]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: BRICK_BREAK }, undefined, rng);
        expect(events.some(e => e.kind === 'abilityActivated' && e.abilityName === 'Static')).toBe(true);
        expect(getActiveMon(next, 1).status?.type).toBe('paralysis');
    });

    it('Sturdy survives a KO hit from full HP exactly once', () => {
        const HYPER_BEAM = MOVES.normal.find(m => m.name === 'Hyper Beam')!;
        const team1 = [createBattleMon(makePokemon(1, 'nuker', ['normal'], { attack: 200 }), 1, 0, 50, null)];
        const team2 = [
            createBattleMon(makePokemon(2, 'boulder', ['rock'], { hp: 30, defense: 40 }), 2, 0, 50, ABILITIES.Sturdy),
            createBattleMon(makePokemon(3, 'backup', ['rock']), 2, 1, 50, null),
        ];
        const state = createEngineState(team1, team2);
        const { state: afterFirst, events } = resolveAction(state, { kind: 'move', move: HYPER_BEAM }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'abilityActivated' && e.abilityName === 'Sturdy')).toBe(true);
        expect(events.some(e => e.kind === 'faint')).toBe(false);
        const survivor = getActiveMon(afterFirst, 2);
        expect(survivor.currentHp).toBe(1);
        expect(survivor.abilityUsed).toBe(true);

        // Not at full HP anymore: the next hit connects normally
        afterFirst.currentTurn = 1;
        const { events: secondEvents } = resolveAction(afterFirst, { kind: 'move', move: HYPER_BEAM }, undefined, () => 0.5);
        expect(secondEvents.some(e => e.kind === 'faint')).toBe(true);
    });
});

describe('held items', () => {
    const move: Move = { name: 'Test Blast', type: 'fire', power: 90, accuracy: 1, energyCost: 25 };
    const options = { weather: 'none', terrain: 'none', rng: () => 0.5 } as const;

    it('Charcoal boosts fire moves by 20% and nothing else', () => {
        const attacker = createBattleMon(makePokemon(1, 'atk', ['water']), 1, 0, 50, null, { heldItem: 'charcoal' });
        const defender = createBattleMon(makePokemon(2, 'def', ['normal']), 2, 0, 50, null);
        const boosted = calculateDamage(attacker, defender, move, { ...options });
        expect(boosted.damage).toBe(Math.round(41.6 * 1.2 * 0.925));
        const waterMove: Move = { ...move, type: 'water' };
        const unboosted = calculateDamage(attacker, defender, waterMove, { ...options });
        expect(unboosted.damage).toBe(Math.round(41.6 * 1.5 * 0.925)); // STAB only
    });

    it('Leftovers heals 1/16 max HP at the end of the round', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const holder = getActiveMon(state, 1);
        holder.heldItem = 'leftovers';
        holder.currentHp = 50;
        state.currentTurn = 2;
        state.acted = { 1: true, 2: false }; // team 2's pass closes the round
        const { state: next, events } = resolveAction(state, { kind: 'pass' }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'heldItem' && e.itemName === 'Leftovers')).toBe(true);
        expect(getActiveMon(next, 1).currentHp).toBe(50 + Math.floor(holder.maxHp / 16));
    });

    it('Leftovers does nothing at full HP', () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        getActiveMon(state, 1).heldItem = 'leftovers';
        state.currentTurn = 2;
        state.acted = { 1: true, 2: false };
        const { events } = resolveAction(state, { kind: 'pass' }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'heldItem')).toBe(false);
    });

    it('Focus Sash survives a KO hit from full HP exactly once', () => {
        const HYPER_BEAM = MOVES.normal.find(m => m.name === 'Hyper Beam')!;
        const team1 = [createBattleMon(makePokemon(1, 'nuker', ['normal'], { attack: 200 }), 1, 0, 50, null)];
        const team2 = [
            createBattleMon(makePokemon(2, 'frail', ['fire'], { hp: 30, defense: 40 }), 2, 0, 50, null, { heldItem: 'focusSash' }),
            createBattleMon(makePokemon(3, 'backup', ['fire']), 2, 1, 50, null),
        ];
        const state = createEngineState(team1, team2);
        const { state: afterFirst, events } = resolveAction(state, { kind: 'move', move: HYPER_BEAM }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'heldItem' && e.itemName === 'Focus Sash')).toBe(true);
        expect(events.some(e => e.kind === 'faint')).toBe(false);
        const survivor = getActiveMon(afterFirst, 2);
        expect(survivor.currentHp).toBe(1);
        expect(survivor.heldItemUsed).toBe(true);

        afterFirst.currentTurn = 1;
        const { events: second } = resolveAction(afterFirst, { kind: 'move', move: HYPER_BEAM }, undefined, () => 0.5);
        expect(second.some(e => e.kind === 'faint')).toBe(true);
    });

    it('Quick Claw can steal the round lead from a faster opponent', () => {
        const state = makeState(
            [makePokemon(1, 'slowpoke', ['normal'], { speed: 20 })],
            [makePokemon(2, 'speedy', ['normal'], { speed: 150 })]
        );
        getActiveMon(state, 1).heldItem = 'quickClaw';
        // First rng call is the team-1 quick claw proc (< 0.2 fires)
        const { state: begun, events } = beginBattle(state, rngFrom([0.05]));
        expect(begun.roundFirst).toBe(1);
        expect(events.some(e => e.kind === 'heldItem' && e.itemName === 'Quick Claw')).toBe(true);

        // No proc → the faster side leads as usual
        const { state: normal } = beginBattle(state, rngFrom([0.9]));
        expect(normal.roundFirst).toBe(2);
    });
});

describe('combat depth: multi-hit, flinch, debuffs, priority momentum', () => {
    const FURY: Move = {
        name: 'Test Fury', type: 'normal', power: 20, accuracy: 1, energyCost: 15,
        multiHit: { min: 2, max: 5 },
    };
    const HEADBUTT: Move = {
        name: 'Test Headbutt', type: 'normal', power: 70, accuracy: 1, energyCost: 20,
        flinchChance: 0.3,
    };
    const GROWL: Move = {
        name: 'Test Growl', type: 'normal', power: 0, accuracy: 1, energyCost: 10,
        debuff: { stat: 'attack', stages: 1, chance: 1 },
    };
    const QUICK: Move = {
        name: 'Test Quick', type: 'normal', power: 40, accuracy: 1, energyCost: 10,
        priority: 1,
    };

    it('multi-hit strikes the rolled number of times and reports it', () => {
        const state = makeState([makePokemon(1, 'a', ['normal'])], [makePokemon(2, 'b', ['normal'], { hp: 200 })]);
        // accuracy, hit1 crit+dmg, hit-count roll 0.99 → 2+floor(.99*4)=5 hits,
        // then 4 × (crit+dmg) rolls
        const rng = rngFrom([0.5, 0.5, 0.5, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
        const { events } = resolveAction(state, { kind: 'move', move: FURY }, undefined, rng);
        expect(events.filter(e => e.kind === 'damage')).toHaveLength(5);
        expect(events.find(e => e.kind === 'multiHit')).toMatchObject({ hits: 5 });
    });

    it('Focus Sash only saves against the first hit of a multi-hit move', () => {
        const team1 = [createBattleMon(makePokemon(1, 'nuker', ['normal'], { attack: 250 }), 1, 0, 50, null)];
        const team2 = [
            createBattleMon(makePokemon(2, 'frail', ['fire'], { hp: 25, defense: 30 }), 2, 0, 50, null, { heldItem: 'focusSash' }),
            createBattleMon(makePokemon(3, 'backup', ['fire']), 2, 1, 50, null),
        ];
        const state = createEngineState(team1, team2);
        const { events } = resolveAction(state, { kind: 'move', move: FURY }, undefined, () => 0.5);
        // sash procs on hit 1 (lethal from full), hit 2 finishes the job
        expect(events.some(e => e.kind === 'heldItem' && e.itemName === 'Focus Sash')).toBe(true);
        expect(events.some(e => e.kind === 'faint')).toBe(true);
    });

    it('flinch blocks a defender that has not acted yet, then expires', () => {
        const state = makeState(
            [makePokemon(1, 'fast', ['normal'], { speed: 150, hp: 200 })],
            [makePokemon(2, 'slow', ['normal'], { speed: 30, hp: 200 })]
        );
        // Team 1 (leads) headbutts: accuracy, crit, dmg, flinch roll 0.1 < 0.3
        const { state: afterHit } = resolveAction(state, { kind: 'move', move: HEADBUTT }, undefined, rngFrom([0.5, 0.5, 0.5, 0.1]));
        expect(getActiveMon(afterHit, 2).flinched).toBe(true);
        // Team 2 tries to act → blocked by flinch, flag consumed
        const { state: afterBlock, events } = resolveAction(afterHit, { kind: 'move', move: HEADBUTT }, undefined, () => 0.5);
        expect(events.some(e => e.kind === 'blocked' && e.reason === 'flinch')).toBe(true);
        expect(getActiveMon(afterBlock, 2).flinched).toBe(false);
    });

    it('flinch cannot be applied to a defender that already acted this round', () => {
        const state = makeState(
            [makePokemon(1, 'slow', ['normal'], { speed: 30, hp: 200 })],
            [makePokemon(2, 'fast', ['normal'], { speed: 150, hp: 200 })]
        );
        state.currentTurn = 1;
        state.acted = { 1: false, 2: true }; // team 2 already moved this round
        const { state: next } = resolveAction(state, { kind: 'move', move: HEADBUTT }, undefined, rngFrom([0.5, 0.5, 0.5, 0.1]));
        expect(getActiveMon(next, 2).flinched).toBe(false);
    });

    it('pure status debuffs lower the target stat', () => {
        const state = makeState([makePokemon(1, 'a', ['normal'])], [makePokemon(2, 'b', ['normal'])]);
        const { state: next, events } = resolveAction(state, { kind: 'move', move: GROWL }, undefined, () => 0.5);
        expect(events.find(e => e.kind === 'statStage')).toMatchObject({ stat: 'attack', delta: -1, stage: -1 });
        expect(getActiveMon(next, 2).stages.attack).toBe(-1);
    });

    it('priority momentum: the slower mon leads the next round after a priority move', () => {
        const state = makeState(
            [makePokemon(1, 'slow', ['normal'], { speed: 30, hp: 300 })],
            [makePokemon(2, 'fast', ['normal'], { speed: 150, hp: 300 })]
        );
        // Fast team 2 leads round 1 and passes; slow team 1 closes with a priority move
        state.currentTurn = 2;
        const { state: afterFast } = resolveAction(state, { kind: 'pass' }, undefined, () => 0.5);
        expect(afterFast.currentTurn).toBe(1);
        const { state: afterRound } = resolveAction(afterFast, { kind: 'move', move: QUICK }, undefined, () => 0.5);
        // Momentum outranks speed: team 1 leads round 2
        expect(afterRound.roundFirst).toBe(1);

        // Momentum resets after a non-priority action
        afterRound.currentTurn = 1;
        const { state: afterPlain } = resolveAction(afterRound, { kind: 'pass' }, undefined, () => 0.5);
        const { state: finalRound } = resolveAction(
            { ...afterPlain, currentTurn: 2 },
            { kind: 'pass' },
            undefined,
            () => 0.5
        );
        expect(finalRound.roundFirst).toBe(2); // speed decides again
    });

    it('priority momentum outranks Quick Claw', () => {
        const state = makeState(
            [makePokemon(1, 'a', ['normal'], { speed: 100 })],
            [makePokemon(2, 'b', ['normal'], { speed: 100 })]
        );
        getActiveMon(state, 1).priorityMomentum = 1;
        getActiveMon(state, 2).heldItem = 'quickClaw';
        // rng would proc the claw (0.05 < 0.2) but momentum wins without rolling
        const { state: begun } = beginBattle(state, rngFrom([0.05]));
        expect(begun.roundFirst).toBe(1);
    });

    it("the 'move' event carries the damage class", () => {
        const state = makeState([makePokemon(1, 'a', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const { events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, () => 0.5);
        expect(events.find(e => e.kind === 'move')).toMatchObject({ damageClass: 'special' });
    });
});

describe('confusion self-hit', () => {
    it('a confused Pokémon can hurt itself', () => {
        const state = makeState([makePokemon(1, 'dizzy', ['fire'])], [makePokemon(2, 'b', ['normal'])]);
        const actor = getActiveMon(state, 1);
        actor.status = { type: 'confusion', turns: 3 };
        // confusion roll 0.1 < 0.33 → blocked and self-hit
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, rngFrom([0.1]));
        const hit = events.find(e => e.kind === 'confusionHit');
        expect(hit).toBeDefined();
        const hurt = getActiveMon(next, 1);
        expect(hurt.currentHp).toBeLessThan(hurt.maxHp);
        expect(getActiveMon(next, 2).currentHp).toBe(getActiveMon(next, 2).maxHp);
    });

    it('a confusion self-hit can cause a faint', () => {
        const state = makeState(
            [makePokemon(1, 'dizzy', ['fire']), makePokemon(2, 'bench', ['water'])],
            [makePokemon(3, 'b', ['normal'])]
        );
        const actor = getActiveMon(state, 1);
        actor.status = { type: 'confusion', turns: 3 };
        actor.currentHp = 5;
        const { state: next, events } = resolveAction(state, { kind: 'move', move: FLAMETHROWER }, undefined, rngFrom([0.1]));
        expect(events.some(e => e.kind === 'faint')).toBe(true);
        expect(next.phase).toBe('awaitingSwitch');
        expect(next.pendingSwitch).toBe(1);
    });
});
