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

// Add moves for each type
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

// Add AttackEffect component definition
const AttackEffect = ({ type, isAttacking }: { type: string; isAttacking: boolean }) => {
    if (!isAttacking) return null;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'fire': return '255, 100, 0';
            case 'water': return '0, 150, 255';
            case 'electric': return '255, 255, 0';
            case 'grass': return '0, 255, 0';
            case 'ice': return '0, 255, 255';
            case 'fighting': return '255, 100, 0';
            case 'poison': return '255, 0, 255';
            case 'ground': return '139, 69, 19';
            case 'flying': return '135, 206, 235';
            case 'psychic': return '255, 192, 203';
            case 'bug': return '154, 205, 50';
            case 'rock': return '139, 69, 19';
            case 'ghost': return '128, 0, 128';
            case 'dragon': return '138, 43, 226';
            case 'dark': return '47, 79, 79';
            case 'steel': return '192, 192, 192';
            case 'fairy': return '255, 182, 193';
            default: return '255, 255, 255';
        }
    };

    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
            <defs>
                <linearGradient id={`${type}Gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: `rgba(${getTypeColor(type)}, 0.8)` }} />
                    <stop offset="100%" style={{ stopColor: `rgba(${getTypeColor(type)}, 0)` }} />
                </linearGradient>
                <filter id={`${type}Blur`}>
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </filter>
            </defs>
            <g filter={`url(#${type}Blur)`}>
                <path
                    d="M 50 50 L 80 50"
                    stroke={`url(#${type}Gradient)`}
                    strokeWidth="4"
                    className={`${type}-attack`}
                />
            </g>
            <style>
                {`
                    .${type}-attack {
                        animation: ${type}Attack 0.5s ease-out forwards;
                    }
                    @keyframes ${type}Attack {
                        0% {
                            stroke-dasharray: 0 100;
                            opacity: 1;
                        }
                        100% {
                            stroke-dasharray: 100 0;
                            opacity: 0;
                        }
                    }
                `}
            </style>
        </svg>
    );
};

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
        const move = battleState.selectedMove;

        // Check for status effects
        const statusEffect = battleState.statusEffects[attacker.id];
        if (statusEffect) {
            if (statusEffect.type === 'sleep' && statusEffect.turns > 0) {
                setBattleState(prev => ({
                    ...prev,
                    battleLog: [addBattleLogEntry(`${attacker.name} is fast asleep!`, 'normal'), ...prev.battleLog],
                    statusEffects: {
                        ...prev.statusEffects,
                        [attacker.id]: { ...statusEffect, turns: statusEffect.turns - 1 }
                    },
                    currentTurn: prev.currentTurn === 1 ? 2 : 1, // Switch turns when Pokémon is asleep
                    selectedMove: null
                }));
                return;
            }
            if (statusEffect.type === 'paralysis' && Math.random() < 0.25) {
                setBattleState(prev => ({
                    ...prev,
                    battleLog: [addBattleLogEntry(`${attacker.name} is paralyzed! It can't move!`, 'normal'), ...prev.battleLog],
                    currentTurn: prev.currentTurn === 1 ? 2 : 1, // Switch turns when Pokémon is paralyzed
                    selectedMove: null
                }));
                return;
            }
            if (statusEffect.type === 'freeze' && Math.random() < 0.2) {
                setBattleState(prev => ({
                    ...prev,
                    battleLog: [addBattleLogEntry(`${attacker.name} is frozen solid!`, 'normal'), ...prev.battleLog]
                }));
                return;
            }
        }

        // Calculate damage with weather effects
        let { damage, isCritical } = calculateDamage(attacker, defender, move);

        // Apply weather effects
        if (battleState.weather === 'sunny' && move.type === 'fire') {
            damage = Math.floor(damage * 1.5);
            setBattleState(prev => ({
                ...prev,
                battleLog: [addBattleLogEntry('The sunlight intensified the attack!', 'normal'), ...prev.battleLog]
            }));
        } else if (battleState.weather === 'rain' && move.type === 'water') {
            damage = Math.floor(damage * 1.5);
            setBattleState(prev => ({
                ...prev,
                battleLog: [addBattleLogEntry('The rain intensified the attack!', 'normal'), ...prev.battleLog]
            }));
        }

        // Handle special effects
        if (move.specialEffect && Math.random() < move.specialEffect.chance) {
            switch (move.specialEffect.type) {
                case 'heal':
                    const healAmount = Math.floor(move.specialEffect.value);
                    setBattleState(prev => ({
                        ...prev,
                        battleLog: [addBattleLogEntry(`${attacker.name} healed for ${healAmount} HP!`, 'normal'), ...prev.battleLog],
                        team1Health: {
                            ...prev.team1Health,
                            [attacker.id]: Math.min(100, prev.team1Health[attacker.id] + healAmount)
                        },
                        team2Health: {
                            ...prev.team2Health,
                            [attacker.id]: Math.min(100, prev.team2Health[attacker.id] + healAmount)
                        }
                    }));
                    break;
                case 'weather':
                    const weatherTypes: WeatherType[] = ['none', 'rain', 'sunny', 'sandstorm', 'hail'];
                    const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
                    changeWeather(newWeather);
                    break;
                case 'terrain':
                    damage = Math.floor(damage * move.specialEffect.value);
                    setBattleState(prev => ({
                        ...prev,
                        battleLog: [addBattleLogEntry('The terrain changed!', 'normal'), ...prev.battleLog]
                    }));
                    break;
                case 'boost':
                    const boostAmount = Math.floor(move.specialEffect.value * 100);
                    setBattleState(prev => ({
                        ...prev,
                        battleLog: [addBattleLogEntry(`${attacker.name}'s attack rose!`, 'normal'), ...prev.battleLog],
                        battleStats: {
                            ...prev.battleStats,
                            [prev.currentTurn === 1 ? 'team1' : 'team2']: {
                                ...prev.battleStats[prev.currentTurn === 1 ? 'team1' : 'team2'],
                                damageDealt: Math.floor(prev.battleStats[prev.currentTurn === 1 ? 'team1' : 'team2'].damageDealt * (move.specialEffect?.value ?? 1))
                            }
                        }
                    }));
                    break;
            }
        }

        // Handle combo moves
        if (move.comboMove && Math.random() < move.comboMove.chance) {
            setBattleState(prev => ({
                ...prev,
                battleLog: [addBattleLogEntry(`${attacker.name} followed up with ${move.comboMove!.name}!`, 'normal'), ...prev.battleLog]
            }));
            const comboDamage = calculateDamage(attacker, defender, move.comboMove).damage;
            damage += comboDamage;
        }

        // Start attack animation
        setBattleState(prev => ({ ...prev, isAttackAnimating: true }));

        // Play attack sound
        if (soundEnabled) {
            if (isCritical) {
                playSound('critical');
            } else {
                playSound('attack');
            }
        }

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

            // Play faint sound if Pokemon faints
            if (newHealth === 0 && soundEnabled) {
                playSound('faint');
            }

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
            if (damage > 0) {
                message += ` <span class="damage-text">(-${damage} HP)</span>`;
            }
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
            // Play victory sound
            if (soundEnabled) {
                playSound('victory');
            }

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
            <Box sx={{ position: 'relative', width: '100%' }}>
                <AttackEffect
                    type={battleState.selectedMove?.type || 'normal'}
                    isAttacking={isAttacking}
                />
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
                    background: 'linear-gradient(165deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '16px',
                    border: '3px solid',
                    borderColor: isCurrentTurn
                        ? 'rgba(74, 144, 226, 0.8)'
                        : health === 0
                            ? 'rgba(255, 0, 0, 0.8)'
                            : 'rgba(255, 255, 255, 0.2)',
                    boxShadow: isCurrentTurn
                        ? '0 0 20px rgba(74, 144, 226, 0.5), inset 0 0 20px rgba(74, 144, 226, 0.3)'
                        : health === 0
                            ? '0 0 20px rgba(255, 0, 0, 0.3), inset 0 0 20px rgba(255, 0, 0, 0.2)'
                            : '0 8px 16px rgba(0, 0, 0, 0.4)',
                    transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s ease-in-out',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `
                            linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
                            repeating-linear-gradient(
                                45deg,
                                rgba(255, 255, 255, 0.05) 0%,
                                rgba(255, 255, 255, 0.05) 1px,
                                transparent 1px,
                                transparent 4px
                            ),
                            repeating-linear-gradient(
                                -45deg,
                                rgba(255, 255, 255, 0.05) 0%,
                                rgba(255, 255, 255, 0.05) 1px,
                                transparent 1px,
                                transparent 4px
                            )
                        `,
                        borderRadius: '13px',
                        pointerEvents: 'none',
                        zIndex: 1,
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `
                            radial-gradient(
                                circle at 20% 20%,
                                rgba(255, 255, 255, 0.1) 0%,
                                transparent 50%
                            ),
                            radial-gradient(
                                circle at 80% 80%,
                                rgba(255, 255, 255, 0.1) 0%,
                                transparent 50%
                            )
                        `,
                        borderRadius: '13px',
                        pointerEvents: 'none',
                        zIndex: 2,
                    }
                }}
            >
                {/* Card Frame */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }} />

                <CardContent sx={{ p: 2, position: 'relative', zIndex: 3 }}>
                    {/* Card Header */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                        borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                        pb: 1.5,
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -2,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                        }
                    }}>
                        <Typography
                            variant="h6"
                            sx={{
                                textTransform: 'capitalize',
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                                color: '#fff',
                                textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                                letterSpacing: '0.5px',
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: -8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                                }
                            }}
                        >
                            {pokemon.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.8 }}>
                            {pokemon.types.map(type => (
                                <Box
                                    key={type}
                                    sx={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        bgcolor: `${getTypeColor(type)}`,
                                        border: '2px solid rgba(255, 255, 255, 0.8)',
                                        boxShadow: `0 0 10px ${getTypeColor(type)}80`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                                        position: 'relative',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%)',
                                            pointerEvents: 'none',
                                        }
                                    }}
                                >
                                    {type.charAt(0).toUpperCase()}
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Pokemon Image Container */}
                    <Box sx={{
                        position: 'relative',
                        width: '100%',
                        height: '140px',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(165deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        borderRadius: '12px',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `
                                radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 70%),
                                linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
                                linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
                                linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%)
                            `,
                            backgroundSize: '20px 20px',
                            opacity: 0.5,
                            pointerEvents: 'none',
                        }
                    }}>
                                <CardMedia
                                    component="img"
                                    image={pokemon.image}
                                    alt={pokemon.name}
                                    sx={{
                                width: '85%',
                                height: '85%',
                                        objectFit: 'contain',
                                filter: health === 0
                                    ? 'grayscale(100%) brightness(0.7)'
                                    : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
                                transform: 'scale(1.1)',
                                transition: 'all 0.3s ease-in-out',
                                animation: isCurrentTurn ? 'float 3s ease-in-out infinite' : 'none',
                                '@keyframes float': {
                                    '0%, 100%': { transform: 'translateY(0) scale(1.1)' },
                                    '50%': { transform: 'translateY(-5px) scale(1.1)' }
                                }
                                    }}
                                />
                                {battleState.statusEffects[pokemon.id] && (
                                    <StatusEffect
                                        type={battleState.statusEffects[pokemon.id].type}
                                        turns={battleState.statusEffects[pokemon.id].turns}
                                    />
                                )}
                            </Box>

                    {/* Stats Section */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        background: 'linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        borderRadius: '10px',
                        p: 1.5,
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `
                                linear-gradient(45deg, transparent 48%, rgba(255, 255, 255, 0.1) 50%, transparent 52%),
                                linear-gradient(-45deg, transparent 48%, rgba(255, 255, 255, 0.1) 50%, transparent 52%)
                            `,
                            backgroundSize: '20px 20px',
                            opacity: 0.3,
                            pointerEvents: 'none',
                            borderRadius: '8px',
                        }
                    }}>
                        {/* HP Bar */}
                        <Box sx={{ width: '100%' }}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 0.8,
                                alignItems: 'center'
                            }}>
                                <Typography
                                            sx={{
                                        color: '#fff',
                                                fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    HP
                                </Typography>
                                <Typography
                                            sx={{
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    {Math.max(0, Math.min(100, health))}/100
                                </Typography>
                                </Box>
                            <Box sx={{
                                position: 'relative',
                                height: '12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                    animation: 'shine 2s infinite',
                                    '@keyframes shine': {
                                        '0%': { transform: 'translateX(-100%)' },
                                        '100%': { transform: 'translateX(100%)' }
                                    }
                                }
                            }}>
                                <Box
                                        sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: '100%',
                                        width: `${Math.max(0, Math.min(100, health))}%`,
                                        background: health > 50
                                            ? 'linear-gradient(90deg, #4CAF50 0%, #81C784 100%)'
                                                    : health > 20
                                                ? 'linear-gradient(90deg, #FFA726 0%, #FFB74D 100%)'
                                                : 'linear-gradient(90deg, #f44336 0%, #e57373 100%)',
                                        transition: 'all 0.3s ease-in-out',
                                        borderRadius: '5px',
                                        boxShadow: health > 50
                                            ? '0 0 10px rgba(76, 175, 80, 0.5)'
                                            : health > 20
                                                ? '0 0 10px rgba(255, 167, 38, 0.5)'
                                                : '0 0 10px rgba(244, 67, 54, 0.5)',
                                    }}
                                />
                                </Box>
                            </Box>

                        {/* Current Turn Indicator */}
                        {isCurrentTurn && !battleState.gameOver && (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mt: 0.5
                            }}>
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: '20px',
                                        background: 'linear-gradient(90deg, rgba(74, 144, 226, 0.3) 0%, rgba(74, 144, 226, 0.1) 100%)',
                                        border: '1px solid rgba(74, 144, 226, 0.5)',
                                        boxShadow: '0 0 15px rgba(74, 144, 226, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        textShadow: '0 0 8px rgba(74, 144, 226, 0.8)',
                                        animation: 'pulse 2s ease-in-out infinite',
                                        '@keyframes pulse': {
                                            '0%, 100%': { transform: 'scale(1)' },
                                            '50%': { transform: 'scale(1.05)' }
                                        }
                                    }}
                                >
                                    Current Turn
                        </Box>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
            </Box>
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

    // Add new weather SVG components
    const WeatherSVG = ({ type }: { type: WeatherType }) => {
        switch (type) {
            case 'rain':
        return (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, rgba(100, 149, 237, 0.2) 0%, rgba(100, 149, 237, 0.1) 100%)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: 'inherit'
                    }} />
                );
            case 'sunny':
                return (
                    <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        background: 'linear-gradient(180deg, rgba(255, 200, 50, 0.2) 0%, rgba(255, 150, 50, 0.1) 100%)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: 'inherit'
                    }} />
                );
            case 'sandstorm':
                return (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, rgba(210, 180, 140, 0.2) 0%, rgba(210, 180, 140, 0.1) 100%)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: 'inherit'
                    }} />
                );
            case 'hail':
                return (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, rgba(200, 230, 255, 0.2) 0%, rgba(200, 230, 255, 0.1) 100%)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: 'inherit'
                    }} />
                );
            default:
                return null;
        }
    };

    // Update WeatherEffect component
    const WeatherEffect = () => {
        if (battleState.weather === 'none') return null;

        return (
            <WeatherOverlay>
                <WeatherSVG type={battleState.weather} />
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
                    top: '10px',
                    right: '10px',
                    width: '32px',
                    height: '32px',
                    backgroundColor: `${statusColors[type as keyof typeof statusColors]}CC`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: 'white',
                    fontWeight: 'bold',
                    animation: `${statusEffect} 2s ease-in-out infinite`,
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: `0 0 10px ${statusColors[type as keyof typeof statusColors]}`,
                    zIndex: 20,
                    backdropFilter: 'blur(4px)',
                    cursor: 'pointer',
                    '&::after': {
                        content: `"${type} (${turns} turns)"`,
                        position: 'absolute',
                        top: '50%',
                        right: '120%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'all 0.2s ease-in-out',
                        pointerEvents: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover::after': {
                        opacity: 1,
                        visibility: 'visible',
                        transform: 'translateY(-50%) translateX(-2px)',
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

    const BattleLog = ({ logs }: { logs: BattleState['battleLog'] }) => (
        <Box sx={{
            height: '200px',
            overflowY: 'auto',
            bgcolor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 2,
            p: 2,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '0.8rem',
            lineHeight: 1.8,
            border: '2px solid #4A90E2',
            boxShadow: '0 0 20px rgba(74, 144, 226, 0.3)',
            '& .damage-text': {
                display: 'inline-block',
                color: '#FF4444',
                fontWeight: 'bold',
                fontSize: '1.1em',
                textShadow: '0 0 8px #FF4444',
                background: 'linear-gradient(45deg, #FF4444, #FF0000)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'damagePulse 1s ease-in-out infinite',
                '@keyframes damagePulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' }
                }
            },
            '&::-webkit-scrollbar': {
                width: '8px',
            },
            '&::-webkit-scrollbar-track': {
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
                background: '#4A90E2',
                borderRadius: '4px',
                '&:hover': {
                    background: '#357ABD',
                },
            },
        }}>
            {logs.map((log) => (
                <Box
                    key={log.id}
                    sx={{
                        mb: 1.5,
                        color: log.type === 'critical' ? '#FF4444' :
                               log.type === 'death' ? '#FF0000' :
                               log.type === 'victory' ? '#00FF00' : '#FFFFFF',
                        textShadow: log.type === 'critical' ? '0 0 8px #FF4444' :
                                   log.type === 'death' ? '0 0 8px #FF0000' :
                                   log.type === 'victory' ? '0 0 8px #00FF00' : '0 0 4px rgba(255, 255, 255, 0.5)',
                        opacity: 0.9,
                        transform: 'translateY(0)',
                        transition: 'all 0.3s ease-out',
                        '&:hover': {
                            opacity: 1,
                            transform: 'translateX(4px)',
                            textShadow: log.type === 'critical' ? '0 0 12px #FF4444' :
                                       log.type === 'death' ? '0 0 12px #FF0000' :
                                       log.type === 'victory' ? '0 0 12px #00FF00' : '0 0 8px rgba(255, 255, 255, 0.8)',
                        },
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: log.type === 'critical' ? '#FF4444' :
                                          log.type === 'death' ? '#FF0000' :
                                          log.type === 'victory' ? '#00FF00' : '#4A90E2',
                            boxShadow: log.type === 'critical' ? '0 0 8px #FF4444' :
                                      log.type === 'death' ? '0 0 8px #FF0000' :
                                      log.type === 'victory' ? '0 0 8px #00FF00' : '0 0 4px #4A90E2',
                        },
                    }}
                    dangerouslySetInnerHTML={{ __html: log.message }}
                />
            ))}
        </Box>
    );

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
                        overflow: 'hidden',
                        height: '100%'
                    }}
                >
                    {/* Battle Stats Panel - Make it collapsible on small screens */}
                    <Box sx={{
                        display: { xs: 'none', sm: 'block' }
                    }}>
                    <BattleStats stats={battleState.battleStats} />
                    </Box>

                    {/* Controls Container - Stack horizontally on larger screens, vertically on small screens */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems="center"
                        sx={{
                            flexWrap: 'wrap',
                            '& > *': { minWidth: { xs: '100%', sm: 'auto' } }
                        }}
                    >
                    {/* Speed Control */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            width: { xs: '100%', sm: 'auto' }
                        }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Speed: {battleState.battleSpeed}x</Typography>
                        <Slider
                            value={battleState.battleSpeed}
                            onChange={(_: unknown, value: number) => setBattleState(prev => ({
                                ...prev,
                                battleSpeed: value as number
                            }))}
                            min={0.5}
                            max={2}
                            step={0.1}
                                sx={{ width: { xs: '100%', sm: 150 } }}
                        />
                    </Box>

                    {/* Turn Timer */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            width: { xs: '100%', sm: 'auto' }
                        }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Timer: {battleState.turnTimer}s</Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setBattleState(prev => ({
                                ...prev,
                                isTurnTimerActive: !prev.isTurnTimerActive
                            }))}
                        >
                                {battleState.isTurnTimerActive ? 'Pause' : 'Start'}
                        </Button>
                    </Box>
                    </Stack>

                    {battleState.showScreenFlash && <ScreenFlashOverlay />}

                    {/* Battle Arena and Log Container */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        flex: 1,
                        minHeight: 0 // Important for proper flex behavior
                    }}>
                    {/* Battle Arena */}
                    <Box sx={{
                        position: 'relative',
                        flex: { xs: '0 0 auto', md: '1 1 60%' },
                        height: { xs: '300px', sm: '350px', md: 'auto' },
                        minHeight: { xs: '300px', sm: '350px' },
                        maxHeight: { xs: '350px', sm: '400px', md: 'none' },
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 2,
                        p: 2,
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        background: `
                            linear-gradient(
                                45deg,
                                    rgba(22, 28, 45, 0.95) 0%,
                                    rgba(26, 32, 53, 0.95) 50%,
                                    rgba(22, 28, 45, 0.95) 100%
                                ),
                                repeating-linear-gradient(
                                    45deg,
                                    rgba(74, 144, 226, 0.1) 0%,
                                    rgba(74, 144, 226, 0.1) 2px,
                                    transparent 2px,
                                    transparent 8px
                                ),
                                repeating-linear-gradient(
                                    -45deg,
                                    rgba(74, 144, 226, 0.1) 0%,
                                    rgba(74, 144, 226, 0.1) 2px,
                                    transparent 2px,
                                    transparent 8px
                                )
                            `,
                            opacity: 0.9,
                            zIndex: 1,
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `
                                radial-gradient(
                                    circle at center,
                                    rgba(74, 144, 226, 0.15) 0%,
                                    transparent 70%
                                ),
                                linear-gradient(
                                    0deg,
                                    rgba(22, 28, 45, 0.8) 0%,
                                    transparent 50%,
                                    rgba(22, 28, 45, 0.8) 100%
                                )
                            `,
                            zIndex: 2,
                            pointerEvents: 'none',
                            animation: 'pulseBackground 4s ease-in-out infinite',
                        },
                        '@keyframes pulseBackground': {
                            '0%, 100%': {
                                opacity: 0.8,
                            },
                            '50%': {
                                opacity: 1,
                            },
                        },
                        '& .MuiGrid-container': {
                            position: 'relative',
                            zIndex: 3,
                        }
                    }}>
                        <WeatherEffect />
                        <WeatherControls />
                        {/* Pokemon Cards Grid */}
                        <Grid container spacing={1} alignItems="center" justifyContent="space-between" sx={{
                            position: 'relative',
                            zIndex: 2,
                            height: '100%',
                            px: 1,
                            '& .MuiPaper-root': {
                                background: 'rgba(22, 33, 62, 0.85)',
                                border: '2px solid rgba(74, 144, 226, 0.2)',
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
                                flex: { xs: '1 1 auto', md: '1 1 40%' },
                                minHeight: { xs: '200px', md: '100%' },
                                maxHeight: { xs: '300px', md: 'none' },
                            overflow: 'auto',
                            bgcolor: 'background.paper',
                                border: '2px solid',
                                borderColor: 'primary.main',
                            borderRadius: 2,
                            p: 2,
                            scrollBehavior: 'smooth',
                            background: 'linear-gradient(180deg, rgba(22, 33, 62, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
                            backdropFilter: 'blur(10px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: 'rgba(74, 144, 226, 0.5)',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        background: 'rgba(74, 144, 226, 0.7)',
                                    },
                                },
                            }}
                        >
                            {/* Battle Log Header */}
                        <Typography
                            variant="h6"
                            sx={{
                                    borderBottom: 2,
                                    borderColor: 'primary.main',
                                pb: 1,
                                    mb: 2,
                                position: 'sticky',
                                top: 0,
                                bgcolor: 'background.paper',
                                zIndex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                color: 'primary.light',
                                textShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
                                    background: 'linear-gradient(90deg, rgba(22, 33, 62, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)',
                                    px: 2,
                                    mx: -2,
                                    fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}
                        >
                            📜 Battle Log
                        </Typography>

                            {/* Battle Log Content */}
                            <Box sx={{
                                            display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                                                flex: 1,
                                overflowY: 'auto'
                            }}>
                                <BattleLog logs={battleState.battleLog} />
                        </Box>
                    </Paper>
                    </Box>
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

            {renderTeamOverview(1)}
            {renderTeamOverview(2)}
        </Box>
    );
};

export default BattleSimulator;