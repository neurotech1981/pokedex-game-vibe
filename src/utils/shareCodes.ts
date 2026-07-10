import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Team, Pokemon } from '../types/pokemon';
import type { BattleReplay } from './replay';
import { canPlayReplay } from './replay';

/**
 * Share codes: lz-string-compressed JSON envelopes for teams and battle
 * replays, exchanged via clipboard (replays compress to 4–15KB — far too
 * big for URLs). Decoding validates a kind/version envelope and throws
 * user-readable errors, mirroring saveData.parseFullSave.
 */

const TEAM_KIND = 'pokedex-game-team';
const REPLAY_KIND = 'pokedex-game-replay';
export const SHARE_CODE_VERSION = 1;

interface ShareEnvelope<K extends string, T> {
    kind: K;
    version: number;
    data: T;
}

const encode = <K extends string, T>(kind: K, data: T): string =>
    compressToEncodedURIComponent(JSON.stringify({ kind, version: SHARE_CODE_VERSION, data }));

const decode = (code: string): { kind: string; version: number; data: unknown } => {
    const json = decompressFromEncodedURIComponent(code.trim());
    if (!json) throw new Error('That doesn\'t look like a share code.');
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('That doesn\'t look like a share code.');
    }
    const envelope = parsed as ShareEnvelope<string, unknown>;
    if (typeof envelope?.kind !== 'string' || typeof envelope.version !== 'number' || !('data' in envelope)) {
        throw new Error('That doesn\'t look like a share code.');
    }
    if (envelope.version > SHARE_CODE_VERSION) {
        throw new Error('This code was made by a newer version of the game — update first.');
    }
    return envelope;
};

const isPokemonLike = (p: unknown): p is Pokemon => {
    const mon = p as Pokemon;
    return Boolean(mon && typeof mon.id === 'number' && typeof mon.name === 'string' && Array.isArray(mon.stats) && Array.isArray(mon.types));
};

export const encodeTeamCode = (team: Team): string => encode(TEAM_KIND, team);

export const decodeTeamCode = (code: string): Team => {
    const envelope = decode(code);
    if (envelope.kind !== TEAM_KIND) {
        throw new Error(envelope.kind === REPLAY_KIND
            ? 'That\'s a replay code — import it from the Trainer tab.'
            : 'That\'s not a team code.');
    }
    const team = envelope.data as Team;
    if (typeof team?.name !== 'string' || !Array.isArray(team.pokemon) || team.pokemon.length === 0 || !team.pokemon.every(isPokemonLike)) {
        throw new Error('This team code is damaged.');
    }
    return team;
};

export const encodeReplayCode = (replay: BattleReplay): string => encode(REPLAY_KIND, replay);

export const decodeReplayCode = (code: string): BattleReplay => {
    const envelope = decode(code);
    if (envelope.kind !== REPLAY_KIND) {
        throw new Error(envelope.kind === TEAM_KIND
            ? 'That\'s a team code — import it in the Team Builder.'
            : 'That\'s not a replay code.');
    }
    const replay = envelope.data as BattleReplay;
    if (!canPlayReplay(replay)) {
        throw new Error('This replay code is damaged or from an incompatible version.');
    }
    return replay;
};

/**
 * Copy to clipboard; false when the API is unavailable/denied (callers
 * show the code in a dialog for manual copy instead).
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};
