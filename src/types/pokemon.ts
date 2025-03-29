export interface Pokemon {
    id: number;
    name: string;
    image: string;
    types: string[];
    height: number;
    weight: number;
    stats: {
        base_stat: number;
        stat: {
            name: string;
        };
    }[];
    abilities: {
        ability: {
            name: string;
        };
    }[];
}

export interface Move {
    name: string;
    type: string;
    power: number;
    accuracy?: number;
    statusEffect?: {
        type: 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze';
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
        value: number;
        chance: number;
    };
}

export interface BattleState {
    team1Pokemon: Pokemon | null;
    team2Pokemon: Pokemon | null;
    team1Health: { [key: number]: number };
    team2Health: { [key: number]: number };
    currentTurn: 1 | 2;
    battleLog: Array<{
        id: number;
        message: string;
        type: 'normal' | 'critical' | 'death' | 'victory';
        timestamp: number;
    }>;
    team1RemainingPokemon: Pokemon[];
    team2RemainingPokemon: Pokemon[];
    isAttackAnimating: boolean;
    lastDamage: number;
    gameOver: boolean;
    winner: 1 | 2 | null;
    criticalHit: boolean;
    lastTypeEffectiveness: {
        multiplier: number;
        attackerType: string;
        defenderType: string;
    } | null;
    weather: 'none' | 'rain' | 'sunny' | 'sandstorm' | 'hail';
    statusEffects: {
        [key: number]: {
            type: 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze';
            turns: number;
        };
    };
    showScreenFlash: boolean;
    particles: Array<{
        id: number;
        type: string;
        x: number;
        y: number;
        xOffset: number;
    }>;
    weatherTurns: number;
    selectedMove: Move | null;
    availableMoves: Move[];
    battleSpeed: number;
    battleStats: {
        team1: {
            damageDealt: number;
            criticalHits: number;
            statusEffectsApplied: number;
            turnsTaken: number;
        };
        team2: {
            damageDealt: number;
            criticalHits: number;
            statusEffectsApplied: number;
            turnsTaken: number;
        };
    };
    turnTimer: number;
    isTurnTimerActive: boolean;
    showMoveSelection: boolean;
}