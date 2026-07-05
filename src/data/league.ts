import type { Pokemon } from '../types/pokemon';
import type { HeldItemId } from './items';
import type { BackgroundId } from './battleBackgrounds';
import type { AIDifficulty, AIPersonality } from '../utils/battleAI';
import { fetchPokemonById } from '../utils/evolution';

/**
 * The Kanto League Challenge: 8 Gym Leaders → Elite Four → Champion,
 * fought in strict order. Pure data + helpers; the roster is fetched
 * from PokeAPI on demand (cached per stage).
 */

export const LEAGUE_XP_MULTIPLIER = 2;
export const REMATCH_XP_MULTIPLIER = 2.5;
/** Round-2 rematches are fought this many levels above the normal stage level. */
export const REMATCH_LEVEL_BONUS = 15;

export interface LeagueBadge {
    name: string;
    emoji: string;
    color: string;
}

export interface LeagueTeamEntry {
    speciesId: number;
    levelOffset: number;
    heldItem?: HeldItemId;
}

export interface LeagueStage {
    id: string;
    kind: 'gym' | 'elite4' | 'champion';
    name: string;
    title: string;
    /** Filename stem under public/assets/trainers/ */
    portrait: string;
    typeTheme: string;
    team: LeagueTeamEntry[];
    backdropId: BackgroundId;
    levelFloor: number;
    difficulty: AIDifficulty;
    personality: AIPersonality;
    badge?: LeagueBadge;
}

const mons = (...entries: Array<[number, number?, HeldItemId?]>): LeagueTeamEntry[] =>
    entries.map(([speciesId, levelOffset = 0, heldItem]) => ({ speciesId, levelOffset, heldItem }));

export const LEAGUE_STAGES: LeagueStage[] = [
    {
        id: 'brock', kind: 'gym', name: 'Brock', title: 'Pewter Gym Leader', portrait: 'brock',
        typeTheme: 'rock', backdropId: 'earthycave', levelFloor: 52, difficulty: 'intermediate', personality: 'defensive',
        team: mons([74], [95, 2]),
        badge: { name: 'Boulder Badge', emoji: '🪨', color: '#8d6e63' },
    },
    {
        id: 'misty', kind: 'gym', name: 'Misty', title: 'Cerulean Gym Leader', portrait: 'misty',
        typeTheme: 'water', backdropId: 'deepsea', levelFloor: 54, difficulty: 'intermediate', personality: 'balanced',
        team: mons([120], [121, 2]),
        badge: { name: 'Cascade Badge', emoji: '💧', color: '#4fc3f7' },
    },
    {
        id: 'ltsurge', kind: 'gym', name: 'Lt. Surge', title: 'Vermilion Gym Leader', portrait: 'ltsurge',
        typeTheme: 'electric', backdropId: 'city', levelFloor: 56, difficulty: 'intermediate', personality: 'aggressive',
        team: mons([100], [25], [26, 2]),
        badge: { name: 'Thunder Badge', emoji: '⚡', color: '#ffd54f' },
    },
    {
        id: 'erika', kind: 'gym', name: 'Erika', title: 'Celadon Gym Leader', portrait: 'erika',
        typeTheme: 'grass', backdropId: 'forest', levelFloor: 58, difficulty: 'expert', personality: 'defensive',
        team: mons([71], [114], [45, 2]),
        badge: { name: 'Rainbow Badge', emoji: '🌸', color: '#81c784' },
    },
    {
        id: 'koga', kind: 'gym', name: 'Koga', title: 'Fuchsia Gym Leader', portrait: 'koga',
        typeTheme: 'poison', backdropId: 'dampcave', levelFloor: 60, difficulty: 'expert', personality: 'defensive',
        team: mons([109], [89], [42], [110, 2]),
        badge: { name: 'Soul Badge', emoji: '💀', color: '#ba68c8' },
    },
    {
        id: 'sabrina', kind: 'gym', name: 'Sabrina', title: 'Saffron Gym Leader', portrait: 'sabrina',
        typeTheme: 'psychic', backdropId: 'skypillar', levelFloor: 62, difficulty: 'expert', personality: 'balanced',
        team: mons([64], [122], [49], [65, 2]),
        badge: { name: 'Marsh Badge', emoji: '🔮', color: '#f06292' },
    },
    {
        id: 'blaine', kind: 'gym', name: 'Blaine', title: 'Cinnabar Gym Leader', portrait: 'blaine',
        typeTheme: 'fire', backdropId: 'desert', levelFloor: 64, difficulty: 'expert', personality: 'aggressive',
        team: mons([58], [77], [78], [59, 2]),
        badge: { name: 'Volcano Badge', emoji: '🔥', color: '#ff8a65' },
    },
    {
        id: 'giovanni', kind: 'gym', name: 'Giovanni', title: 'Viridian Gym Leader', portrait: 'giovanni',
        typeTheme: 'ground', backdropId: 'darkmeadow', levelFloor: 66, difficulty: 'expert', personality: 'aggressive',
        team: mons([111], [51], [31], [34, 1], [112, 2]),
        badge: { name: 'Earth Badge', emoji: '🌍', color: '#a1887f' },
    },
    {
        id: 'lorelei', kind: 'elite4', name: 'Lorelei', title: 'Elite Four', portrait: 'lorelei-lgpe',
        typeTheme: 'ice', backdropId: 'elite4drake', levelFloor: 70, difficulty: 'expert', personality: 'defensive',
        team: mons([87], [91], [80], [124], [131, 2, 'mysticWater']),
    },
    {
        id: 'bruno', kind: 'elite4', name: 'Bruno', title: 'Elite Four', portrait: 'bruno',
        typeTheme: 'fighting', backdropId: 'elite4drake', levelFloor: 72, difficulty: 'expert', personality: 'aggressive',
        team: mons([95], [107], [106], [57], [68, 2, 'focusSash']),
    },
    {
        id: 'agatha', kind: 'elite4', name: 'Agatha', title: 'Elite Four', portrait: 'agatha-lgpe',
        typeTheme: 'ghost', backdropId: 'elite4drake', levelFloor: 74, difficulty: 'expert', personality: 'defensive',
        team: mons([93], [42], [24], [110], [94, 2, 'quickClaw']),
    },
    {
        id: 'lance', kind: 'elite4', name: 'Lance', title: 'Elite Four', portrait: 'lance',
        typeTheme: 'dragon', backdropId: 'elite4drake', levelFloor: 76, difficulty: 'expert', personality: 'aggressive',
        team: mons([130], [148], [142], [6], [149, 2, 'leftovers']),
    },
    {
        id: 'champion', kind: 'champion', name: 'Blue', title: 'Kanto Champion', portrait: 'blue',
        typeTheme: 'mixed', backdropId: 'elite4drake', levelFloor: 80, difficulty: 'expert', personality: 'balanced',
        team: mons([18], [65, 0, 'quickClaw'], [112], [59, 0, 'charcoal'], [103], [9, 2, 'leftovers']),
    },
];

const KIND_LEVEL_OFFSET: Record<LeagueStage['kind'], number> = { gym: 1, elite4: 3, champion: 5 };

export const GYM_STAGES = LEAGUE_STAGES.filter(s => s.kind === 'gym');

export const getLeagueStage = (id: string): LeagueStage | undefined =>
    LEAGUE_STAGES.find(s => s.id === id);

/** Strict linear progression: each stage requires everything before it. */
export const isStageUnlocked = (id: string, defeated: string[]): boolean => {
    const index = LEAGUE_STAGES.findIndex(s => s.id === id);
    if (index < 0) return false;
    return LEAGUE_STAGES.slice(0, index).every(s => defeated.includes(s.id));
};

/** The next stage still standing, or null when the league is conquered. */
export const nextLeagueStage = (defeated: string[]): LeagueStage | null =>
    LEAGUE_STAGES.find(s => !defeated.includes(s.id)) ?? null;

/** Opponent level: never below the stage floor, scales with the player. */
export const leagueStageLevel = (stage: LeagueStage, playerAvgLevel: number): number =>
    Math.min(100, Math.max(stage.levelFloor, playerAvgLevel + KIND_LEVEL_OFFSET[stage.kind]));

export const trainerPortraitUrl = (portrait: string): string =>
    `${import.meta.env.BASE_URL}assets/trainers/${portrait}.png`;

// Roster fetch, cached per stage (each mon = 2 PokeAPI calls via fetchPokemonById)
const rosterCache = new Map<string, Promise<Pokemon[]>>();

export const fetchLeagueTeam = (stage: LeagueStage): Promise<Pokemon[]> => {
    let cached = rosterCache.get(stage.id);
    if (!cached) {
        cached = Promise.all(stage.team.map(entry => fetchPokemonById(entry.speciesId))).catch(err => {
            rosterCache.delete(stage.id); // allow retry
            throw err;
        });
        rosterCache.set(stage.id, cached);
    }
    return cached;
};
