import { describe, expect, it } from 'vitest';
import { SAVE_KEYS, applyFullSave, buildFullSave, parseFullSave } from '../saveData';
import { createProfile } from '../progression';

const makeStorage = (initial: Record<string, string> = {}) => {
    const map = new Map(Object.entries(initial));
    return {
        map,
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => { map.set(k, v); },
    };
};

describe('full-save export/import', () => {
    it('round-trips build → serialize → parse → apply', () => {
        const profile = JSON.stringify(createProfile());
        const source = makeStorage({
            'pokedexGame.profile.v1': profile,
            'pokemonTeams': '[]',
            'battleSpeed': '2',
            'unrelated.key': 'never exported',
        });
        const save = buildFullSave(source);
        expect(save.kind).toBe('pokedex-game-save');
        expect(save.data['pokedexGame.profile.v1']).toBe(profile);
        expect(save.data['unrelated.key']).toBeUndefined();
        expect(save.data['pokedexGame.replays.v1']).toBeUndefined(); // missing keys omitted

        const parsed = parseFullSave(JSON.stringify(save));
        const target = makeStorage();
        applyFullSave(parsed, target);
        expect(target.map.get('pokedexGame.profile.v1')).toBe(profile);
        expect(target.map.get('battleSpeed')).toBe('2');
        expect(target.map.has('pokedexGame.replays.v1')).toBe(false); // absent keys not written
    });

    it('covers every game storage key', () => {
        expect(SAVE_KEYS).toContain('pokedexGame.profile.v1');
        expect(SAVE_KEYS).toContain('pokedexGame.replays.v1');
        expect(SAVE_KEYS).toContain('pokemonTeams');
        expect(new Set(SAVE_KEYS).size).toBe(SAVE_KEYS.length);
    });

    it('rejects wrong kind, wrong version and junk', () => {
        expect(() => parseFullSave('not json')).toThrow(/not valid JSON/);
        expect(() => parseFullSave('{"kind":"something-else"}')).toThrow(/not a Pokédex save/);
        expect(() => parseFullSave('{"kind":"pokedex-game-save","version":2,"data":{}}')).toThrow(/Unsupported save version/);
        expect(() => parseFullSave('{"kind":"pokedex-game-save","version":1}')).toThrow(/no data/);
    });

    it('ignores extra keys injected into a save file', () => {
        const save = parseFullSave(JSON.stringify({
            kind: 'pokedex-game-save',
            version: 1,
            exportedAt: '2026-07-07T00:00:00.000Z',
            data: { 'evil.key': 'nope', battleSpeed: '1.5' },
        }));
        const target = makeStorage();
        applyFullSave(save, target);
        expect(target.map.has('evil.key')).toBe(false);
        expect(target.map.get('battleSpeed')).toBe('1.5');
    });
});
