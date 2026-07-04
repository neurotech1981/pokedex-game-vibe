import { describe, it, expect } from 'vitest';
import type { ApiMoveDetail, ApiPokemonMoveEntry } from '../movesets';
import { mapApiMove, pickMoveset, prettifyMoveName, selectLevelUpCandidates } from '../movesets';
import type { Move } from '../../data/moves';
import { getDamageClass } from '../../data/moves';

const detail = (overrides: Partial<ApiMoveDetail>): ApiMoveDetail => ({
    name: 'thunderbolt',
    power: 90,
    accuracy: 100,
    type: { name: 'electric' },
    damage_class: { name: 'special' },
    meta: { ailment: { name: 'paralysis' }, ailment_chance: 10 },
    ...overrides,
});

describe('mapApiMove', () => {
    it('maps a standard damaging move', () => {
        const move = mapApiMove(detail({}));
        expect(move).toMatchObject({
            name: 'Thunderbolt',
            type: 'electric',
            power: 90,
            accuracy: 1,
            damageClass: 'special',
            statusEffect: { type: 'paralysis', chance: 0.1 },
        });
        expect(move.energyCost).toBe(28); // round(90/4) + 5
    });

    it('null power → 0; null accuracy → always hits', () => {
        const move = mapApiMove(detail({ name: 'swift', power: null, accuracy: null, meta: null }));
        expect(move.power).toBe(0);
        expect(move.accuracy).toBe(1);
        expect(move.statusEffect).toBeUndefined();
    });

    it('pure status moves with ailment_chance 0 always inflict', () => {
        const move = mapApiMove(detail({
            name: 'thunder-wave',
            power: null,
            accuracy: 90,
            damage_class: { name: 'status' },
            meta: { ailment: { name: 'paralysis' }, ailment_chance: 0 },
        }));
        expect(move.power).toBe(0);
        expect(move.statusEffect).toEqual({ type: 'paralysis', chance: 1 });
        expect(getDamageClass(move)).toBe('status');
    });

    it('ignores ailments the engine does not model', () => {
        const move = mapApiMove(detail({ meta: { ailment: { name: 'infatuation' }, ailment_chance: 30 } }));
        expect(move.statusEffect).toBeUndefined();
    });

    it('prettifies hyphenated names', () => {
        expect(prettifyMoveName('fire-blast')).toBe('Fire Blast');
        expect(prettifyMoveName('double-edge')).toBe('Double Edge');
    });
});

describe('selectLevelUpCandidates', () => {
    const entry = (name: string, methods: Array<{ method: string; level: number }>): ApiPokemonMoveEntry => ({
        move: { name, url: `https://pokeapi.co/api/v2/move/${name}/` },
        version_group_details: methods.map(m => ({
            level_learned_at: m.level,
            move_learn_method: { name: m.method },
        })),
    });

    it('keeps only level-up moves, strongest first, capped at 8', () => {
        const entries = [
            entry('tackle', [{ method: 'level-up', level: 1 }]),
            entry('hyper-beam', [{ method: 'machine', level: 0 }]), // TM only — dropped
            entry('thunder', [{ method: 'level-up', level: 58 }]),
            entry('thunderbolt', [{ method: 'level-up', level: 36 }, { method: 'machine', level: 0 }]),
            ...Array.from({ length: 10 }, (_, i) => entry(`filler-${i}`, [{ method: 'level-up', level: 10 + i }])),
        ];
        const picked = selectLevelUpCandidates(entries);
        expect(picked).toHaveLength(8);
        expect(picked[0].name).toBe('thunder');
        expect(picked[1].name).toBe('thunderbolt');
        expect(picked.some(c => c.name === 'hyper-beam')).toBe(false);
    });
});

describe('pickMoveset', () => {
    const dmg = (name: string, power: number): Move => ({ name, type: 'normal', power, accuracy: 1, energyCost: 20 });
    const status = (name: string): Move => ({ name, type: 'normal', power: 0, accuracy: 1, energyCost: 15 });

    it('takes 3 damaging + 1 status when both exist', () => {
        const set = pickMoveset([dmg('A', 90), dmg('B', 80), dmg('C', 70), dmg('D', 60), status('S1'), status('S2')]);
        expect(set).toHaveLength(4);
        expect(set.filter(m => m.power > 0)).toHaveLength(3);
        expect(set.filter(m => m.power <= 0)).toHaveLength(1);
        expect(set[3].name).toBe('S1');
    });

    it('takes 4 damaging when no status moves exist', () => {
        const set = pickMoveset([dmg('A', 90), dmg('B', 80), dmg('C', 70), dmg('D', 60), dmg('E', 50)]);
        expect(set.map(m => m.name)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('handles all-status and tiny learnsets', () => {
        expect(pickMoveset([status('S1'), status('S2')])).toHaveLength(2);
        expect(pickMoveset([dmg('A', 40)])).toHaveLength(1);
        expect(pickMoveset([])).toHaveLength(0);
    });
});
