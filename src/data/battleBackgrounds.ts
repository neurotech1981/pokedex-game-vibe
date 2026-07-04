import type { Rng, WeatherType } from '../utils/battleEngine';
import type { TerrainType } from '../types/terrain';

/**
 * Battle backdrop scenes (gen-6 style battle backgrounds bundled from
 * Pokémon Showdown — fan-game assets, consistent with the project's use of
 * Pokémon sprites). Picked once per battle: weather/terrain choose a
 * fitting scene when relevant, gauntlet bosses get the Elite Four chamber,
 * otherwise a random scene from the default pool.
 */

export type BackgroundId =
    | 'meadow'
    | 'forest'
    | 'beach'
    | 'desert'
    | 'orasdesert'
    | 'city'
    | 'darkmeadow'
    | 'icecave'
    | 'dampcave'
    | 'earthycave'
    | 'deepsea'
    | 'skypillar'
    | 'elite4drake';

const FILES: Record<BackgroundId, string> = {
    meadow: 'bg-meadow.jpg',
    forest: 'bg-forest.jpg',
    beach: 'bg-beach.jpg',
    desert: 'bg-desert.jpg',
    orasdesert: 'bg-orasdesert.jpg',
    city: 'bg-city.jpg',
    darkmeadow: 'bg-darkmeadow.jpg',
    icecave: 'bg-icecave.jpg',
    dampcave: 'bg-dampcave.jpg',
    earthycave: 'bg-earthycave.jpg',
    deepsea: 'bg-deepsea.jpg',
    skypillar: 'bg-skypillar.jpg',
    elite4drake: 'bg-elite4drake.jpg',
};

const DEFAULT_POOL: BackgroundId[] = [
    'meadow',
    'forest',
    'beach',
    'city',
    'desert',
    'earthycave',
    'darkmeadow',
    'deepsea',
];

const pickFrom = (pool: BackgroundId[], rng: Rng): BackgroundId =>
    pool[Math.floor(rng() * pool.length)] ?? pool[0];

export interface BackgroundPickOptions {
    weather?: WeatherType;
    terrain?: TerrainType;
    isBoss?: boolean;
    rng?: Rng;
}

/** Choose the scene id for a battle (stable for the whole battle). */
export const pickBattleBackgroundId = (opts: BackgroundPickOptions = {}): BackgroundId => {
    const { weather = 'none', terrain = 'none', isBoss = false, rng = Math.random } = opts;

    if (isBoss) return 'elite4drake';

    switch (weather) {
        case 'sandstorm':
            return pickFrom(['desert', 'orasdesert'], rng);
        case 'hail':
            return 'icecave';
        case 'sunny':
            return pickFrom(['beach', 'meadow'], rng);
        default:
            break; // rain/none: terrain or pool decides
    }

    switch (terrain) {
        case 'grassy':
            return pickFrom(['forest', 'meadow'], rng);
        case 'psychic':
            return 'skypillar';
        case 'misty':
            return pickFrom(['dampcave', 'darkmeadow'], rng);
        case 'electric':
            return 'city';
        default:
            break;
    }

    return pickFrom(DEFAULT_POOL, rng);
};

/** Full asset URL for a scene id (GH Pages base-aware). */
export const backgroundUrl = (id: BackgroundId): string =>
    `${import.meta.env.BASE_URL}assets/backgrounds/${FILES[id]}`;
