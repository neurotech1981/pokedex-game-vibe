/**
 * Full-save export/import: bundles every localStorage key the game writes
 * into one downloadable JSON file, so a cleared browser can't wipe a save.
 * Pure functions with injectable storage for tests; the UI lives on the
 * Trainer Card.
 */

export const SAVE_KEYS = [
    'pokedexGame.profile.v1',
    'pokedexGame.movesets.v2',
    'pokedexGame.learnsets.v1',
    'pokedexGame.replays.v1',
    'pokemonTeams',
    'pokemonFavorites',
    'battleSimulator_team1',
    'battleSimulator_team2',
    'battleSpeed',
] as const;

export interface FullSave {
    kind: 'pokedex-game-save';
    version: 1;
    exportedAt: string;
    data: Partial<Record<string, string>>;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export const buildFullSave = (storage: ReadableStorage = localStorage): FullSave => {
    const data: Partial<Record<string, string>> = {};
    for (const key of SAVE_KEYS) {
        const value = storage.getItem(key);
        if (value !== null) data[key] = value;
    }
    return { kind: 'pokedex-game-save', version: 1, exportedAt: new Date().toISOString(), data };
};

/** Throws with a user-readable message on anything that isn't a valid save file. */
export const parseFullSave = (json: string): FullSave => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('That file is not valid JSON.');
    }
    const save = parsed as FullSave;
    if (save?.kind !== 'pokedex-game-save') throw new Error('That file is not a Pokédex save file.');
    if (save.version !== 1) throw new Error(`Unsupported save version (${String(save.version)}).`);
    if (typeof save.data !== 'object' || save.data === null) throw new Error('The save file has no data.');
    return save;
};

/** Writes only known keys; anything else in the file is ignored. */
export const applyFullSave = (save: FullSave, storage: WritableStorage = localStorage): void => {
    for (const key of SAVE_KEYS) {
        const value = save.data[key];
        if (typeof value === 'string') storage.setItem(key, value);
    }
};
