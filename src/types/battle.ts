import { Pokemon } from './pokemon';
import { Move } from './moves';
import { Ability } from './abilities';
import { StatusEffect } from './status';
import { Particle } from './particles';
import { WeatherType } from './weather';

export interface BattleState {
    team1Pokemon: Pokemon | null;
    team2Pokemon: Pokemon | null;
    team1Health: { [key: number]: number };
    team2Health: { [key: number]: number };
    team1Levels: { [key: number]: number };
    team2Levels: { [key: number]: number };
    team1Energy: { [key: number]: { current: number; max: number; regeneration: number } };
    team2Energy: { [key: number]: { current: number; max: number; regeneration: number } };
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
    weather: WeatherType;
    statusEffects: {
        [key: number]: StatusEffect;
    };
    showScreenFlash: boolean;
    particles: Particle[];
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
    activeAbilities: {
        [key: number]: {
            ability: Ability;
            isActive: boolean;
        };
    };
    energy: {
        [key: number]: {
            current: number;
            max: number;
            regeneration: number;
        };
    };
}