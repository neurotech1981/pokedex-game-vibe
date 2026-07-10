import { describe, expect, it } from 'vitest';
import { decodeReplayCode, decodeTeamCode, encodeReplayCode, encodeTeamCode } from '../shareCodes';
import { REPLAY_FORMAT, type BattleReplay } from '../replay';
import type { Team } from '../../types/pokemon';
import { makePokemon } from './helpers';
import { compressToEncodedURIComponent } from 'lz-string';

const team: Team = {
    id: 't1',
    name: 'Alpha Squad',
    pokemon: [makePokemon(25, 'pikachu', ['electric']), makePokemon(6, 'charizard', ['fire', 'flying'])],
};

const replay: BattleReplay = {
    format: REPLAY_FORMAT,
    seed: 1234,
    date: '2026-07-10T12:00:00.000Z',
    mode: 'quick',
    label: 'Quick Battle',
    winner: 1,
    hotseat: false,
    teams: {
        1: [{ pokemon: makePokemon(25, 'pikachu', ['electric']), level: 50, moves: [], ability: null, currentHpPct: 1 }],
        2: [{ pokemon: makePokemon(6, 'charizard', ['fire', 'flying']), level: 50, moves: [], ability: null, currentHpPct: 1 }],
    } as never,
    items: { 1: {}, 2: {} } as never,
    steps: [{ team: 1, action: { type: 'attack', moveIndex: 0 } }] as never,
};

describe('share codes', () => {
    it('round-trips a team', () => {
        const decoded = decodeTeamCode(encodeTeamCode(team));
        expect(decoded).toEqual(team);
    });

    it('round-trips a replay', () => {
        const decoded = decodeReplayCode(encodeReplayCode(replay));
        expect(decoded).toEqual(replay);
    });

    it('team codes stay comfortably clipboard-sized', () => {
        expect(encodeTeamCode(team).length).toBeLessThan(4096);
    });

    it('rejects garbage with a readable error', () => {
        expect(() => decodeTeamCode('not-a-code!!!')).toThrow(/share code/i);
        expect(() => decodeReplayCode('')).toThrow(/share code/i);
    });

    it('rejects the wrong kind with a pointer to the right place', () => {
        expect(() => decodeReplayCode(encodeTeamCode(team))).toThrow(/team code/i);
        expect(() => decodeTeamCode(encodeReplayCode(replay))).toThrow(/replay code/i);
    });

    it('rejects codes from a newer version', () => {
        const future = compressToEncodedURIComponent(JSON.stringify({ kind: 'pokedex-game-team', version: 99, data: team }));
        expect(() => decodeTeamCode(future)).toThrow(/newer version/i);
    });

    it('rejects replays that fail canPlayReplay', () => {
        const broken = { ...replay, format: 999 };
        expect(() => decodeReplayCode(encodeReplayCode(broken as BattleReplay))).toThrow(/incompatible/i);
        const empty = { ...replay, teams: { 1: [], 2: [] } };
        expect(() => decodeReplayCode(encodeReplayCode(empty as never))).toThrow(/incompatible/i);
    });

    it('rejects team codes with no usable pokemon', () => {
        const bad = { ...team, pokemon: [] };
        expect(() => decodeTeamCode(encodeTeamCode(bad))).toThrow(/damaged/i);
    });
});
