import { describe, it, expect } from 'vitest';
import { STRUGGLE, getMovesForTypes } from '../../data/moves';
import { getActiveMon } from '../battleEngine';
import { selectAIAction, selectAIForcedSwitch } from '../battleAI';
import { makePokemon, makeState } from './helpers';

// rng that never triggers the beginner/intermediate randomization branch
const NO_RANDOM = () => 0.99;

describe('selectAIAction', () => {
    it('prioritizes a guaranteed KO', () => {
        // Team 2 (fire) attacks a nearly-dead defender
        const state = makeState(
            [makePokemon(1, 'prey', ['normal'])],
            [makePokemon(2, 'hunter', ['fire'], { attack: 150 })]
        );
        state.currentTurn = 2;
        getActiveMon(state, 1).currentHp = 10;
        const action = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(action.kind).toBe('move');
        if (action.kind === 'move') {
            expect(action.move.power).toBeGreaterThan(0);
        }
    });

    it('values status moves against a fresh target but not a statused one', () => {
        // Weak attacker: expected damage is tiny, so Thunder Wave should win
        // (electric moves are special under the Gen-3 split — weaken both stats)
        const state = makeState(
            [makePokemon(1, 'tank', ['normal'], { defense: 250, specialDefense: 250 })],
            [makePokemon(2, 'zapper', ['electric'], { attack: 10, specialAttack: 10 })]
        );
        state.currentTurn = 2;
        const fresh = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(fresh.kind).toBe('move');
        if (fresh.kind === 'move') {
            expect(fresh.move.statusEffect?.type).toBe('paralysis');
            expect(fresh.move.power).toBe(0); // Thunder Wave, not Thunder
        }

        getActiveMon(state, 1).status = { type: 'burn', turns: 5 };
        const statused = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        if (statused.kind === 'move') {
            expect(statused.move.power).toBeGreaterThan(0); // no point re-statusing
        }
    });

    it('intermediate AI heals with a potion at low HP; beginner never does', () => {
        const state = makeState(
            [makePokemon(1, 'wall', ['normal'], { hp: 250, defense: 250 })],
            [makePokemon(2, 'weakling', ['fire'], { attack: 20 })]
        );
        state.currentTurn = 2;
        const ai = getActiveMon(state, 2);
        ai.currentHp = Math.floor(ai.maxHp * 0.2);

        const intermediate = selectAIAction(state, undefined, 'intermediate', 'balanced', NO_RANDOM);
        expect(intermediate).toEqual({ kind: 'item', itemId: 'potion' });

        const beginner = selectAIAction(state, undefined, 'beginner', 'balanced', NO_RANDOM);
        expect(beginner.kind).toBe('move');
    });

    it('cures a bad status with a Full Heal', () => {
        const state = makeState(
            [makePokemon(1, 'wall', ['normal'], { hp: 250, defense: 250 })],
            [makePokemon(2, 'sleepy', ['fire'], { attack: 20 })]
        );
        state.currentTurn = 2;
        getActiveMon(state, 2).status = { type: 'sleep', turns: 3 };
        const action = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(action).toEqual({ kind: 'item', itemId: 'fullHeal' });
    });

    it('expert AI switches out of a hopeless matchup', () => {
        // Normal attacker vs ghost: every damaging move is immune
        const state = makeState(
            [makePokemon(1, 'spooky', ['ghost'])],
            [makePokemon(2, 'normie', ['normal']), makePokemon(3, 'edgy', ['dark'])]
        );
        state.currentTurn = 2;
        const action = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(action.kind).toBe('switch');
        if (action.kind === 'switch') {
            expect(action.targetKey).toBe(state.order[2][1]); // the dark-type bench mon
        }
    });

    it('falls back to Struggle with no affordable moves', () => {
        const state = makeState(
            [makePokemon(1, 'a', ['normal'])],
            [makePokemon(2, 'b', ['fire'])]
        );
        state.currentTurn = 2;
        getActiveMon(state, 2).energy = 0;
        const action = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(action).toEqual({ kind: 'move', move: STRUGGLE });
    });

    it('acts for whichever team currentTurn names (hotseat regression lock)', () => {
        const state = makeState(
            [makePokemon(1, 'aqua', ['water'])],
            [makePokemon(2, 'flare', ['fire'])]
        );
        state.currentTurn = 1;
        const action = selectAIAction(state, undefined, 'expert', 'balanced', NO_RANDOM);
        expect(action.kind).toBe('move');
        if (action.kind === 'move') {
            // Team 1 is water-typed: the chosen move must come from its moveset
            expect(getMovesForTypes(['water']).some(m => m.name === action.move.name)).toBe(true);
        }
    });
});

describe('selectAIForcedSwitch', () => {
    it('picks the bench mon with the best matchup', () => {
        const state = makeState(
            [makePokemon(1, 'spooky', ['ghost'])],
            [
                makePokemon(2, 'downed', ['normal']),
                makePokemon(3, 'normie2', ['normal']),
                makePokemon(4, 'edgy', ['dark']),
            ]
        );
        getActiveMon(state, 2).currentHp = 0;
        state.phase = 'awaitingSwitch';
        state.pendingSwitch = 2;
        const key = selectAIForcedSwitch(state, 2);
        expect(key).toBe(state.order[2][2]); // dark beats ghost
    });

    it('returns null with an empty bench', () => {
        const state = makeState(
            [makePokemon(1, 'a', ['fire'])],
            [makePokemon(2, 'b', ['normal'])]
        );
        getActiveMon(state, 2).currentHp = 0;
        state.phase = 'awaitingSwitch';
        state.pendingSwitch = 2;
        expect(selectAIForcedSwitch(state, 2)).toBeNull();
    });
});
