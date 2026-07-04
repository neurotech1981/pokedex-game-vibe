export type StatusType = 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze' | 'confusion';

export type BoostableStat = 'attack' | 'defense' | 'speed';

export type DamageClass = 'physical' | 'special' | 'status';

export interface Move {
    name: string;
    type: string;
    power: number;
    accuracy: number;
    energyCost: number;
    /** Physical/special/status split; omitted → derived from type (Gen 1-3 rules). */
    damageClass?: DamageClass;
    statusEffect?: {
        type: StatusType;
        chance: number;
    };
    comboMove?: {
        name: string;
        type: string;
        power: number;
        chance: number;
    };
    specialEffect?: {
        type: 'heal' | 'boost' | 'weather' | 'terrain';
        /** For 'heal': percent of max HP. For 'boost': stat stages (+/-). */
        value: number;
        chance: number;
        /** Which stat a 'boost' effect raises (default: attack). */
        stat?: BoostableStat;
    };
}

// Gen 1-3 rules: the damage class is a property of the move's TYPE
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'ground', 'rock', 'bug', 'ghost', 'poison', 'steel']);

export const getDamageClass = (move: Move): DamageClass => {
    if (move.damageClass) return move.damageClass;
    if (move.power <= 0) return 'status';
    return PHYSICAL_TYPES.has(move.type) ? 'physical' : 'special';
};

export const STRUGGLE: Move = { name: 'Struggle', type: 'normal', power: 35, accuracy: 1, energyCost: 0, damageClass: 'physical' };

export const MOVES: { [key: string]: Move[] } = {
    electric: [
        { name: 'Thunder Wave', type: 'electric', power: 0, accuracy: 0.9, energyCost: 20, statusEffect: { type: 'paralysis', chance: 1 } },
        { name: 'Thunder', type: 'electric', power: 110, accuracy: 0.7, energyCost: 30, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 1, energyCost: 15, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 1, energyCost: 25, comboMove: { name: 'Thunder', type: 'electric', power: 110, chance: 0.3 } },
    ],
    fire: [
        { name: 'Fire Blast', type: 'fire', power: 110, accuracy: 0.85, energyCost: 30, statusEffect: { type: 'burn', chance: 0.3 } },
        { name: 'Will-O-Wisp', type: 'fire', power: 0, accuracy: 0.85, energyCost: 20, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Flamethrower', type: 'fire', power: 90, accuracy: 1, energyCost: 25, statusEffect: { type: 'burn', chance: 0.1 } },
        { name: 'Sunny Day', type: 'fire', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    water: [
        { name: 'Hydro Pump', type: 'water', power: 110, accuracy: 0.8, energyCost: 30 },
        { name: 'Water Gun', type: 'water', power: 40, accuracy: 1, energyCost: 15 },
        { name: 'Bubble Beam', type: 'water', power: 65, accuracy: 1, energyCost: 20, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Rain Dance', type: 'water', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    grass: [
        { name: 'Solar Beam', type: 'grass', power: 120, accuracy: 1, energyCost: 40 },
        { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 1, energyCost: 15 },
        { name: 'Sleep Powder', type: 'grass', power: 0, accuracy: 0.75, energyCost: 10, statusEffect: { type: 'sleep', chance: 1 } },
        { name: 'Synthesis', type: 'grass', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    ice: [
        { name: 'Ice Beam', type: 'ice', power: 90, accuracy: 1, energyCost: 25, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Blizzard', type: 'ice', power: 110, accuracy: 0.7, energyCost: 30, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Ice Punch', type: 'ice', power: 75, accuracy: 1, energyCost: 20, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Hail', type: 'ice', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    poison: [
        { name: 'Toxic', type: 'poison', power: 0, accuracy: 0.9, energyCost: 20, statusEffect: { type: 'poison', chance: 1 } },
        { name: 'Sludge Bomb', type: 'poison', power: 90, accuracy: 1, energyCost: 25, statusEffect: { type: 'poison', chance: 0.3 } },
        { name: 'Poison Powder', type: 'poison', power: 0, accuracy: 0.75, energyCost: 10, statusEffect: { type: 'poison', chance: 1 } },
        { name: 'Venom Drench', type: 'poison', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'terrain', value: 0.5, chance: 1 } },
    ],
    normal: [
        { name: 'Body Slam', type: 'normal', power: 85, accuracy: 1, energyCost: 25, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Hyper Beam', type: 'normal', power: 150, accuracy: 0.9, energyCost: 50 },
        { name: 'Sing', type: 'normal', power: 0, accuracy: 0.55, energyCost: 15, statusEffect: { type: 'sleep', chance: 1 } },
        { name: 'Recover', type: 'normal', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    psychic: [
        { name: 'Hypnosis', type: 'psychic', power: 0, accuracy: 0.6, energyCost: 15, statusEffect: { type: 'sleep', chance: 1 } },
        { name: 'Confuse Ray', type: 'psychic', power: 0, accuracy: 1, energyCost: 15, statusEffect: { type: 'confusion', chance: 1 } },
        { name: 'Psychic', type: 'psychic', power: 90, accuracy: 1, energyCost: 25 },
        { name: 'Calm Mind', type: 'psychic', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'boost', value: 1, chance: 1, stat: 'attack' } },
    ],
    ghost: [
        { name: 'Shadow Sneak', type: 'ghost', power: 40, accuracy: 1, energyCost: 15 },
        { name: 'Night Shade', type: 'ghost', power: 100, accuracy: 1, energyCost: 30 },
        { name: 'Shadow Ball', type: 'ghost', power: 80, accuracy: 1, energyCost: 25, specialEffect: { type: 'boost', value: 1, chance: 0.3, stat: 'attack' } },
        { name: 'Curse', type: 'ghost', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'terrain', value: 0.5, chance: 1 } },
    ],
    fighting: [
        { name: 'Close Combat', type: 'fighting', power: 120, accuracy: 1, energyCost: 35 },
        { name: 'Brick Break', type: 'fighting', power: 75, accuracy: 1, energyCost: 20 },
        { name: 'Mach Punch', type: 'fighting', power: 40, accuracy: 1, energyCost: 10 },
        { name: 'Bulk Up', type: 'fighting', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'boost', value: 1, chance: 1, stat: 'attack' } },
    ],
    ground: [
        { name: 'Earthquake', type: 'ground', power: 100, accuracy: 1, energyCost: 30 },
        { name: 'Dig', type: 'ground', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Mud Shot', type: 'ground', power: 55, accuracy: 0.95, energyCost: 15 },
        { name: 'Sand Attack', type: 'ground', power: 0, accuracy: 1, energyCost: 10, specialEffect: { type: 'weather', value: 1.2, chance: 1 } },
    ],
    flying: [
        { name: 'Brave Bird', type: 'flying', power: 120, accuracy: 1, energyCost: 35 },
        { name: 'Air Slash', type: 'flying', power: 75, accuracy: 0.95, energyCost: 20 },
        { name: 'Wing Attack', type: 'flying', power: 60, accuracy: 1, energyCost: 15 },
        { name: 'Roost', type: 'flying', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    bug: [
        { name: 'Megahorn', type: 'bug', power: 120, accuracy: 0.85, energyCost: 35 },
        { name: 'X-Scissor', type: 'bug', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Bug Bite', type: 'bug', power: 60, accuracy: 1, energyCost: 15 },
        { name: 'String Shot', type: 'bug', power: 0, accuracy: 0.95, energyCost: 10, statusEffect: { type: 'paralysis', chance: 0.5 } },
    ],
    rock: [
        { name: 'Stone Edge', type: 'rock', power: 100, accuracy: 0.8, energyCost: 30 },
        { name: 'Rock Slide', type: 'rock', power: 75, accuracy: 0.9, energyCost: 20 },
        { name: 'Rock Throw', type: 'rock', power: 50, accuracy: 0.9, energyCost: 15 },
        { name: 'Sandstorm', type: 'rock', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'weather', value: 1.2, chance: 1 } },
    ],
    dragon: [
        { name: 'Outrage', type: 'dragon', power: 120, accuracy: 1, energyCost: 35 },
        { name: 'Dragon Claw', type: 'dragon', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Dragon Breath', type: 'dragon', power: 60, accuracy: 1, energyCost: 15, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Dragon Dance', type: 'dragon', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'boost', value: 1, chance: 1, stat: 'speed' } },
    ],
    dark: [
        { name: 'Crunch', type: 'dark', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Dark Pulse', type: 'dark', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Bite', type: 'dark', power: 60, accuracy: 1, energyCost: 15 },
        { name: 'Nasty Plot', type: 'dark', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'boost', value: 2, chance: 1, stat: 'attack' } },
    ],
    steel: [
        { name: 'Iron Tail', type: 'steel', power: 100, accuracy: 0.75, energyCost: 30 },
        { name: 'Iron Head', type: 'steel', power: 80, accuracy: 1, energyCost: 25 },
        { name: 'Metal Claw', type: 'steel', power: 50, accuracy: 0.95, energyCost: 15 },
        { name: 'Iron Defense', type: 'steel', power: 0, accuracy: 1, energyCost: 20, specialEffect: { type: 'boost', value: 2, chance: 1, stat: 'defense' } },
    ],
    fairy: [
        // fairy postdates the Gen-3 type split — annotate explicitly
        { name: 'Moonblast', type: 'fairy', power: 95, accuracy: 1, energyCost: 30, damageClass: 'special' },
        { name: 'Play Rough', type: 'fairy', power: 90, accuracy: 0.9, energyCost: 25, damageClass: 'physical' },
        { name: 'Dazzling Gleam', type: 'fairy', power: 80, accuracy: 1, energyCost: 25, damageClass: 'special' },
        { name: 'Misty Terrain', type: 'fairy', power: 0, accuracy: 1, energyCost: 15, specialEffect: { type: 'terrain', value: 0.8, chance: 1 } },
    ],
};

export const getMovesForTypes = (types: string[]): Move[] => {
    const seen = new Set<string>();
    const moves: Move[] = [];
    for (const type of types) {
        for (const move of MOVES[type] || []) {
            if (!seen.has(move.name)) {
                seen.add(move.name);
                moves.push(move);
            }
        }
    }
    if (moves.length === 0) {
        moves.push({ name: 'Tackle', type: 'normal', power: 40, accuracy: 1, energyCost: 15 });
    }
    return moves;
};
