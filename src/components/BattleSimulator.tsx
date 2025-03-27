import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    Chip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Slider,
    Stack,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { keyframes } from '@emotion/react';
import { playSound, stopAllSounds, setVolume as setSoundVolume, getVolume, preloadSounds } from '../utils/soundEffects';
import { styled } from '@mui/material/styles';

// Remove unused animations
const screenFlash = keyframes`
    0% { opacity: 0.8; }
    50% { opacity: 0.4; }
    100% { opacity: 0; }
`;

const damage = keyframes`
    0% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
    100% { transform: translateX(0); }
`;

const attack = keyframes`
    0% { transform: translateX(0); }
    50% { transform: translateX(20px); }
    100% { transform: translateX(0); }
`;

const victory = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
`;

// Remove unused backgroundPulse and backgroundRotate animations

const ScreenFlashOverlay = styled('div')({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    pointerEvents: 'none',
    zIndex: 9999,
    animation: `${screenFlash} 0.3s ease-out`,
});

const WeatherOverlay = styled('div')({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    borderRadius: '8px',
    zIndex: 1,
});

// Update weather images with new sources
// const weatherImages = { ... };

// Add styled components for new components
const StatsPanel = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    background: 'rgba(22, 33, 62, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid',
    borderColor: 'primary.main',
    borderRadius: '8px',
}));

interface Pokemon {
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

interface Team {
    id: string;
    name: string;
    pokemon: Pokemon[];
}

interface Props {
    teams: Team[];
    getTypeColor: (type: string) => string;
    typeEffectiveness: {
        [key: string]: {
            superEffective: string[];
            notVeryEffective: string[];
            noEffect: string[];
        };
    };
}

// Add type for particles
interface Particle {
    id: number;
    type: string;
    x: number;
    y: number;
    xOffset: number;
}

// Add type for status effects
interface StatusEffect {
    type: 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze';
    turns: number;
}

// Add type for weather effects
type WeatherType = 'none' | 'rain' | 'sunny' | 'sandstorm' | 'hail';

// Add move types and their potential status effects
interface Move {
    name: string;
    type: string;
    power: number;
    statusEffect?: {
        type: 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze';
        chance: number;
    };
}

// Add moves for each type
const MOVES: { [key: string]: Move[] } = {
    electric: [
        { name: 'Thunder Wave', type: 'electric', power: 0, statusEffect: { type: 'paralysis', chance: 1 } },
        { name: 'Thunder', type: 'electric', power: 110, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Thunder Shock', type: 'electric', power: 40, statusEffect: { type: 'paralysis', chance: 0.1 } },
    ],
    fire: [
        { name: 'Fire Blast', type: 'fire', power: 110, statusEffect: { type: 'burn', chance: 0.3 } },
        { name: 'Will-O-Wisp', type: 'fire', power: 0, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Flamethrower', type: 'fire', power: 90, statusEffect: { type: 'burn', chance: 0.1 } },
    ],
    ice: [
        { name: 'Ice Beam', type: 'ice', power: 90, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Blizzard', type: 'ice', power: 110, statusEffect: { type: 'freeze', chance: 0.1 } },
        { name: 'Ice Punch', type: 'ice', power: 75, statusEffect: { type: 'freeze', chance: 0.1 } },
    ],
    poison: [
        { name: 'Toxic', type: 'poison', power: 0, statusEffect: { type: 'poison', chance: 1 } },
        { name: 'Sludge Bomb', type: 'poison', power: 90, statusEffect: { type: 'poison', chance: 0.3 } },
        { name: 'Poison Powder', type: 'poison', power: 0, statusEffect: { type: 'poison', chance: 0.75 } },
    ],
    normal: [
        { name: 'Body Slam', type: 'normal', power: 85, statusEffect: { type: 'paralysis', chance: 0.3 } },
        { name: 'Hypnosis', type: 'normal', power: 0, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Sing', type: 'normal', power: 0, statusEffect: { type: 'sleep', chance: 0.55 } },
        { name: 'Thunder Wave', type: 'normal', power: 0, statusEffect: { type: 'paralysis', chance: 1 } },
    ],
    grass: [
        { name: 'Sleep Powder', type: 'grass', power: 0, statusEffect: { type: 'sleep', chance: 0.75 } },
        { name: 'Stun Spore', type: 'grass', power: 0, statusEffect: { type: 'paralysis', chance: 0.75 } },
        { name: 'Poison Powder', type: 'grass', power: 0, statusEffect: { type: 'poison', chance: 0.75 } },
    ],
    psychic: [
        { name: 'Hypnosis', type: 'psychic', power: 0, statusEffect: { type: 'sleep', chance: 0.6 } },
        { name: 'Confuse Ray', type: 'psychic', power: 0, statusEffect: { type: 'paralysis', chance: 0.5 } },
    ],
    ghost: [
        { name: 'Will-O-Wisp', type: 'ghost', power: 0, statusEffect: { type: 'burn', chance: 1 } },
        { name: 'Night Shade', type: 'ghost', power: 100, statusEffect: { type: 'paralysis', chance: 0.1 } },
    ],
};

interface BattleState {
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
}

const BattleSimulator: React.FC<Props> = ({ teams, getTypeColor, typeEffectiveness }) => {
    // Replace state with ref for battleLogIdCounter
    const battleLogIdCounterRef = useRef(0);
    const [particleIdCounter, setParticleIdCounter] = useState(0);

    // Define addBattleLogEntry with useCallback
    const addBattleLogEntry = useCallback((message: string, type: 'normal' | 'critical' | 'death' | 'victory') => {
        battleLogIdCounterRef.current += 1;
        return {
            id: battleLogIdCounterRef.current,
            message,
            type,
            timestamp: Date.now()
        };
    }, []); // No dependencies needed since we're using a ref

    const [team1, setTeam1] = useState<Team | null>(() => {
        const savedTeam1 = localStorage.getItem('battleSimulator_team1');
        if (savedTeam1) {
            const parsedTeam = JSON.parse(savedTeam1);
            // Find the team in current teams array to ensure it exists
            return teams.find(t => t.id === parsedTeam.id) || null;
        }
        return null;
    });
    const [team2, setTeam2] = useState<Team | null>(() => {
        const savedTeam2 = localStorage.getItem('battleSimulator_team2');
        if (savedTeam2) {
            const parsedTeam = JSON.parse(savedTeam2);
            // Find the team in current teams array to ensure it exists
            return teams.find(t => t.id === parsedTeam.id) || null;
        }
        return null;
    });
    const [battleState, setBattleState] = useState<BattleState>({
        team1Pokemon: null,
        team2Pokemon: null,
        team1Health: {},
        team2Health: {},
        currentTurn: 1,
        battleLog: [addBattleLogEntry('Battle started!', 'normal')],
        team1RemainingPokemon: [],
        team2RemainingPokemon: [],
        isAttackAnimating: false,
        lastDamage: 0,
        gameOver: false,
        winner: null,
        criticalHit: false,
        lastTypeEffectiveness: null,
        weather: 'none',
        statusEffects: {},
        showScreenFlash: false,
        particles: [],
        weatherTurns: 0,
        selectedMove: null,
        availableMoves: [],
        battleSpeed: 1,
        battleStats: {
            team1: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 },
            team2: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 }
        },
        turnTimer: 30,
        isTurnTimerActive: true,
        showMoveSelection: false,
    });
    const [isBattleDialogOpen, setIsBattleDialogOpen] = useState(false);
    const [showTeamOverview, setShowTeamOverview] = useState<1 | 2 | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [volume, setVolume] = useState(getVolume());

    // Save selected teams to localStorage when they change
    useEffect(() => {
        if (team1) {
            localStorage.setItem('battleSimulator_team1', JSON.stringify(team1));
        } else {
            localStorage.removeItem('battleSimulator_team1');
        }
    }, [team1]);

    useEffect(() => {
        if (team2) {
            localStorage.setItem('battleSimulator_team2', JSON.stringify(team2));
        } else {
            localStorage.removeItem('battleSimulator_team2');
        }
    }, [team2]);

    // Clear selected teams if they no longer exist in the teams array
    useEffect(() => {
        if (team1 && !teams.some(t => t.id === team1.id)) {
            setTeam1(null);
        }
        if (team2 && !teams.some(t => t.id === team2.id)) {
            setTeam2(null);
        }
    }, [team1, team2, teams]);

    // Reset battle state when teams change
    useEffect(() => {
        if (team1 && team2) {
            const team1Health: { [key: number]: number } = {};
            const team2Health: { [key: number]: number } = {};

            team1.pokemon.forEach(pokemon => {
                team1Health[pokemon.id] = 100;
            });
            team2.pokemon.forEach(pokemon => {
                team2Health[pokemon.id] = 100;
            });

            setBattleState({
                team1Pokemon: team1.pokemon[0] || null,
                team2Pokemon: team2.pokemon[0] || null,
                team1Health,
                team2Health,
                currentTurn: 1,
                battleLog: [addBattleLogEntry('Battle started!', 'normal')],
                team1RemainingPokemon: [...team1.pokemon],
                team2RemainingPokemon: [...team2.pokemon],
                isAttackAnimating: false,
                lastDamage: 0,
                gameOver: false,
                winner: null,
                criticalHit: false,
                lastTypeEffectiveness: null,
                weather: 'none',
                statusEffects: {},
                showScreenFlash: false,
                particles: [],
                weatherTurns: 0,
                selectedMove: null,
                availableMoves: [],
                battleSpeed: 1,
                battleStats: {
                    team1: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 },
                    team2: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 }
                },
                turnTimer: 30,
                isTurnTimerActive: true,
                showMoveSelection: false,
            });
        }
    }, [addBattleLogEntry, team1, team2]);

    // Initialize sounds when component mounts
    useEffect(() => {
        // Set initial volume
        setSoundVolume(volume);

        // Preload all sounds
        preloadSounds().catch(error => {
            console.error('Error preloading sounds:', error);
        });

        // Cleanup sounds when component unmounts
        return () => {
            stopAllSounds();
        };
    }, [volume]);

    // Play battle start sound when battle begins
    useEffect(() => {
        if (isBattleDialogOpen && soundEnabled) {
            console.log('Playing battle start sound');
            playSound('battleStart');
        }
    }, [isBattleDialogOpen, soundEnabled]);

    // Handle volume change
    const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
        const newVolume = Array.isArray(newValue) ? newValue[0] : newValue;
        console.log('Volume changed to:', newVolume);
        setVolume(newVolume);
        setSoundVolume(newVolume);
        setSoundEnabled(newVolume > 0);
    };

    // Handle sound toggle
    const handleSoundToggle = () => {
        const newEnabled = !soundEnabled;
        console.log('Sound toggled:', newEnabled);
        setSoundEnabled(newEnabled);
        const newVolume = newEnabled ? 0.5 : 0;
        setVolume(newVolume);
        setSoundVolume(newVolume);
    };

    // Update volume when it changes
    useEffect(() => {
        setSoundVolume(volume);
    }, [volume]);

    // Add status effect damage and restrictions
    const calculateDamage = (attacker: Pokemon, defender: Pokemon, move: Move): { damage: number; isCritical: boolean } => {
        // Check if attacker is paralyzed (25% chance to not attack)
        if (battleState.statusEffects[attacker.id]?.type === 'paralysis' && Math.random() < 0.25) {
            return { damage: 0, isCritical: false };
        }

        // Check if attacker is asleep or frozen
        if (['sleep', 'freeze'].includes(battleState.statusEffects[attacker.id]?.type || '')) {
            return { damage: 0, isCritical: false };
        }

        // Base damage calculation using move power and stats
        const attackStat = attacker.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
        const defenseStat = defender.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
        let baseDamage = (move.power * (attackStat / defenseStat)) / 2; // Adjusted base damage calculation

        // Apply weather effects
        if (battleState.weather === 'rain') {
            if (attacker.types.includes('water')) baseDamage *= 1.5;
            if (attacker.types.includes('fire')) baseDamage *= 0.5;
        } else if (battleState.weather === 'sunny') {
            if (attacker.types.includes('fire')) baseDamage *= 1.5;
            if (attacker.types.includes('water')) baseDamage *= 0.5;
        }

        // Apply type effectiveness multiplier
        let typeMultiplier = 1;
        attacker.types.forEach(attackerType => {
            defender.types.forEach(defenderType => {
                if (typeEffectiveness[attackerType].superEffective.includes(defenderType)) {
                    typeMultiplier *= 2;
                } else if (typeEffectiveness[attackerType].notVeryEffective.includes(defenderType)) {
                    typeMultiplier *= 0.5;
                } else if (typeEffectiveness[attackerType].noEffect.includes(defenderType)) {
                    typeMultiplier *= 0;
                }
            });
        });

        // Apply STAB (Same Type Attack Bonus)
        const hasSTAB = attacker.types.includes(move.type);
        if (hasSTAB) {
            baseDamage *= 1.5;
        }

        // Critical hit chance (10%)
        const isCritical = Math.random() < 0.1;
        if (isCritical) {
            baseDamage *= 1.5;
        }

        // Apply burn damage reduction
        if (battleState.statusEffects[attacker.id]?.type === 'burn') {
            baseDamage *= 0.5;
        }

        // Apply random factor (85-100%)
        const randomFactor = 0.85 + (Math.random() * 0.15);

        return {
            damage: Math.max(1, Math.round(baseDamage * typeMultiplier * randomFactor)),
            isCritical
        };
    };

    // Update generateParticles function to use the state counter
    const generateParticles = (type: string, x: number, y: number) => {
        const particleCount = 10;
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                id: particleIdCounter + i,
                type,
                x,
                y,
                xOffset: (Math.random() - 0.5) * 100,
            });
        }

        setParticleIdCounter(prev => prev + particleCount);

        setBattleState(prev => ({
            ...prev,
            particles: [...prev.particles, ...particles],
        }));

        // Remove particles after animation
        setTimeout(() => {
            setBattleState(prev => ({
                ...prev,
                particles: prev.particles.filter(p => p.id > particleIdCounter - particleCount - 1000),
            }));
        }, 1000);
    };

    const handleSwapPokemon = (teamNumber: 1 | 2, pokemon: Pokemon) => {
        const newState = { ...battleState };
        if (teamNumber === 1) {
            newState.team1Pokemon = pokemon;
        } else {
            newState.team2Pokemon = pokemon;
        }
        newState.battleLog.unshift(addBattleLogEntry(`${pokemon.name} was sent out!`, 'normal'));
        setBattleState(newState);
    };

    const checkGameOver = (state: BattleState): { isOver: boolean; winner: 1 | 2 | null } => {
        const team1Alive = state.team1RemainingPokemon.some(p => state.team1Health[p.id] > 0);
        const team2Alive = state.team2RemainingPokemon.some(p => state.team2Health[p.id] > 0);

        if (!team1Alive) return { isOver: true, winner: 2 };
        if (!team2Alive) return { isOver: true, winner: 1 };
        return { isOver: false, winner: null };
    };

    // Update handleAttack to properly update health
    const handleAttack = async () => {
        if (!battleState.team1Pokemon || !battleState.team2Pokemon || !battleState.selectedMove) return;

        const attacker = battleState.currentTurn === 1 ? battleState.team1Pokemon : battleState.team2Pokemon;
        const defender = battleState.currentTurn === 1 ? battleState.team2Pokemon : battleState.team1Pokemon;
        const move = battleState.selectedMove; // Store selected move to avoid null checks

        // Check if attacker is affected by status conditions
        const attackerStatus = battleState.statusEffects[attacker.id];
        if (attackerStatus) {
            // Handle paralysis (25% chance to not attack)
            if (attackerStatus.type === 'paralysis' && Math.random() < 0.25) {
                setBattleState(prev => ({
                    ...prev,
                    battleLog: [addBattleLogEntry(`${attacker.name} is paralyzed and couldn't move!`, 'normal'), ...prev.battleLog],
                    currentTurn: prev.currentTurn === 1 ? 2 : 1,
                    selectedMove: null
                }));
                return;
            }

            // Handle sleep and freeze (cannot attack)
            if (['sleep', 'freeze'].includes(attackerStatus.type)) {
                setBattleState(prev => ({
                    ...prev,
                    battleLog: [addBattleLogEntry(`${attacker.name} is ${attackerStatus.type === 'sleep' ? 'sleeping' : 'frozen'} and couldn't move!`, 'normal'), ...prev.battleLog],
                    currentTurn: prev.currentTurn === 1 ? 2 : 1,
                    selectedMove: null
                }));
                return;
            }
        }

        // Start attack animation
        setBattleState(prev => ({ ...prev, isAttackAnimating: true }));

        // Calculate damage
        const { damage, isCritical } = calculateDamage(attacker, defender, move);

        // Generate particles
        generateParticles(move.type, battleState.currentTurn === 1 ? 0 : 100, 50);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 1000 / battleState.battleSpeed));

        // Apply damage and handle status effects
        setBattleState(prev => {
            const defenderHealth = prev.currentTurn === 1
                ? prev.team2Health[defender.id]
                : prev.team1Health[defender.id];

            const newHealth = Math.max(0, defenderHealth - damage);

            const updatedHealth = prev.currentTurn === 1
                ? { ...prev.team2Health, [defender.id]: newHealth }
                : { ...prev.team1Health, [defender.id]: newHealth };

            // Apply status effect if move has one
            const updatedStatusEffects = { ...prev.statusEffects };
            let statusMessage = '';

            if (move.statusEffect && Math.random() < move.statusEffect.chance) {
                updatedStatusEffects[defender.id] = {
                    type: move.statusEffect.type,
                    turns: Math.floor(Math.random() * 3) + 2 // 2-4 turns
                };
                statusMessage = ` ${defender.name} was inflicted with ${move.statusEffect.type}!`;
            }

            // Apply status effect damage
            Object.entries(prev.statusEffects).forEach(([pokemonId, effect]) => {
                const pokemon = parseInt(pokemonId);
                if (effect.turns > 0) {
                    if (effect.type === 'burn' || effect.type === 'poison') {
                        const statusDamage = Math.floor(100 * 0.0625); // 1/16th of max HP
                        const currentHealth = prev.currentTurn === 1
                            ? prev.team1Health[pokemon]
                            : prev.team2Health[pokemon];

                        if (pokemon === prev.team1Pokemon?.id) {
                            const newHealthValue = Math.max(0, currentHealth - statusDamage);
                            updatedHealth[pokemon] = newHealthValue;
                        } else if (pokemon === prev.team2Pokemon?.id) {
                            const newHealthValue = Math.max(0, currentHealth - statusDamage);
                            updatedHealth[pokemon] = newHealthValue;
                        }

                        const pokemonName = pokemon === prev.team1Pokemon?.id
                            ? prev.team1Pokemon.name
                            : prev.team2Pokemon?.name;

                        if (pokemonName) {
                            statusMessage += ` ${effect.type === 'burn' ? 'Burn' : 'Poison'} dealt damage to ${pokemonName}!`;
                        }
                    }

                    updatedStatusEffects[pokemon] = {
                        ...effect,
                        turns: effect.turns - 1
                    };

                    if (updatedStatusEffects[pokemon].turns === 0) {
                        delete updatedStatusEffects[pokemon];
                        const pokemonName = pokemon === prev.team1Pokemon?.id
                            ? prev.team1Pokemon.name
                            : prev.team2Pokemon?.name;
                        if (pokemonName) {
                            statusMessage += ` ${pokemonName} recovered from ${effect.type}!`;
                        }
                    }
                }
            });

            // Update battle stats
            const teamKey = prev.currentTurn === 1 ? 'team1' : 'team2';
            const newStats = {
                ...prev.battleStats,
                [teamKey]: {
                    ...prev.battleStats[teamKey],
                    damageDealt: prev.battleStats[teamKey].damageDealt + damage,
                    criticalHits: prev.battleStats[teamKey].criticalHits + (isCritical ? 1 : 0),
                    statusEffectsApplied: prev.battleStats[teamKey].statusEffectsApplied + (statusMessage ? 1 : 0),
                    turnsTaken: prev.battleStats[teamKey].turnsTaken + 1
                }
            };

            let message = `${attacker.name} used ${move.name}!`;
            if (isCritical) message += ' Critical hit!';
            if (damage > 0) message += ` (-${damage} HP)`;
            if (statusMessage) message += statusMessage;
            if (newHealth === 0) message += `\n${defender.name} fainted!`;

            return {
                ...prev,
                team1Health: prev.currentTurn === 1 ? prev.team1Health : updatedHealth,
                team2Health: prev.currentTurn === 1 ? updatedHealth : prev.team2Health,
                lastDamage: damage,
                criticalHit: isCritical,
                statusEffects: updatedStatusEffects,
                battleStats: newStats,
                battleLog: [addBattleLogEntry(message, newHealth === 0 ? 'death' : isCritical ? 'critical' : 'normal'), ...prev.battleLog],
                isAttackAnimating: false,
                currentTurn: prev.currentTurn === 1 ? 2 : 1,
                selectedMove: null,
                isTurnTimerActive: true
            };
        });

        // Check for game over
        const { isOver, winner } = checkGameOver(battleState);
        if (isOver) {
            setBattleState(prev => ({
                ...prev,
                gameOver: true,
                winner,
                battleLog: [addBattleLogEntry(`Team ${winner} wins the battle!`, 'victory'), ...prev.battleLog]
            }));
        }
    };

    const renderPokemonCard = (pokemon: Pokemon, health: number, isAttacking: boolean, isTakingDamage: boolean) => {
        const isCurrentTurn = (pokemon.id === battleState.team1Pokemon?.id && battleState.currentTurn === 1) ||
                            (pokemon.id === battleState.team2Pokemon?.id && battleState.currentTurn === 2);

        return (
            <Card
                sx={{
                    position: 'relative',
                    width: '100%',
                    overflow: 'visible',
                    animation: isTakingDamage
                        ? `${damage} 0.5s ease-in-out`
                        : isAttacking
                            ? `${attack} 0.5s ease-in-out`
                            : battleState.gameOver && battleState.winner === (isAttacking ? 1 : 2)
                                ? `${victory} 1s ease-in-out infinite`
                                : 'none',
                    border: isCurrentTurn
                        ? '2px solid #4A90E2'
                        : health === 0
                            ? '2px solid #FF0000'
                            : '1px solid rgba(74, 144, 226, 0.2)',
                    boxShadow: isCurrentTurn
                        ? '0 0 20px rgba(74, 144, 226, 0.5)'
                        : health === 0
                            ? '0 0 20px rgba(255, 0, 0, 0.3)'
                            : 'none',
                    transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s ease-in-out',
                }}
            >
                <CardContent sx={{ p: 1 }}> {/* Reduced padding */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}> {/* Reduced gap */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}> {/* Reduced gap */}
                            <Box sx={{ position: 'relative', flexShrink: 0, width: 60, height: 60 }}> {/* Reduced size */}
                                <CardMedia
                                    component="img"
                                    image={pokemon.image}
                                    alt={pokemon.name}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        filter: health === 0 ? 'grayscale(100%)' : 'none',
                                    }}
                                />
                                {battleState.statusEffects[pokemon.id] && (
                                    <StatusEffect
                                        type={battleState.statusEffects[pokemon.id].type}
                                        turns={battleState.statusEffects[pokemon.id].turns}
                                    />
                                )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}> {/* Reduced margin */}
                                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}> {/* Changed from h6 to subtitle1 */}
                                        {pokemon.name}
                                    </Typography>
                                    {isCurrentTurn && !battleState.gameOver && (
                                        <Chip
                                            label="Current Turn"
                                            size="small"
                                            color="primary"
                                            sx={{
                                                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                                                color: '#4A90E2',
                                                fontWeight: 'bold',
                                                border: '1px solid #4A90E2',
                                                height: '20px', // Reduced height
                                            }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}> {/* Reduced margin */}
                                    {pokemon.types.map(type => (
                                        <Chip
                                            key={type}
                                            label={type}
                                            size="small"
                                            sx={{
                                                backgroundColor: getTypeColor(type),
                                                color: 'white',
                                                height: '20px', // Reduced height
                                                '& .MuiChip-label': {
                                                    px: 1, // Reduced padding
                                                    fontSize: '0.75rem', // Smaller font
                                                },
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ width: '100%' }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.max(0, Math.min(100, health))}
                                        sx={{
                                            height: 6, // Reduced height
                                            borderRadius: 3,
                                            backgroundColor: 'grey.300',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: health > 50
                                                    ? 'success.main'
                                                    : health > 20
                                                        ? 'warning.main'
                                                        : 'error.main',
                                                transition: 'transform 0.5s ease-in-out',
                                            },
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ mt: 0.5 }}> {/* Changed to caption */}
                                        HP: {Math.max(0, Math.min(100, health))}%
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    const renderTeamOverview = (teamNumber: 1 | 2) => {
        const team = teamNumber === 1 ? team1 : team2;
        const remainingPokemon = teamNumber === 1 ? battleState.team1RemainingPokemon : battleState.team2RemainingPokemon;
        const healthKey = teamNumber === 1 ? 'team1Health' : 'team2Health';
        const currentPokemon = teamNumber === 1 ? battleState.team1Pokemon : battleState.team2Pokemon;

        if (!team) return null;

        return (
            <Dialog
                open={showTeamOverview === teamNumber}
                onClose={() => setShowTeamOverview(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Team {team.name} Overview
                    <IconButton
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                        onClick={() => setShowTeamOverview(null)}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {team.pokemon.map(pokemon => (
                            <Grid item xs={12} key={pokemon.id}>
                                <Card
                                    sx={{
                                        opacity: remainingPokemon.some(p => p.id === pokemon.id) ? 1 : 0.5,
                                        border: currentPokemon?.id === pokemon.id ? '2px solid primary.main' : undefined,
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <CardMedia
                                                component="img"
                                                image={pokemon.image}
                                                alt={pokemon.name}
                                                sx={{ width: 60, height: 60 }}
                                            />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                                                    {pokemon.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                                                    {pokemon.types.map(type => (
                                                        <Chip
                                                            key={type}
                                                            label={type}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getTypeColor(type),
                                                                color: 'white',
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={battleState[healthKey][pokemon.id]}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: 'grey.300',
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: battleState[healthKey][pokemon.id] > 50
                                                                ? 'success.main'
                                                                : battleState[healthKey][pokemon.id] > 20
                                                                    ? 'warning.main'
                                                                    : 'error.main',
                                                        },
                                                    }}
                                                />
                                            </Box>
                                            {remainingPokemon.some(p => p.id === pokemon.id) &&
                                                currentPokemon?.id !== pokemon.id && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => {
                                                            handleSwapPokemon(teamNumber, pokemon);
                                                            setShowTeamOverview(null);
                                                        }}
                                                        startIcon={<SwapHorizIcon />}
                                                    >
                                                        Switch
                                                    </Button>
                                                )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
            </Dialog>
        );
    };

    // Update WeatherControls component
    const WeatherControls = () => (
        <Box sx={{
            display: 'flex',
            gap: 1,
            position: 'absolute',
            top: -48, // Move above the battle arena
            left: 0,
            right: 0,
            zIndex: 3,
            background: 'rgba(22, 33, 62, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: 1,
            borderRadius: 2,
            justifyContent: 'center', // Center the buttons
        }}>
            <Button
                variant="outlined"
                size="small"
                onClick={() => changeWeather('none')}
                color={battleState.weather === 'none' ? 'primary' : 'inherit'}
                sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
                }}
            >
                Clear
            </Button>
            <Button
                variant="outlined"
                size="small"
                onClick={() => changeWeather('rain')}
                color={battleState.weather === 'rain' ? 'primary' : 'inherit'}
                sx={{
                    bgcolor: 'rgba(100, 149, 237, 0.1)',
                    '&:hover': { bgcolor: 'rgba(100, 149, 237, 0.2)' }
                }}
            >
                Rain
            </Button>
            <Button
                variant="outlined"
                size="small"
                onClick={() => changeWeather('sunny')}
                color={battleState.weather === 'sunny' ? 'primary' : 'inherit'}
                sx={{
                    bgcolor: 'rgba(255, 200, 50, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 200, 50, 0.2)' }
                }}
            >
                Sunny
            </Button>
            <Button
                variant="outlined"
                size="small"
                onClick={() => changeWeather('sandstorm')}
                color={battleState.weather === 'sandstorm' ? 'primary' : 'inherit'}
                sx={{
                    bgcolor: 'rgba(210, 180, 140, 0.1)',
                    '&:hover': { bgcolor: 'rgba(210, 180, 140, 0.2)' }
                }}
            >
                Sandstorm
            </Button>
            <Button
                variant="outlined"
                size="small"
                onClick={() => changeWeather('hail')}
                color={battleState.weather === 'hail' ? 'primary' : 'inherit'}
                sx={{
                    bgcolor: 'rgba(200, 230, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(200, 230, 255, 0.2)' }
                }}
            >
                Hail
            </Button>
        </Box>
    );

    // Update WeatherEffect component
    const WeatherEffect = () => {
        if (battleState.weather === 'none') return null;

        return (
            <WeatherOverlay>
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: battleState.weather === 'rain'
                            ? 'linear-gradient(180deg, rgba(100, 149, 237, 0.3) 0%, rgba(100, 149, 237, 0.4) 100%)'
                            : battleState.weather === 'sunny'
                            ? 'linear-gradient(180deg, rgba(255, 200, 50, 0.3) 0%, rgba(255, 150, 50, 0.4) 100%)'
                            : battleState.weather === 'sandstorm'
                            ? 'linear-gradient(90deg, rgba(210, 180, 140, 0.3), rgba(210, 180, 140, 0.4))'
                            : 'linear-gradient(180deg, rgba(200, 230, 255, 0.3) 0%, rgba(200, 230, 255, 0.4) 100%)',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: battleState.weather === 'rain'
                                ? 'repeating-linear-gradient(transparent, transparent 10%, rgba(255, 255, 255, 0.2) 10%, rgba(255, 255, 255, 0.2) 20%)'
                                : battleState.weather === 'sandstorm'
                                ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(210, 180, 140, 0.2) 10px, rgba(210, 180, 140, 0.2) 20px)'
                                : battleState.weather === 'hail'
                                ? 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 0.5%) 0 0/12px 12px'
                                : 'none',
                            animation: battleState.weather === 'rain'
                                ? 'rain 1s linear infinite'
                                : battleState.weather === 'sandstorm'
                                ? 'sandstorm 20s linear infinite'
                                : battleState.weather === 'sunny'
                                ? 'sunny 3s ease-in-out infinite'
                                : 'snowfall 3s linear infinite',
                            opacity: 0.6,
                        },
                        backdropFilter: 'blur(2px)',
                        zIndex: 1,
                    }}
                />
            </WeatherOverlay>
        );
    };

    // Add weather animations
    const weatherAnimations = `
        @keyframes rain {
            from { background-position: 0 0; }
            to { background-position: 0 100%; }
        }
        @keyframes sandstorm {
            from { background-position: 0 0; }
            to { background-position: 100% 0; }
        }
        @keyframes sunny {
            0% { opacity: 0.3; }
            50% { opacity: 0.5; }
            100% { opacity: 0.3; }
        }
        @keyframes snowfall {
            from { background-position: 0 0; }
            to { background-position: 40px 40px; }
        }
    `;

    // Add style tag for weather animations
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = weatherAnimations;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Add status effect animations
    const statusEffect = keyframes`
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    `;

    // Update StatusEffect component to use Box instead of Tooltip
    const StatusEffect = ({ type, turns }: { type: string; turns: number }) => {
        const statusColors = {
            paralysis: '#FFD700',
            sleep: '#87CEEB',
            poison: '#800080',
            burn: '#FF4500',
            freeze: '#00FFFF',
        };

        const statusIcons = {
            paralysis: '⚡',
            sleep: '💤',
            poison: '☠️',
            burn: '🔥',
            freeze: '❄️',
        };

        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: '24px',
                    height: '24px',
                    backgroundColor: statusColors[type as keyof typeof statusColors],
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: 'white',
                    fontWeight: 'bold',
                    animation: `${statusEffect} 1s ease-in-out infinite`,
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 2,
                    '&:hover::after': {
                        content: `"${type} (${turns} turns)"`,
                        position: 'absolute',
                        top: '-24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                    }
                }}
            >
                {statusIcons[type as keyof typeof statusIcons]}
            </Box>
        );
    };

    // Update changeWeather to use useCallback
    const changeWeather = useCallback((weather: WeatherType) => {
        setBattleState(prev => ({
            ...prev,
            weather,
            weatherTurns: weather === 'none' ? 0 : 5,
            battleLog: [
                addBattleLogEntry(
                    weather === 'none'
                        ? 'The weather cleared up!'
                        : `The weather changed to ${weather}!`,
                    'normal'
                ),
                ...prev.battleLog
            ]
        }));
    }, [addBattleLogEntry]);

    // Add random weather change effect
    useEffect(() => {
        if (!isBattleDialogOpen || battleState.gameOver) return;

        const weatherTypes: WeatherType[] = ['none', 'rain', 'sunny', 'sandstorm', 'hail'];
        const weatherChangeInterval = setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance to change weather each interval
                const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
                if (newWeather !== battleState.weather) {
                    changeWeather(newWeather);
                }
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(weatherChangeInterval);
    }, [isBattleDialogOpen, battleState.gameOver, battleState.weather, changeWeather]);

    // Update the turn timer effect to pause when move selection is open
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (battleState.isTurnTimerActive && !battleState.gameOver && !battleState.showMoveSelection) {
            timer = setInterval(() => {
                setBattleState(prev => {
                    if (prev.turnTimer <= 0) {
                        return {
                            ...prev,
                            turnTimer: 30,
                            currentTurn: prev.currentTurn === 1 ? 2 : 1,
                            battleLog: [...prev.battleLog, addBattleLogEntry(`Turn timer expired! Team ${prev.currentTurn === 1 ? 2 : 1}'s turn.`, 'normal')]
                        };
                    }
                    return {
                        ...prev,
                        turnTimer: prev.turnTimer - 1
                    };
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [battleState.isTurnTimerActive, battleState.gameOver, battleState.showMoveSelection, addBattleLogEntry]);

    // Update the button click handler
    const handleMoveButtonClick = () => {
        if (battleState.selectedMove) {
            handleAttack();
        } else {
            setBattleState(prev => ({
                ...prev,
                showMoveSelection: true,
                isTurnTimerActive: false // Pause the timer when opening move selection
            }));
        }
    };

    // Add new components
    const MoveSelection = ({ pokemon, onSelectMove, onCancel }: {
        pokemon: Pokemon;
        onSelectMove: (move: Move) => void;
        onCancel: () => void;
    }) => {
        const moves = pokemon.types.flatMap(type => MOVES[type] || []);
        if (moves.length === 0) {
            moves.push({ name: 'Tackle', type: 'normal', power: 40 });
        }

        const handleMoveSelect = (move: Move) => {
            onSelectMove(move);
        };

        const handleCancel = () => {
            onCancel();
        };

        return (
            <Dialog
                open={true}
                onClose={handleCancel}
                maxWidth="sm"
                fullWidth
                keepMounted
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        background: 'rgba(22, 33, 62, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: '16px',
                        minWidth: '300px',
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    background: 'rgba(0, 0, 0, 0.2)',
                    py: 2,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            component="div"
                            variant="h6"
                            sx={{
                                textTransform: 'capitalize',
                                color: 'primary.light'
                            }}
                        >
                            {pokemon.name}'s Moves
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2 }}>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        {moves.map((move, index) => (
                            <Grid item xs={12} key={index}>
                                <Button
                                    fullWidth
                                    onClick={() => handleMoveSelect(move)}
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        background: 'rgba(74, 144, 226, 0.1)',
                                        borderColor: 'primary.main',
                                        justifyContent: 'flex-start',
                                        gap: 2,
                                        '&:hover': {
                                            background: 'rgba(74, 144, 226, 0.2)',
                                            borderColor: 'primary.light',
                                        }
                                    }}
                                >
                                    <Chip
                                        label={move.type}
                                        size="small"
                                        sx={{
                                            backgroundColor: getTypeColor(move.type),
                                            color: 'white',
                                            minWidth: '80px'
                                        }}
                                    />
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        flex: 1
                                    }}>
                                        <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                                            {move.name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                display: 'block'
                                            }}
                                        >
                                            Power: {move.power}
                                            {move.statusEffect && ` | Status: ${move.statusEffect.type} (${Math.round(move.statusEffect.chance * 100)}%)`}
                                        </Typography>
                                    </Box>
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <Button
                        onClick={handleCancel}
                        variant="contained"
                        color="secondary"
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const BattleStats = ({ stats }: { stats: BattleState['battleStats'] }) => (
        <StatsPanel>
            <Typography variant="subtitle1" gutterBottom>Battle Statistics</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Typography variant="subtitle2" color="primary">Team 1</Typography>
                    <Typography variant="body2">Damage Dealt: {stats.team1.damageDealt}</Typography>
                    <Typography variant="body2">Critical Hits: {stats.team1.criticalHits}</Typography>
                    <Typography variant="body2">Status Effects: {stats.team1.statusEffectsApplied}</Typography>
                    <Typography variant="body2">Turns: {stats.team1.turnsTaken}</Typography>
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="subtitle2" color="secondary">Team 2</Typography>
                    <Typography variant="body2">Damage Dealt: {stats.team2.damageDealt}</Typography>
                    <Typography variant="body2">Critical Hits: {stats.team2.criticalHits}</Typography>
                    <Typography variant="body2">Status Effects: {stats.team2.statusEffectsApplied}</Typography>
                    <Typography variant="body2">Turns: {stats.team2.turnsTaken}</Typography>
                </Grid>
            </Grid>
        </StatsPanel>
    );

    // Add effect to manage root aria-hidden
    useEffect(() => {
        const rootElement = document.getElementById('root');
        if (rootElement) {
            if (isBattleDialogOpen) {
                rootElement.removeAttribute('aria-hidden');
            } else {
                rootElement.setAttribute('aria-hidden', 'true');
            }
        }
        return () => {
            if (rootElement) {
                rootElement.removeAttribute('aria-hidden');
            }
        };
    }, [isBattleDialogOpen]);

    // Update battle start handler
    const handleStartBattle = () => {
        if (!team1 || !team2) return;

        // Reset battle state
        setBattleState(prev => ({
            ...prev,
            team1Pokemon: team1.pokemon[0] || null,
            team2Pokemon: team2.pokemon[0] || null,
            team1Health: team1.pokemon.reduce((acc, p) => ({ ...acc, [p.id]: 100 }), {}),
            team2Health: team2.pokemon.reduce((acc, p) => ({ ...acc, [p.id]: 100 }), {}),
            currentTurn: 1,
            battleLog: [addBattleLogEntry('Battle started!', 'normal')],
            team1RemainingPokemon: [...team1.pokemon],
            team2RemainingPokemon: [...team2.pokemon],
            isAttackAnimating: false,
            lastDamage: 0,
            gameOver: false,
            winner: null,
            criticalHit: false,
            lastTypeEffectiveness: null,
            weather: 'none',
            statusEffects: {},
            showScreenFlash: false,
            particles: [],
            weatherTurns: 0,
            selectedMove: null,
            availableMoves: [],
            battleSpeed: 1,
            battleStats: {
                team1: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 },
                team2: { damageDealt: 0, criticalHits: 0, statusEffectsApplied: 0, turnsTaken: 0 }
            },
            turnTimer: 30,
            isTurnTimerActive: true, // Start timer immediately
            showMoveSelection: false,
        }));

        // Open battle dialog
        setIsBattleDialogOpen(true);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Battle Simulator
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton onClick={handleSoundToggle} color={soundEnabled ? "primary" : "default"}>
                        {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    </IconButton>
                    <Box sx={{ width: 200 }}>
                        <Slider
                            value={volume}
                            onChange={handleVolumeChange}
                            min={0}
                            max={1}
                            step={0.1}
                            disabled={!soundEnabled}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value: number) => `${Math.round(value * 100)}%`}
                        />
                    </Box>
                </Stack>
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Select Team 1
                        </Typography>
                        <Grid container spacing={2}>
                            {teams.map(team => (
                                <Grid item xs={12} sm={6} key={team.id}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            border: team1?.id === team.id ? '2px solid primary.main' : undefined,
                                            bgcolor: team1?.id === team.id ? 'primary.light' : 'background.paper',
                                            '&:hover': {
                                                transform: 'scale(1.02)',
                                                transition: 'transform 0.2s',
                                                bgcolor: team1?.id === team.id ? 'primary.light' : 'action.hover',
                                            },
                                        }}
                                        onClick={() => setTeam1(team)}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="h6">{team.name}</Typography>
                                                {team1?.id === team.id && (
                                                    <Chip
                                                        label="Selected"
                                                        color="primary"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                                {team.pokemon.map(pokemon => (
                                                    <Box key={pokemon.id} sx={{ position: 'relative' }}>
                                                        <CardMedia
                                                            component="img"
                                                            image={pokemon.image}
                                                            alt={pokemon.name}
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                filter: team1?.id !== team.id ? 'grayscale(0.5)' : 'none',
                                                            }}
                                                        />
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            bottom: -4,
                                                            right: -4,
                                                            display: 'flex',
                                                            gap: 0.5
                                                        }}>
                                                            {pokemon.types.map(type => (
                                                                <Box
                                                                    key={type}
                                                                    sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        bgcolor: getTypeColor(type),
                                                                        border: '1px solid white',
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {team.pokemon.length} Pokémon
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Select Team 2
                        </Typography>
                        <Grid container spacing={2}>
                            {teams.map(team => (
                                <Grid item xs={12} sm={6} key={team.id}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            border: team2?.id === team.id ? '2px solid secondary.main' : undefined,
                                            bgcolor: team2?.id === team.id ? 'secondary.light' : 'background.paper',
                                            '&:hover': {
                                                transform: 'scale(1.02)',
                                                transition: 'transform 0.2s',
                                                bgcolor: team2?.id === team.id ? 'secondary.light' : 'action.hover',
                                            },
                                        }}
                                        onClick={() => setTeam2(team)}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="h6">{team.name}</Typography>
                                                {team2?.id === team.id && (
                                                    <Chip
                                                        label="Selected"
                                                        color="secondary"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                                {team.pokemon.map(pokemon => (
                                                    <Box key={pokemon.id} sx={{ position: 'relative' }}>
                                                        <CardMedia
                                                            component="img"
                                                            image={pokemon.image}
                                                            alt={pokemon.name}
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                filter: team2?.id !== team.id ? 'grayscale(0.5)' : 'none',
                                                            }}
                                                        />
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            bottom: -4,
                                                            right: -4,
                                                            display: 'flex',
                                                            gap: 0.5
                                                        }}>
                                                            {pokemon.types.map(type => (
                                                                <Box
                                                                    key={type}
                                                                    sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        bgcolor: getTypeColor(type),
                                                                        border: '1px solid white',
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {team.pokemon.length} Pokémon
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {team1 && team2 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        startIcon={<CompareArrowsIcon />}
                        onClick={handleStartBattle}
                    >
                        Start Battle
                    </Button>
                </Box>
            )}

            <Dialog
                open={isBattleDialogOpen}
                onClose={() => setIsBattleDialogOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        minHeight: '80vh',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
                disablePortal
                keepMounted
                aria-labelledby="battle-dialog-title"
                aria-describedby="battle-dialog-description"
            >
                <DialogTitle sx={{ p: 2, pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                            Battle: {team1?.name} vs {team2?.name}
                        </Typography>
                        <IconButton
                            onClick={() => setIsBattleDialogOpen(false)}
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent
                    sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        flex: 1,
                        overflow: 'hidden' // Prevent double scrollbars
                    }}
                >
                    {/* Battle Stats */}
                    <BattleStats stats={battleState.battleStats} />

                    {/* Speed Control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2">Battle Speed:</Typography>
                        <Slider
                            value={battleState.battleSpeed}
                            onChange={(_: unknown, value: number) => setBattleState(prev => ({
                                ...prev,
                                battleSpeed: value as number
                            }))}
                            min={0.5}
                            max={2}
                            step={0.1}
                            sx={{ width: 200 }}
                        />
                        <Typography variant="body2">{battleState.battleSpeed}x</Typography>
                    </Box>

                    {/* Turn Timer */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2">Turn Timer: {battleState.turnTimer}s</Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setBattleState(prev => ({
                                ...prev,
                                isTurnTimerActive: !prev.isTurnTimerActive
                            }))}
                        >
                            {battleState.isTurnTimerActive ? 'Pause Timer' : 'Start Timer'}
                        </Button>
                    </Box>

                    {battleState.showScreenFlash && <ScreenFlashOverlay />}

                    {/* Battle Arena */}
                    <Box sx={{
                        position: 'relative',
                        flex: 1,
                        minHeight: 300,
                        maxHeight: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        p: 2,
                        background: `
                            linear-gradient(
                                45deg,
                                rgba(26, 26, 46, 0.95) 25%,
                                rgba(22, 33, 62, 0.95) 25%,
                                rgba(22, 33, 62, 0.95) 50%,
                                rgba(26, 26, 46, 0.95) 50%,
                                rgba(26, 26, 46, 0.95) 75%,
                                rgba(22, 33, 62, 0.95) 75%,
                                rgba(22, 33, 62, 0.95)
                            )
                        `,
                        backgroundSize: '40px 40px',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(180deg, rgba(74, 144, 226, 0.1) 0%, rgba(155, 89, 182, 0.1) 100%)',
                            pointerEvents: 'none',
                        },
                    }}>
                        <WeatherEffect />
                        <WeatherControls />
                        <Grid container spacing={1} alignItems="center" justifyContent="space-between" sx={{
                            position: 'relative',
                            zIndex: 2,
                            height: '100%',
                            px: 1,
                            '& .MuiPaper-root': {
                                background: 'rgba(22, 33, 62, 0.85)',
                                border: '5px solid rgba(74, 144, 226, 0.2)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            }
                        }}>
                            <Grid item xs={5}>
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                    {battleState.team1Pokemon && (
                                        renderPokemonCard(
                                            battleState.team1Pokemon,
                                            battleState.team1Health[battleState.team1Pokemon.id],
                                            battleState.currentTurn === 1 && battleState.isAttackAnimating,
                                            battleState.currentTurn === 2 && battleState.isAttackAnimating
                                        )
                                    )}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => setShowTeamOverview(1)}
                                        sx={{
                                            position: 'absolute',
                                            bottom: -24,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            minWidth: 'auto',
                                            px: 1
                                        }}
                                    >
                                        Team
                                    </Button>
                                </Box>
                            </Grid>
                            <Grid item xs={2} sx={{ textAlign: 'center' }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5
                                }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 'bold',
                                            color: 'primary.main',
                                            textShadow: '0 0 10px rgba(74, 144, 226, 0.5)'
                                        }}
                                    >
                                        VS
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            bgcolor: 'rgba(0, 0, 0, 0.3)',
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1
                                        }}
                                    >
                                        Turn: {battleState.currentTurn}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={5}>
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                    {battleState.team2Pokemon && (
                                        renderPokemonCard(
                                            battleState.team2Pokemon,
                                            battleState.team2Health[battleState.team2Pokemon.id],
                                            battleState.currentTurn === 2 && battleState.isAttackAnimating,
                                            battleState.currentTurn === 1 && battleState.isAttackAnimating
                                        )
                                    )}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => setShowTeamOverview(2)}
                                        sx={{
                                            position: 'absolute',
                                            bottom: -24,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            minWidth: 'auto',
                                            px: 1
                                        }}
                                    >
                                        Team
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Battle Log */}
                    <Paper
                        sx={{
                            height: 400,
                            overflow: 'auto',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2,
                            scrollBehavior: 'smooth',
                            background: 'linear-gradient(180deg, rgba(22, 33, 62, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        <Typography
                            variant="h6"
                            gutterBottom
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                pb: 1,
                                position: 'sticky',
                                top: 0,
                                bgcolor: 'background.paper',
                                zIndex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                color: 'primary.light',
                                textShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
                            }}
                        >
                            📜 Battle Log
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {battleState.battleLog.slice().reverse().map((entry) => {
                                // Determine icon based on message content and type
                                let icon = '⚔️';
                                if (entry.message.includes('used')) icon = '💥';
                                if (entry.message.includes('Critical hit')) icon = '⚡';
                                if (entry.message.includes('fainted')) icon = '💀';
                                if (entry.message.includes('wins')) icon = '🏆';
                                if (entry.message.includes('paralyzed')) icon = '⚡';
                                if (entry.message.includes('sleeping')) icon = '💤';
                                if (entry.message.includes('frozen')) icon = '❄️';
                                if (entry.message.includes('burn')) icon = '🔥';
                                if (entry.message.includes('poison')) icon = '☠️';
                                if (entry.message.includes('weather')) icon = '🌤️';
                                if (entry.message.includes('Turn timer')) icon = '⏰';

                                // Determine text color and effects based on type
                                const textColor = entry.type === 'critical' ? '#FFD700' :
                                               entry.type === 'death' ? '#FF4444' :
                                               entry.type === 'victory' ? '#00FF00' : '#FFFFFF';

                                const textShadow = entry.type === 'critical' ? '0 0 10px rgba(255, 215, 0, 0.5)' :
                                                  entry.type === 'death' ? '0 0 10px rgba(255, 68, 68, 0.5)' :
                                                  entry.type === 'victory' ? '0 0 10px rgba(0, 255, 0, 0.5)' : 'none';

                                return (
                                    <Box
                                        key={entry.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: 1.5,
                                            borderRadius: 1,
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderLeft: 3,
                                            borderColor: entry.type === 'critical' ? '#FFD700' :
                                                        entry.type === 'death' ? '#FF4444' :
                                                        entry.type === 'victory' ? '#00FF00' : '#4A90E2',
                                            animation: 'fadeIn 0.3s ease-in-out',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                transform: 'translateX(5px)',
                                            },
                                            '@keyframes fadeIn': {
                                                '0%': {
                                                    opacity: 0,
                                                    transform: 'translateY(10px)',
                                                    filter: 'blur(5px)'
                                                },
                                                '100%': {
                                                    opacity: 1,
                                                    transform: 'translateY(0)',
                                                    filter: 'blur(0)'
                                                }
                                            }
                                        }}
                                    >
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                fontSize: '1.2rem',
                                                minWidth: '30px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {icon}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                minWidth: 80,
                                                opacity: 0.7
                                            }}
                                        >
                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: textColor,
                                                textShadow: textShadow,
                                                flex: 1,
                                                whiteSpace: 'pre-line',
                                                lineHeight: 1.5,
                                                '& strong': {
                                                    color: '#4A90E2',
                                                    textShadow: '0 0 5px rgba(74, 144, 226, 0.5)',
                                                }
                                            }}
                                        >
                                            {entry.message.split(/(\s+)/).map((part, index) => {
                                                // Check if this part is a Pokemon name (capitalized)
                                                if (/^[A-Z][a-z]+$/.test(part)) {
                                                    return <strong key={index}>{part}</strong>;
                                                }
                                                return part;
                                            })}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Paper>

                    {/* Move Selection Dialog */}
                    {battleState.showMoveSelection && battleState.team1Pokemon && battleState.team2Pokemon && (
                        <MoveSelection
                            pokemon={battleState.currentTurn === 1 ? battleState.team1Pokemon : battleState.team2Pokemon}
                            onSelectMove={(move) => {
                                setBattleState(prev => ({
                                    ...prev,
                                    selectedMove: move,
                                    showMoveSelection: false,
                                    isTurnTimerActive: true
                                }));
                            }}
                            onCancel={() => {
                                setBattleState(prev => ({
                                    ...prev,
                                    showMoveSelection: false,
                                    isTurnTimerActive: true
                                }));
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleMoveButtonClick}
                        disabled={
                            !battleState.team1Pokemon ||
                            !battleState.team2Pokemon ||
                            battleState.isAttackAnimating ||
                            battleState.gameOver
                        }
                    >
                        {battleState.selectedMove ? 'Execute Move' : 'Select Move'}
                    </Button>
                </DialogActions>
            </Dialog>

            {renderTeamOverview(1)}
            {renderTeamOverview(2)}
        </Box>
    );
};

export default BattleSimulator;