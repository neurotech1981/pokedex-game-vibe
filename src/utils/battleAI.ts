import { Pokemon, Move, BattleState } from '../types/pokemon';

// Define AI difficulty levels
export type AIDifficulty = 'beginner' | 'intermediate' | 'expert';

// Define AI personality types
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced';

// Define type effectiveness interface
interface TypeEffectiveness {
    [key: string]: {
        superEffective: string[];
        notVeryEffective: string[];
        noEffect: string[];
    };
}

// Helper function to calculate move effectiveness
const calculateMoveEffectiveness = (moveType: string, targetTypes: string[], typeEffectiveness: TypeEffectiveness): number => {
    let effectiveness = 1;
    targetTypes.forEach(targetType => {
        if (typeEffectiveness[moveType].superEffective.includes(targetType)) {
            effectiveness *= 2;
        } else if (typeEffectiveness[moveType].notVeryEffective.includes(targetType)) {
            effectiveness *= 0.5;
        } else if (typeEffectiveness[moveType].noEffect.includes(targetType)) {
            effectiveness *= 0;
        }
    });
    return effectiveness;
};

// Helper function to calculate potential damage
const calculatePotentialDamage = (
    attacker: Pokemon,
    defender: Pokemon,
    move: Move,
    typeEffectiveness: TypeEffectiveness
): number => {
    const attackStat = attacker.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
    const defenseStat = defender.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
    const effectiveness = calculateMoveEffectiveness(move.type, defender.types, typeEffectiveness);
    const hasSTAB = attacker.types.includes(move.type);

    let damage = (move.power * (attackStat / defenseStat)) / 2;
    damage *= effectiveness;
    if (hasSTAB) damage *= 1.5;

    return Math.round(damage);
};

// Helper function to evaluate a move
const evaluateMove = (
    move: Move,
    attacker: Pokemon,
    defender: Pokemon,
    battleState: BattleState,
    typeEffectiveness: TypeEffectiveness,
    personality: AIPersonality
): number => {
    let score = 0;

    // Base score on potential damage
    const potentialDamage = calculatePotentialDamage(attacker, defender, move, typeEffectiveness);
    score += potentialDamage * (personality === 'aggressive' ? 1.5 : 1);

    // Consider status effects
    if (move.statusEffect) {
        const statusScore = move.statusEffect.chance * 50;
        score += statusScore * (personality === 'defensive' ? 1.5 : 1);
    }

    // Consider healing moves
    if (move.specialEffect?.type === 'heal') {
        const healScore = move.specialEffect.value * 2;
        score += healScore * (personality === 'defensive' ? 1.5 : 1);
    }

    // Consider weather/terrain effects
    if (move.specialEffect?.type === 'weather' || move.specialEffect?.type === 'terrain') {
        score += 30;
    }

    // Consider stat boosts
    if (move.specialEffect?.type === 'boost') {
        score += 40;
    }

    // Penalize low accuracy moves
    if (move.accuracy && move.accuracy < 0.8) {
        score *= move.accuracy;
    }

    // Consider opponent's health
    const defenderHealth = battleState.currentTurn === 1
        ? battleState.team2Health[defender.id]
        : battleState.team1Health[defender.id];

    if (defenderHealth < 30) {
        score *= 1.2; // Boost score when opponent is low on health
    }

    return score;
};

// Main AI function to select the best move
export const selectAIMove = (
    battleState: BattleState,
    typeEffectiveness: TypeEffectiveness,
    difficulty: AIDifficulty = 'intermediate',
    personality: AIPersonality = 'balanced'
): Move => {
    // Validate battle state
    if (!battleState) {
        throw new Error('Invalid battle state: battle state is null or undefined');
    }

    const aiPokemon = battleState.currentTurn === 2 ? battleState.team2Pokemon : battleState.team1Pokemon;
    const opponentPokemon = battleState.currentTurn === 2 ? battleState.team1Pokemon : battleState.team2Pokemon;

    if (!aiPokemon) {
        throw new Error('Invalid battle state: AI Pokémon is missing');
    }

    if (!opponentPokemon) {
        throw new Error('Invalid battle state: Opponent Pokémon is missing');
    }

    // Get available moves for the AI's Pokémon
    const availableMoves = aiPokemon.types.flatMap(type => {
        const moves = MOVES[type] || [];
        return moves.map(move => ({
            ...move,
            type,
            power: move.power || 40, // Default power if not specified
            accuracy: move.accuracy || 1 // Default accuracy if not specified
        }));
    });

    // If no moves available, use a default move
    if (availableMoves.length === 0) {
        console.warn('No moves available for AI Pokémon, using default move');
        return { name: 'Tackle', type: 'normal', power: 40 };
    }

    // Evaluate each move
    const moveScores = availableMoves.map(move => ({
        move,
        score: evaluateMove(move, aiPokemon, opponentPokemon, battleState, typeEffectiveness, personality)
    }));

    // Sort moves by score
    moveScores.sort((a, b) => b.score - a.score);

    // Apply difficulty-based randomization
    const randomizationFactor = {
        beginner: 0.3,
        intermediate: 0.1,
        expert: 0
    }[difficulty];

    // Select move based on difficulty
    if (Math.random() < randomizationFactor) {
        // Randomly select from top 3 moves
        const topMoves = moveScores.slice(0, 3);
        return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    } else {
        // Select the best move
        return moveScores[0].move;
    }
};

// Define moves for each type
const MOVES: { [key: string]: Move[] } = {
    electric: [
        { name: 'Thunder Wave', type: 'electric', power: 0, statusEffect: { type: 'paralysis', chance: 1 } },
        { name: 'Thunder', type: 'electric', power: 110, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Thunder Shock', type: 'electric', power: 40, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Thunderbolt', type: 'electric', power: 90, comboMove: { name: 'Thunder', type: 'electric', power: 110, chance: 0.3 } },
    ],
    fire: [
        { name: 'Fire Blast', type: 'fire', power: 110, statusEffect: { type: 'burn', chance: 0.3 } },
        { name: 'Will-O-Wisp', type: 'fire', power: 0, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Flamethrower', type: 'fire', power: 90, statusEffect: { type: 'burn', chance: 0.1 } },
        { name: 'Fire Spin', type: 'fire', power: 35, specialEffect: { type: 'terrain', value: 0.5, chance: 0.5 } },
    ],
    water: [
        { name: 'Hydro Pump', type: 'water', power: 110 },
        { name: 'Water Gun', type: 'water', power: 40 },
        { name: 'Bubble Beam', type: 'water', power: 65, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Rain Dance', type: 'water', power: 0, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    grass: [
        { name: 'Solar Beam', type: 'grass', power: 120, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
        { name: 'Vine Whip', type: 'grass', power: 45 },
        { name: 'Sleep Powder', type: 'grass', power: 0, statusEffect: { type: 'sleep', chance: 0.75 } },
        { name: 'Synthesis', type: 'grass', power: 0, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    ice: [
        { name: 'Ice Beam', type: 'ice', power: 90, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Blizzard', type: 'ice', power: 110, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Ice Punch', type: 'ice', power: 75, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Hail', type: 'ice', power: 0, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    poison: [
        { name: 'Toxic', type: 'poison', power: 0, statusEffect: { type: 'poison', chance: 1 } },
        { name: 'Sludge Bomb', type: 'poison', power: 90, statusEffect: { type: 'poison', chance: 0.3 } },
        { name: 'Poison Powder', type: 'poison', power: 0, statusEffect: { type: 'poison', chance: 0.75 } },
        { name: 'Venom Drench', type: 'poison', power: 0, specialEffect: { type: 'terrain', value: 0.5, chance: 0.5 } },
    ],
    normal: [
        { name: 'Body Slam', type: 'normal', power: 85, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Hypnosis', type: 'normal', power: 0, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Sing', type: 'normal', power: 0, statusEffect: { type: 'sleep', chance: 0.55 } },
        { name: 'Recover', type: 'normal', power: 0, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    psychic: [
        { name: 'Hypnosis', type: 'psychic', power: 0, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Confuse Ray', type: 'psychic', power: 0, statusEffect: { type: 'paralysis', chance: 0.5 } },
        { name: 'Psychic', type: 'psychic', power: 90, specialEffect: { type: 'boost', value: 1.5, chance: 0.3 } },
        { name: 'Calm Mind', type: 'psychic', power: 0, specialEffect: { type: 'boost', value: 1.5, chance: 1 } },
    ],
    ghost: [
        { name: 'Will-O-Wisp', type: 'ghost', power: 0, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Night Shade', type: 'ghost', power: 100, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Shadow Ball', type: 'ghost', power: 80, specialEffect: { type: 'boost', value: 1.5, chance: 0.3 } },
        { name: 'Curse', type: 'ghost', power: 0, specialEffect: { type: 'terrain', value: 0.5, chance: 1 } },
    ],
};