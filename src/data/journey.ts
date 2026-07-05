import type { AIDifficulty, AIPersonality } from '../utils/battleAI';
import type { LeagueProgress } from '../utils/progression';

/**
 * The Kanto Journey: a linear adventure path from Pallet Town to the Indigo
 * Plateau. Route nodes offer wild encounters (via safari biomes) and trainer
 * battles; town nodes host the gyms (via the league ladder). Pure data +
 * helpers — battle launching and persistence live in the UI/hooks.
 */

export interface JourneyTrainer {
    id: string;
    name: string;
    title: string;
    /** National dex ids; levels come from the node floor. */
    speciesIds: number[];
    difficulty: AIDifficulty;
    personality: AIPersonality;
}

export interface JourneyNode {
    id: string;
    name: string;
    kind: 'town' | 'route' | 'landmark';
    emoji: string;
    description: string;
    /** Safari biome id for wild encounters (undefined = no wild grass here). */
    biomeId?: string;
    trainers: JourneyTrainer[];
    /** League stage ids hosted here (gym towns: one; Indigo Plateau: E4 + champion). */
    gymIds: string[];
    /** Minimum opponent level at this node (scales up with the player). */
    levelFloor: number;
}

const trainer = (
    id: string, name: string, title: string, speciesIds: number[],
    difficulty: AIDifficulty = 'beginner', personality: AIPersonality = 'balanced'
): JourneyTrainer => ({ id, name, title, speciesIds, difficulty, personality });

export const JOURNEY_NODES: JourneyNode[] = [
    {
        id: 'pallet-town', name: 'Pallet Town', kind: 'town', emoji: '🏡',
        description: 'A quiet town of beginnings. Professor Oak\'s lab hums with new Pokédexes.',
        trainers: [], gymIds: [], levelFloor: 5,
    },
    {
        id: 'route-1', name: 'Route 1', kind: 'route', emoji: '🌾',
        description: 'A gentle dirt road north. Wild Pidgey and Rattata rustle in the tall grass.',
        biomeId: 'meadow',
        trainers: [
            trainer('r1-joey', 'Joey', 'Youngster', [19]),
            trainer('r1-janice', 'Janice', 'Lass', [16, 19]),
        ],
        gymIds: [], levelFloor: 5,
    },
    {
        id: 'viridian-city', name: 'Viridian City', kind: 'town', emoji: '🌇',
        description: 'The eternally green city. Its gym stands locked and silent... for now.',
        biomeId: 'outskirts',
        trainers: [trainer('vc-sammy', 'Sammy', 'School Kid', [16, 10])],
        gymIds: [], levelFloor: 7,
    },
    {
        id: 'viridian-forest', name: 'Viridian Forest', kind: 'landmark', emoji: '🌲',
        description: 'A maze of trees buzzing with bugs. Watch out for poison stingers.',
        biomeId: 'forest',
        trainers: [
            trainer('vf-rick', 'Rick', 'Bug Catcher', [10, 13]),
            trainer('vf-doug', 'Doug', 'Bug Catcher', [13, 14]),
            trainer('vf-samurai', 'Samurai', 'Bug Maniac', [15], 'beginner', 'aggressive'),
        ],
        gymIds: [], levelFloor: 9,
    },
    {
        id: 'pewter-city', name: 'Pewter City', kind: 'town', emoji: '🪨',
        description: 'A stone-grey city between rugged mountains. Brock guards the Boulder Badge.',
        trainers: [trainer('pc-liam', 'Liam', 'Camper', [27, 74])],
        gymIds: ['brock'], levelFloor: 12,
    },
    {
        id: 'route-3', name: 'Route 3', kind: 'route', emoji: '⛰️',
        description: 'A rocky mountain pass full of chatty trainers itching for a fight.',
        biomeId: 'meadow',
        trainers: [
            trainer('r3-colton', 'Colton', 'Youngster', [21, 19]),
            trainer('r3-greta', 'Greta', 'Lass', [29, 32]),
        ],
        gymIds: [], levelFloor: 14,
    },
    {
        id: 'mt-moon', name: 'Mt. Moon', kind: 'landmark', emoji: '🌙',
        description: 'A cavern soaked in moonstone light. Zubat swarm in the dark.',
        biomeId: 'cavern',
        trainers: [
            trainer('mm-kent', 'Kent', 'Super Nerd', [88, 109]),
            trainer('mm-harry', 'Harry', 'Hiker', [74, 95], 'intermediate'),
        ],
        gymIds: [], levelFloor: 16,
    },
    {
        id: 'cerulean-city', name: 'Cerulean City', kind: 'town', emoji: '💧',
        description: 'A city of flowing water and bridges. Misty\'s gym gleams like a pool.',
        trainers: [trainer('cc-marina', 'Marina', 'Swimmer', [118, 120])],
        gymIds: ['misty'], levelFloor: 18,
    },
    {
        id: 'route-24', name: 'Route 24', kind: 'route', emoji: '🌉',
        description: 'The Nugget Bridge and flower-lined coast north of Cerulean.',
        biomeId: 'coast',
        trainers: [
            trainer('r24-ethan', 'Ethan', 'Camper', [56, 66]),
            trainer('r24-flora', 'Flora', 'Picnicker', [43, 69]),
        ],
        gymIds: [], levelFloor: 20,
    },
    {
        id: 'vermilion-city', name: 'Vermilion City', kind: 'town', emoji: '⚓',
        description: 'A bustling port town. Lt. Surge\'s gym crackles behind electric locks.',
        biomeId: 'outskirts',
        trainers: [
            trainer('vm-gentleman', 'Tucker', 'Gentleman', [58, 25]),
            trainer('vm-sailor', 'Dwayne', 'Sailor', [66, 90], 'intermediate'),
        ],
        gymIds: ['ltsurge'], levelFloor: 23,
    },
    {
        id: 'rock-tunnel', name: 'Rock Tunnel', kind: 'landmark', emoji: '🕳️',
        description: 'A pitch-black tunnel through the mountain. Every step echoes.',
        biomeId: 'cavern',
        trainers: [
            trainer('rt-lenny', 'Lenny', 'Hiker', [66, 74, 95], 'intermediate'),
            trainer('rt-dana', 'Dana', 'PokéManiac', [104, 111], 'intermediate'),
        ],
        gymIds: [], levelFloor: 26,
    },
    {
        id: 'lavender-town', name: 'Lavender Town', kind: 'town', emoji: '👻',
        description: 'A hushed town beneath the Pokémon Tower. The air prickles with spirits.',
        biomeId: 'skyruins',
        trainers: [
            trainer('lt-hope', 'Hope', 'Channeler', [92, 92], 'intermediate', 'defensive'),
            trainer('lt-carly', 'Carly', 'Channeler', [93], 'intermediate', 'aggressive'),
        ],
        gymIds: [], levelFloor: 28,
    },
    {
        id: 'celadon-city', name: 'Celadon City', kind: 'town', emoji: '🌸',
        description: 'The grandest city in Kanto, perfumed by Erika\'s rooftop garden.',
        trainers: [
            trainer('cd-beauty', 'Bridget', 'Beauty', [114, 44], 'intermediate'),
            trainer('cd-rocker', 'Luca', 'Rocker', [100, 25], 'intermediate'),
        ],
        gymIds: ['erika'], levelFloor: 30,
    },
    {
        id: 'fuchsia-city', name: 'Fuchsia City', kind: 'town', emoji: '🏯',
        description: 'An old ninja town beside the Safari Zone. Koga\'s gym drips with toxins.',
        biomeId: 'meadow',
        trainers: [
            trainer('fc-juggler', 'Kirk', 'Juggler', [96, 97], 'intermediate'),
            trainer('fc-tamer', 'Vince', 'Tamer', [23, 24], 'intermediate', 'aggressive'),
        ],
        gymIds: ['koga'], levelFloor: 34,
    },
    {
        id: 'saffron-city', name: 'Saffron City', kind: 'town', emoji: '🔮',
        description: 'Kanto\'s heart, shadowed by Silph Co. Sabrina bends spoons and minds.',
        trainers: [
            trainer('sf-psychic', 'Preston', 'Psychic', [64, 79], 'intermediate', 'defensive'),
            trainer('sf-fighter', 'Kiyo', 'Black Belt', [66, 67], 'intermediate', 'aggressive'),
        ],
        gymIds: ['sabrina'], levelFloor: 38,
    },
    {
        id: 'seafoam-islands', name: 'Seafoam Islands', kind: 'landmark', emoji: '🧊',
        description: 'Twin islets carved by icy currents. Something legendary sleeps below.',
        biomeId: 'coast',
        trainers: [
            trainer('sfi-swimmer', 'Nora', 'Swimmer', [87, 91], 'intermediate'),
            trainer('sfi-bird', 'Falk', 'Bird Keeper', [22, 85], 'intermediate'),
        ],
        gymIds: [], levelFloor: 41,
    },
    {
        id: 'cinnabar-island', name: 'Cinnabar Island', kind: 'town', emoji: '🌋',
        description: 'A volcanic research island. Blaine\'s quiz-loving gym seethes with heat.',
        biomeId: 'sands',
        trainers: [
            trainer('ci-burglar', 'Quinn', 'Burglar', [58, 38], 'expert'),
            trainer('ci-scientist', 'Ted', 'Scientist', [89, 82], 'intermediate', 'defensive'),
        ],
        gymIds: ['blaine'], levelFloor: 44,
    },
    {
        id: 'viridian-gym', name: 'Viridian Gym', kind: 'landmark', emoji: '🌍',
        description: 'The locked gym finally opens — and its leader is Team Rocket\'s boss.',
        trainers: [trainer('vg-cooltrainer', 'Rex', 'Cooltrainer', [112, 59], 'expert', 'aggressive')],
        gymIds: ['giovanni'], levelFloor: 47,
    },
    {
        id: 'victory-road', name: 'Victory Road', kind: 'landmark', emoji: '🏔️',
        description: 'The final cavern gauntlet. Only badge-holders may pass.',
        biomeId: 'cavern',
        trainers: [
            trainer('vr-ace1', 'Naomi', 'Ace Trainer', [59, 130, 65], 'expert', 'aggressive'),
            trainer('vr-ace2', 'Silas', 'Ace Trainer', [112, 94, 149], 'expert', 'balanced'),
            trainer('vr-ace3', 'Vera', 'Ace Trainer', [131, 76, 143], 'expert', 'defensive'),
        ],
        gymIds: [], levelFloor: 49,
    },
    {
        id: 'indigo-plateau', name: 'Indigo Plateau', kind: 'landmark', emoji: '🏆',
        description: 'The summit of Kanto. The Elite Four and the Champion await.',
        trainers: [],
        gymIds: ['lorelei', 'bruno', 'agatha', 'lance', 'champion'],
        levelFloor: 50,
    },
];

export const getJourneyNode = (id: string): JourneyNode | undefined =>
    JOURNEY_NODES.find(n => n.id === id);

export const nextJourneyNode = (id: string): JourneyNode | null => {
    const idx = JOURNEY_NODES.findIndex(n => n.id === id);
    return idx >= 0 && idx < JOURNEY_NODES.length - 1 ? JOURNEY_NODES[idx + 1] : null;
};

export interface JourneyProgress {
    started: boolean;
    starterId?: number;
    position: string;
    clearedTrainers: string[];
}

/** All trainers beaten and every hosted gym stage defeated. */
export const isNodeComplete = (
    node: JourneyNode,
    journey: JourneyProgress,
    league: LeagueProgress
): boolean =>
    node.trainers.every(t => journey.clearedTrainers.includes(t.id)) &&
    node.gymIds.every(id => league.defeated.includes(id));

/** The next trainer at this node the player hasn't beaten yet. */
export const nextTrainerAt = (node: JourneyNode, journey: JourneyProgress): JourneyTrainer | null =>
    node.trainers.find(t => !journey.clearedTrainers.includes(t.id)) ?? null;

/** The next hosted gym stage not yet defeated (journey order == ladder order). */
export const nextGymIdAt = (node: JourneyNode, league: LeagueProgress): string | null =>
    node.gymIds.find(id => !league.defeated.includes(id)) ?? null;

/** Battle level at a node: its floor, or slightly under the player's average. */
export const journeyBattleLevel = (node: JourneyNode, playerAvgLevel: number): number =>
    Math.min(100, Math.max(node.levelFloor, playerAvgLevel - 2));

export const journeyNodeIndex = (id: string): number =>
    JOURNEY_NODES.findIndex(n => n.id === id);
