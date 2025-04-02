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

    // Consider energy costs and current energy
    const currentEnergy = battleState.energy?.[attacker.id]?.current ?? 100; // Default to max energy if not set

    if (currentEnergy < move.energyCost) {
        score *= 0.1; // Heavily penalize moves we can't use
    }

    // Consider status effects
    if (move.statusEffect) {
        const statusScore = move.statusEffect.chance * 50;
        // Boost score if opponent is already statused
        const defenderStatus = battleState.statusEffects[defender.id];
        if (!defenderStatus) {
            score += statusScore * (personality === 'defensive' ? 1.5 : 1);
        }
    }

    // Consider healing moves based on current health
    if (move.specialEffect?.type === 'heal') {
        const attackerHealth = battleState.currentTurn === 1
            ? battleState.team1Health[attacker.id]
            : battleState.team2Health[attacker.id];
        const maxHealth = attacker.stats.find(s => s.stat.name === 'hp')?.base_stat || 100;
        const healthPercentage = attackerHealth / maxHealth;

        // Prioritize healing when low on health
        if (healthPercentage < 0.3) {
            score += move.specialEffect.value * 3;
        } else if (healthPercentage < 0.5) {
            score += move.specialEffect.value * 2;
        } else {
            score += move.specialEffect.value;
        }
    }

    // Consider weather/terrain effects
    if (move.specialEffect?.type === 'weather' || move.specialEffect?.type === 'terrain') {
        // Check if we already have this weather/terrain
        const currentWeather = battleState.weather;
        const isWeatherMove = move.specialEffect.type === 'weather';

        if (isWeatherMove) {
            // Don't set weather if we already have it
            if (currentWeather === move.type.toLowerCase()) {
                score *= 0.5;
            } else {
                score += 30;
            }
        } else {
            score += 20;
        }
    }

    // Consider stat boosts
    if (move.specialEffect?.type === 'boost') {
        // Check if we're already boosted
        const hasBoost = Object.entries(battleState.activeAbilities).some(
            ([pokemonId, ability]) => parseInt(pokemonId) === attacker.id && ability.isActive
        );

        if (!hasBoost) {
            score += 40;
        } else {
            score += 20;
        }
    }

    // Consider opponent's health and potential switches
    const defenderHealth = battleState.currentTurn === 1
        ? battleState.team2Health[defender.id]
        : battleState.team1Health[defender.id];
    const maxHealth = defender.stats.find(s => s.stat.name === 'hp')?.base_stat || 100;
    const healthPercentage = defenderHealth / maxHealth;

    // If opponent is low on health, prioritize finishing moves
    if (healthPercentage < 0.3) {
        score *= 1.2;
    }

    // Consider type effectiveness for potential switches
    const effectiveness = calculateMoveEffectiveness(move.type, defender.types, typeEffectiveness);
    if (effectiveness > 1) {
        score *= 1.2; // Boost score for super-effective moves
    } else if (effectiveness < 1) {
        score *= 0.8; // Reduce score for not very effective moves
    }

    // Consider opponent's status effects
    const defenderStatus = battleState.statusEffects[defender.id];
    if (defenderStatus) {
        // Don't try to apply the same status again
        if (move.statusEffect?.type === defenderStatus.type) {
            score *= 0.5;
        }
    }

    // Consider our own status effects
    const attackerStatus = battleState.statusEffects[attacker.id];
    if (attackerStatus) {
        // Prioritize status removal if we're statused
        if (move.specialEffect?.type === 'heal' && attackerStatus.type === 'poison') {
            score *= 1.5;
        }
    }

    // Penalize low accuracy moves
    if (move.accuracy && move.accuracy < 0.8) {
        score *= move.accuracy;
    }

    // Consider combo moves
    if (move.comboMove) {
        score += move.comboMove.chance * 20;
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
        return { name: 'Tackle', type: 'normal', power: 40, energyCost: 15 };
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
        { name: 'Thunder Wave', type: 'electric', power: 0, energyCost: 20, statusEffect: { type: 'paralysis', chance: 1 } },
        { name: 'Thunder', type: 'electric', power: 110, energyCost: 30, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Thunder Shock', type: 'electric', power: 40, energyCost: 15, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Thunderbolt', type: 'electric', power: 90, energyCost: 25, comboMove: { name: 'Thunder', type: 'electric', power: 110, chance: 0.3 } },
    ],
    fire: [
        { name: 'Fire Blast', type: 'fire', power: 110, energyCost: 30, statusEffect: { type: 'burn', chance: 0.3 } },
        { name: 'Will-O-Wisp', type: 'fire', power: 0, energyCost: 20, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Flamethrower', type: 'fire', power: 90, energyCost: 25, statusEffect: { type: 'burn', chance: 0.1 } },
        { name: 'Fire Spin', type: 'fire', power: 35, energyCost: 15, specialEffect: { type: 'terrain', value: 0.5, chance: 0.5 } },
    ],
    water: [
        { name: 'Hydro Pump', type: 'water', power: 110, energyCost: 30 },
        { name: 'Water Gun', type: 'water', power: 40, energyCost: 15 },
        { name: 'Bubble Beam', type: 'water', power: 65, energyCost: 20, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Rain Dance', type: 'water', power: 0, energyCost: 0, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    grass: [
        { name: 'Solar Beam', type: 'grass', power: 120, energyCost: 40, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
        { name: 'Vine Whip', type: 'grass', power: 45, energyCost: 15 },
        { name: 'Sleep Powder', type: 'grass', power: 0, energyCost: 10, statusEffect: { type: 'sleep', chance: 0.75 } },
        { name: 'Synthesis', type: 'grass', power: 0, energyCost: 20, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    ice: [
        { name: 'Ice Beam', type: 'ice', power: 90, energyCost: 25, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Blizzard', type: 'ice', power: 110, energyCost: 30, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Ice Punch', type: 'ice', power: 75, energyCost: 20, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Hail', type: 'ice', power: 0, energyCost: 0, specialEffect: { type: 'weather', value: 1.5, chance: 1 } },
    ],
    poison: [
        { name: 'Toxic', type: 'poison', power: 0, energyCost: 20, statusEffect: { type: 'poison', chance: 1 } },
        { name: 'Sludge Bomb', type: 'poison', power: 90, energyCost: 25, statusEffect: { type: 'poison', chance: 0.3 } },
        { name: 'Poison Powder', type: 'poison', power: 0, energyCost: 10, statusEffect: { type: 'poison', chance: 0.75 } },
        { name: 'Venom Drench', type: 'poison', power: 0, energyCost: 15, specialEffect: { type: 'terrain', value: 0.5, chance: 0.5 } },
    ],
    normal: [
        { name: 'Body Slam', type: 'normal', power: 85, energyCost: 25, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Hypnosis', type: 'normal', power: 0, energyCost: 15, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Sing', type: 'normal', power: 0, energyCost: 15, statusEffect: { type: 'sleep', chance: 0.55 } },
        { name: 'Recover', type: 'normal', power: 0, energyCost: 20, specialEffect: { type: 'heal', value: 50, chance: 1 } },
    ],
    psychic: [
        { name: 'Hypnosis', type: 'psychic', power: 0, energyCost: 15, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Confuse Ray', type: 'psychic', power: 0, energyCost: 15, statusEffect: { type: 'paralysis', chance: 0.5 } },
        { name: 'Psychic', type: 'psychic', power: 90, energyCost: 25, specialEffect: { type: 'boost', value: 1.5, chance: 0.3 } },
        { name: 'Calm Mind', type: 'psychic', power: 0, energyCost: 20, specialEffect: { type: 'boost', value: 1.5, chance: 1 } },
    ],
    ghost: [
        { name: 'Will-O-Wisp', type: 'ghost', power: 0, energyCost: 20, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Night Shade', type: 'ghost', power: 100, energyCost: 30, statusEffect: { type: 'paralysis', chance: 0.1 } },
        { name: 'Shadow Ball', type: 'ghost', power: 80, energyCost: 25, specialEffect: { type: 'boost', value: 1.5, chance: 0.3 } },
        { name: 'Curse', type: 'ghost', power: 0, energyCost: 20, specialEffect: { type: 'terrain', value: 0.5, chance: 1 } },
    ],
};