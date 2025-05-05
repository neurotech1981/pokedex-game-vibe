import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Slider, Paper, Card, CardContent, CardMedia, Dialog, DialogTitle, DialogContent, DialogActions, Chip, LinearProgress, Stack, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { VolumeUp, VolumeOff, CompareArrows, Close, SwapHoriz, MusicNote, MusicOff } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pokemon, Team, FloatingInfo, Particle, StatusEffect } from '../types/pokemon';
import type { Ability } from '../types/abilities';
import { ABILITIES } from '../types/abilities';
import { selectAIMove, AIDifficulty } from '../utils/battleAI';
import {
    playSound,
    stopAllSounds,
    setVolume as setSoundVolume,
    getVolume,
    preloadSounds,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setMusicVolume as setMusicVolumeApi,
    getMusicVolume
} from '../utils/soundEffects';
import FloatingCombatText from './FloatingCombatText';
import TypeAnimation from './TypeAnimation';
import { Key } from 'react';
import type { TerrainType, TerrainEffect } from '../types/terrain';
import { TERRAIN_EFFECTS } from '../types/terrain';

// Define AIPersonality type
type AIPersonality = 'aggressive' | 'defensive' | 'balanced';

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

// Keep the Props interface since it's specific to this component
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

// Add type for weather effects
type WeatherType = 'none' | 'rain' | 'sunny' | 'sandstorm' | 'hail';

// Add move types and their potential status effects
interface Move {
    name: string;
    type: string;
    power: number;
    statusEffect?: {
        type: 'paralysis' | 'sleep' | 'poison' | 'burn' | 'freeze' | 'confusion';
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
    team1Health: { [key: string]: number };
    team2Health: { [key: string]: number };
    team1Levels: { [key: string]: number };
    team2Levels: { [key: string]: number };
    currentTurn: 1 | 2;
    battleLog: Array<{
        id: number;
        message: string;
        type: 'normal' | 'critical' | 'death' | 'victory';
        timestamp: number;
    } | null>;
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
        [key: string]: StatusEffect;
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
        [key: string]: {
            ability: Ability;
            isActive: boolean;
        };
    };
    terrain: TerrainType;
    terrainTurns: number;
}

// Define animation variants
const pokemonVariants = {
    idle: {
        scale: 1,
        x: 0,
        transition: { duration: 0.3 }
    },
    attack: {
        scale: 1.1,
        x: 50,
        transition: { duration: 0.2 }
    },
    attackAI: {
        scale: 1.1,
        x: -50,
        transition: { duration: 0.2 }
    },
    hit: {
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
    },
    faint: {
        scale: 0,
        opacity: 0,
        transition: { duration: 0.5 }
    }
};

// Create animated components
const AnimatedPokemon = styled(motion.div)({
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
});

// Remove imports for missing utilities and define them locally
const calculateTypeEffectiveness = (moveType: string, targetTypes: string[], typeEffectiveness: any): number => {
  let effectiveness = 1;
  for (const targetType of targetTypes) {
    if (typeEffectiveness[moveType].superEffective.includes(targetType)) {
      effectiveness *= 2;
    } else if (typeEffectiveness[moveType].notVeryEffective.includes(targetType)) {
      effectiveness *= 0.5;
    } else if (typeEffectiveness[moveType].noEffect.includes(targetType)) {
      effectiveness *= 0;
    }
  }
  return effectiveness;
};

const selectNextPokemon = (remainingPokemon: Pokemon[], currentPokemon: Pokemon | null): Pokemon | null => {
  if (!remainingPokemon.length) return null;
  if (remainingPokemon.length === 1) return remainingPokemon[0];
  const availablePokemon = remainingPokemon.filter(p => p.id !== currentPokemon?.id);
  return availablePokemon[0] || null;
};

const BattleSimulator: React.FC<Props> = ({ teams, getTypeColor, typeEffectiveness }) => {
    // Define addBattleLogEntry with useCallback
    const addBattleLogEntry = useCallback((message: string, type: 'normal' | 'critical' | 'death' | 'victory' = 'normal') => {
        // Add type icons to the message if it contains type information
        const messageWithIcons = message.replace(/(\w+)-type/g, (match, type) => {
            const typeKey = type.toLowerCase() as keyof typeof typeIcons;
            return `${typeIcons[typeKey] || ''} ${match}`;
        });

        return {
            id: Date.now(),
            message: messageWithIcons,
            type,
            timestamp: Date.now()
        };
    }, []); // No dependencies needed since we're using a ref

    const [team1, setTeam1] = useState<Team | null>(() => {
        const savedTeam1 = localStorage.getItem('battleSimulator_team1');
        if (savedTeam1) {
            const parsedTeam = JSON.parse(savedTeam1);
            // Find the team in current teams array to ensure it exists
            return teams.find((t: { id: any; }) => t.id === parsedTeam.id) || null;
        }
        return null;
    });
    const [team2, setTeam2] = useState<Team | null>(() => {
        const savedTeam2 = localStorage.getItem('battleSimulator_team2');
        if (savedTeam2) {
            const parsedTeam = JSON.parse(savedTeam2);
            // Find the team in current teams array to ensure it exists
            return teams.find((t: { id: any; }) => t.id === parsedTeam.id) || null;
        }
        return null;
    });
    const [battleState, setBattleState] = useState<BattleState>({
        team1Pokemon: null,
        team2Pokemon: null,
        team1Health: {},
        team2Health: {},
        team1Levels: {},
        team2Levels: {},
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
        activeAbilities: {},
        terrain: 'none',
        terrainTurns: 0,
    });
    const [floatingInfos, setFloatingInfos] = useState<FloatingInfo[]>([]);
    const floatingInfoIdCounterRef = useRef(0);
    const [isBattleDialogOpen, setIsBattleDialogOpen] = useState(false);
    const [showTeamOverview, setShowTeamOverview] = useState<1 | 2 | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [volume, setVolume] = useState(getVolume());

    // Add AI difficulty and personality state
    const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('intermediate');
    const [aiPersonality, setAIPersonality] = useState<AIPersonality>('balanced');

    // Inside the BattleSimulator component, add a state for floating texts
    const [floatingTexts, setFloatingTexts] = useState<Array<{
        id: number;
        text: string;
        color: string;
        type: 'damage' | 'status' | 'effectiveness';
        position: { x: number; y: number };
        targetId: number;
    }>>([]);

    // Add state for music settings
    const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
    const [musicVolume, setMusicVolume] = useState<number>(getMusicVolume());

    // Add animation state
    const [typeAnimation, setTypeAnimation] = useState({
        type: '',
        isActive: false,
        position: 'attacker' as 'attacker' | 'defender'
    });

    // Fallback implementation of generateParticles
    // This is a simpler version that just activates the type animation
    const generateParticles = (type: string, x: number, y: number): Particle[] => {
        const particles: Particle[] = [];
        const particleCount = 10;

        // Use a more unique key generation approach to avoid duplicates
        const timestamp = Date.now();
        const randomOffset = Math.floor(Math.random() * 10000);
        const baseId = timestamp * 1000 + randomOffset;

        // Set type animation
        setTypeAnimation({
            type,
            isActive: true,
            position: x < 50 ? 'attacker' : 'defender'
        });

        // Reset animation after delay
        setTimeout(() => {
            setTypeAnimation((prev) => ({
                ...prev,
                isActive: false
            }));
        }, 1000);

        // Create minimal particles just to return something
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                id: baseId + i, // Use the unique base ID plus index
                type,
                x,
                y,
                xOffset: 0,
                velocityX: (Math.random() - 0.5) * 2,
                velocityY: (Math.random() - 0.5) * 2,
                life: 1
            });
        }

        return particles;
    };

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
        if (team1 && !teams.some((t: { id: any; }) => t.id === team1.id)) {
            setTeam1(null);
        }
        if (team2 && !teams.some((t: { id: any; }) => t.id === team2.id)) {
            setTeam2(null);
        }
    }, [team1, team2, teams]);

    // Reset battle state when teams change
    useEffect(() => {
        if (team1 && team2) {
            const team1Health: { [key: string]: number } = {};
            const team2Health: { [key: string]: number } = {};

            team1.pokemon.forEach((pokemon: { id: string | number; }) => {
                team1Health[String(pokemon.id)] = 100; // Cast id to string
            });
            team2.pokemon.forEach((pokemon: { id: string | number; }) => {
                team2Health[String(pokemon.id)] = 100; // Cast id to string
            });

            setBattleState({
                team1Pokemon: team1.pokemon[0] || null,
                team2Pokemon: team2.pokemon[0] || null,
                team1Health,
                team2Health,
                team1Levels: {},
                team2Levels: {},
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
                activeAbilities: {},
                terrain: 'none',
                terrainTurns: 0,
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
        const newSoundEnabled = !soundEnabled;
        setSoundEnabled(newSoundEnabled);
        localStorage.setItem('soundEnabled', newSoundEnabled.toString());

        if (!newSoundEnabled) {
            stopAllSounds();
        } else if (isBattleDialogOpen) {
            resumeMusic();
        }
    };

    // Update volume when it changes
    useEffect(() => {
        setSoundVolume(volume);
    }, [volume]);

    // Add status effect damage and restrictions
    const calculateDamage = (attacker: Pokemon, defender: Pokemon, move: Move): { damage: number; isCritical: boolean; effectivenessMultiplier: number; effectivenessText: string } => {
        // Check if attacker is paralyzed (25% chance to not attack)
        if (battleState.statusEffects[attacker.id]?.type === 'paralysis' && Math.random() < 0.25) {
            return { damage: 0, isCritical: false, effectivenessMultiplier: 1, effectivenessText: 'Paralyzed!' };
        }

        // Check if attacker is asleep or frozen
        if (['sleep', 'freeze'].includes(battleState.statusEffects[attacker.id]?.type || '')) {
            const statusType = battleState.statusEffects[attacker.id]?.type;
            const statusColor = statusType === 'sleep' ? '#87CEEB' : '#00FFFF';
            addFloatingInfo(attacker.id, statusType === 'sleep' ? 'Asleep!' : 'Frozen!', statusColor, 'status');
            return { damage: 0, isCritical: false, effectivenessMultiplier: 1, effectivenessText: statusType === 'sleep' ? 'Asleep!' : 'Frozen!' };
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

        // Determine effectiveness text
        let effectivenessText = '';
        if (typeMultiplier > 1) effectivenessText = 'Super effective!';
        else if (typeMultiplier < 1 && typeMultiplier > 0) effectivenessText = 'Not very effective...';
        else if (typeMultiplier === 0) effectivenessText = 'No effect!';

        return {
            damage: Math.max(1, Math.round(baseDamage * typeMultiplier * randomFactor)),
            isCritical,
            effectivenessMultiplier: typeMultiplier,
            effectivenessText
        };
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

    // Update handleAttack to include terrain effects
    const handleAttack = async (selectedMove: Move) => {
        if (!battleState.team1Pokemon || !battleState.team2Pokemon || !selectedMove) {
            console.log('Missing required data for attack:', {
                team1Pokemon: !!battleState.team1Pokemon,
                team2Pokemon: !!battleState.team2Pokemon,
                selectedMove: !!selectedMove
            });
            return;
        }

        const attacker = battleState.currentTurn === 1 ? battleState.team1Pokemon : battleState.team2Pokemon;
        const defender = battleState.currentTurn === 1 ? battleState.team2Pokemon : battleState.team1Pokemon;

        // Calculate base damage
        const baseDamageResult = calculateDamage(attacker, defender, selectedMove);

        // Apply terrain effects
        const currentTerrainEffect = TERRAIN_EFFECTS[battleState.terrain];
        const finalDamage = Math.floor(baseDamageResult.damage * currentTerrainEffect.damageMultiplier);

        // Start attack animation
        setBattleState((prev) => ({ ...prev, isAttackAnimating: true }));

        // Play attack sound
        if (soundEnabled) {
            playSound('attack');
        }

        // Generate particles
        generateParticles(selectedMove.type, battleState.currentTurn === 1 ? 0 : 100, 50);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 1500 / battleState.battleSpeed));

        // Update battle state with damage
        setBattleState((prev) => {
            const defenderHealth = prev.currentTurn === 1
                ? prev.team2Health[String(defender.id)]
                : prev.team1Health[String(defender.id)];

            const newHealth = Math.max(0, defenderHealth - finalDamage);

            const updatedHealth = prev.currentTurn === 1
                ? { ...prev.team2Health, [String(defender.id)]: newHealth }
                : { ...prev.team1Health, [String(defender.id)]: newHealth };

            const currentTeamKey = prev.currentTurn === 1 ? 'team1' : 'team2';
            const updatedStats = {
                ...prev.battleStats,
                [currentTeamKey]: {
                    ...prev.battleStats[currentTeamKey],
                    damageDealt: prev.battleStats[currentTeamKey].damageDealt + finalDamage,
                    criticalHits: prev.battleStats[currentTeamKey].criticalHits + (baseDamageResult.isCritical ? 1 : 0),
                    turnsTaken: prev.battleStats[currentTeamKey].turnsTaken + 1,
                    statusEffectsApplied: prev.battleStats[currentTeamKey].statusEffectsApplied +
                        ((selectedMove.statusEffect && Math.random() < selectedMove.statusEffect.chance * currentTerrainEffect.statusEffectChance) ? 1 : 0)
                }
            };

            let message = `${attacker.name} used ${selectedMove.name}!`;
            if (baseDamageResult.isCritical) message += ' Critical hit!';
            if (finalDamage > 0) {
                message += ` <span class="damage-text">(-${finalDamage} HP)</span>`;
                addFloatingInfo(defender.id, `-${finalDamage}`, '#f44336', 'damage');
            }

            if (newHealth === 0) {
                message += `\n${defender.name} fainted!`;
            }

            return {
                ...prev,
                team1Health: prev.currentTurn === 1 ? prev.team1Health : updatedHealth,
                team2Health: prev.currentTurn === 1 ? updatedHealth : prev.team2Health,
                lastDamage: finalDamage,
                criticalHit: baseDamageResult.isCritical,
                battleLog: [addBattleLogEntry(message, newHealth === 0 ? 'death' : 'normal'), ...prev.battleLog],
                isAttackAnimating: false,
                currentTurn: prev.currentTurn === 1 ? 2 : 1,
                selectedMove: null,
                isTurnTimerActive: true,
                battleStats: updatedStats
            };
        });

        // Check for game over
        setBattleState(prev => {
            const { isOver, winner } = checkGameOver(prev);
            if (isOver && !prev.gameOver) {
                if (soundEnabled) {
                    playSound('victory');
                }
                return {
                    ...prev,
                    gameOver: true,
                    winner,
                    battleLog: [addBattleLogEntry(`Team ${winner} wins the battle!`, 'victory'), ...prev.battleLog]
                };
            }
            return prev;
        });
    };

    const renderPokemonCard = (pokemon: Pokemon, health: number, isAttacking: boolean, isTakingDamage: boolean) => {
        const isFainted = health <= 0;
        const isAI = pokemon.id === battleState.team2Pokemon?.id;
        const level = isAI ? battleState.team2Levels[pokemon.id] : battleState.team1Levels[pokemon.id];

        return (
            <Card sx={{
                position: 'relative',
                height: '100%',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, rgba(22, 33, 62, 0.95) 0%, rgba(26, 32, 53, 0.95) 100%)',
                border: '3px solid rgba(74, 144, 226, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                    background: 'radial-gradient(circle at 50% 0%, rgba(74, 144, 226, 0.1) 0%, transparent 70%)',
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
                        repeating-linear-gradient(
                            45deg,
                            rgba(74, 144, 226, 0.05) 0%,
                            rgba(74, 144, 226, 0.05) 2px,
                            transparent 2px,
                            transparent 8px
                        ),
                        repeating-linear-gradient(
                            -45deg,
                            rgba(74, 144, 226, 0.05) 0%,
                            rgba(74, 144, 226, 0.05) 2px,
                            transparent 2px,
                            transparent 8px
                        )
                    `,
                    zIndex: 1,
                }
            }}>
                {/* Decorative corner elements */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, transparent 100%)',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    zIndex: 2
                }} />
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(225deg, rgba(74, 144, 226, 0.3) 0%, transparent 100%)',
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                    zIndex: 2
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, rgba(74, 144, 226, 0.3) 0%, transparent 100%)',
                    clipPath: 'polygon(0 100%, 100% 100%, 0 0)',
                    zIndex: 2
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(315deg, rgba(74, 144, 226, 0.3) 0%, transparent 100%)',
                    clipPath: 'polygon(0 100%, 100% 100%, 100% 0)',
                    zIndex: 2
                }} />

                <CardContent sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 3,
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Status Effects */}
                    {battleState.statusEffects[pokemon.id] && (
                        <StatusEffect
                            type={battleState.statusEffects[pokemon.id].type}
                            turns={battleState.statusEffects[pokemon.id].turns}
                        />
                    )}

                    {/* Pokemon Name and Level */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        background: 'rgba(0, 0, 0, 0.3)',
                        p: 1,
                        borderRadius: '8px',
                        border: '1px solid rgba(74, 144, 226, 0.3)',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.1), transparent)',
                            animation: 'shine 2s infinite',
                            '@keyframes shine': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(100%)' }
                            }
                        }
                    }}>
                        <Typography
                            variant="h5"
                            sx={{
                                textTransform: 'capitalize',
                                color: 'primary.light',
                                textShadow: '0 0 8px rgba(74, 144, 226, 0.5)',
                                fontFamily: '"Press Start 2P", monospace',
                                fontSize: '1rem'
                            }}
                        >
                            {pokemon.name}
                        </Typography>
                        <Typography
                            variant="body2"
                                    sx={{
                                color: 'primary.light',
                                fontFamily: '"Press Start 2P", monospace',
                                fontSize: '0.8rem',
                                background: 'rgba(74, 144, 226, 0.2)',
                                px: 1,
                                py: 0.5,
                                borderRadius: '4px',
                                border: '1px solid rgba(74, 144, 226, 0.3)'
                            }}
                        >
                            Lv. {level}
                        </Typography>
                    </Box>

                    {/* Pokemon Image */}
                    <Box sx={{
                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                        my: 2,
                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '150%',
                            height: '150%',
                            background: `radial-gradient(circle, ${getTypeColor(pokemon.types[0])}20 0%, transparent 70%)`,
                            animation: 'pulse 3s infinite',
                            '@keyframes pulse': {
                                '0%': { transform: 'translate(-50%, -50%) scale(1)' },
                                '50%': { transform: 'translate(-50%, -50%) scale(1.2)' },
                                '100%': { transform: 'translate(-50%, -50%) scale(1)' }
                            }
                        }
                    }}>
                        <AnimatedPokemon
                            initial="idle"
                            animate={isFainted ? "faint" : isAttacking ? (isAI ? "attackAI" : "attack") : isTakingDamage ? "hit" : "idle"}
                            variants={pokemonVariants}
                        >
                            <Box sx={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <CardMedia
                                    component="img"
                                    image={pokemon.image}
                                    alt={pokemon.name}
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        maxHeight: '200px',
                                        objectFit: 'contain',
                                        transform: isAI ? 'scaleX(-1)' : 'none',
                                        filter: isFainted ? 'grayscale(100%) brightness(0.7)' : 'brightness(1.1)',
                                        transition: 'filter 0.3s ease-in-out',
                                        position: 'relative',
                                        zIndex: 2
                                    }}
                                />
                                <AnimatePresence>
                                    {isAttacking && (
                                        <AttackEffect
                                            variants={attackEffectVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                        >
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    background: `radial-gradient(circle, ${getTypeColor(pokemon.types[0])} 0%, transparent 70%)`,
                                                    opacity: 0.5,
                                                    filter: 'blur(10px)',
                                                    transform: isAI ? 'scaleX(-1)' : 'none'
                                                }}
                                            />
                                        </AttackEffect>
                                    )}
                                </AnimatePresence>
                                </Box>
                        </AnimatedPokemon>
                    </Box>

                    {/* Types */}
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        mb: 2,
                        justifyContent: 'center',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -10,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.5), transparent)'
                        }
                    }}>
                        {pokemon.types.map(type => (
                            <Chip
                                key={type}
                                label={type}
                                size="small"
                                    sx={{
                                    backgroundColor: getTypeColor(type),
                                    color: 'white',
                                    textTransform: 'capitalize',
                                    fontWeight: 'bold',
                                    fontFamily: '"Press Start 2P", monospace',
                                    fontSize: '0.7rem',
                                    height: '24px',
                                    '& .MuiChip-label': {
                                        px: 1
                                    },
                                    boxShadow: `0 0 10px ${getTypeColor(type)}`,
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                        transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'scale(1.1)',
                                        boxShadow: `0 0 15px ${getTypeColor(type)}`
                                        }
                                    }}
                                />
                        ))}
                            </Box>

                    {/* Health Bar */}
                    <Box sx={{
                        position: 'relative',
                        background: 'rgba(0, 0, 0, 0.3)',
                        p: 1,
                        borderRadius: '8px',
                        border: '1px solid rgba(74, 144, 226, 0.3)',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.1), transparent)',
                            animation: 'shine 2s infinite',
                            '@keyframes shine': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(100%)' }
                            }
                        }
                    }}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                            mb: 0.5
                            }}>
                                <Typography
                                variant="body2"
                                            sx={{
                                    color: 'primary.light',
                                    fontFamily: '"Press Start 2P", monospace',
                                    fontSize: '0.7rem'
                                    }}
                                >
                                    HP
                                </Typography>
                                <Typography
                                variant="body2"
                                            sx={{
                                    color: 'primary.light',
                                    fontFamily: '"Press Start 2P", monospace',
                                    fontSize: '0.7rem'
                                }}
                            >
                                {health}%
                                </Typography>
                                </Box>
                            <Box sx={{
                                position: 'relative',
                                height: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                animation: 'shimmer 2s infinite',
                                '@keyframes shimmer': {
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
                                    width: `${health}%`,
                                        background: health > 50
                                        ? 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'
                                                    : health > 20
                                                ? 'linear-gradient(90deg, #FFA726 0%, #FFB74D 100%)'
                                            : 'linear-gradient(90deg, #f44336 0%, #EF5350 100%)',
                                    borderRadius: '6px',
                                        boxShadow: health > 50
                                        ? '0 0 8px rgba(76, 175, 80, 0.5)'
                                            : health > 20
                                            ? '0 0 8px rgba(255, 167, 38, 0.5)'
                                            : '0 0 8px rgba(244, 67, 54, 0.5)',
                                    transition: 'width 0.5s ease-in-out, background 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                        animation: 'pulse 2s infinite',
                                        '@keyframes pulse': {
                                            '0%': { opacity: 0.5 },
                                            '50%': { opacity: 1 },
                                            '100%': { opacity: 0.5 }
                                        }
                                    }
                                }}
                            />
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
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ width: '100%' }}> {/* Added width */}
                        {team.pokemon.map((pokemon: Pokemon) => (
                            <Grid size={12} key={pokemon.id}> {/* Removed item, updated size prop */}
                                <Card
                                    sx={{
                                        opacity: remainingPokemon.some((p: { id: any; }) => p.id === pokemon.id) ? 1 : 0.5,
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
                                                    {pokemon.types.map((type: any) => (
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
                                            {remainingPokemon.some((p: { id: any; }) => p.id === pokemon.id) &&
                                                currentPokemon?.id !== pokemon.id && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => {
                                                            handleSwapPokemon(teamNumber, pokemon);
                                                            setShowTeamOverview(null);
                                                        }}
                                                        startIcon={<SwapHoriz />}
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
                        backgroundSize: '200% 200%',
                        backgroundRepeat: 'repeat',
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
            confusion: '#FF0000',
        };

        const statusIcons = {
            paralysis: '⚡',
            sleep: '💤',
            poison: '☠️',
            burn: '🔥',
            freeze: '❄️',
            confusion: '🤔',
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
        setBattleState((prev) => ({
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
                setBattleState((prev) => {
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
            handleAttack(battleState.selectedMove);
        } else {
            setBattleState((prev) => ({
                ...prev,
                showMoveSelection: true
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

        // Function to calculate accuracy description
        const getAccuracyDescription = (power: number): string => {
            if (power < 40) return "High";
            if (power < 80) return "Medium";
            return "Low";
        };

        // Function to generate a move description based on its properties
        const getMoveDescription = (move: Move): string => {
            let description = `A ${move.type}-type move with ${move.power > 80 ? "high" : move.power > 40 ? "medium" : "low"} power.`;

            if (move.statusEffect) {
                description += ` Has a ${Math.round(move.statusEffect.chance * 100)}% chance to ${move.statusEffect.type} the target.`;
            }

            return description;
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
                    <Grid container spacing={2} sx={{ mt: 0, width: '100%' }}> {/* Added width */}
                        {moves.map((move, index) => (
                            <Grid size={12} key={index}> {/* Removed item, updated size prop */}
                                <Tooltip
                                    title={
                                        <React.Fragment>
                                            <Typography variant="subtitle2" color="inherit">{move.name}</Typography>
                                            <Typography variant="body2">Type: {move.type}</Typography>
                                            <Typography variant="body2">Power: {move.power}</Typography>
                                            <Typography variant="body2">Accuracy: {getAccuracyDescription(move.power)}</Typography>
                                            {move.statusEffect && (
                                                <Typography variant="body2">
                                                    Status Effect: {move.statusEffect.type} ({Math.round(move.statusEffect.chance * 100)}% chance)
                                                </Typography>
                                            )}
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {getMoveDescription(move)}
                                            </Typography>
                                        </React.Fragment>
                                    }
                                    arrow
                                    placement="right"
                                >
                                <Button
                                    fullWidth
                                    onClick={() => handleMoveSelect(move)}
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                            background: `linear-gradient(to right, ${getTypeColor(move.type)}40, rgba(22, 33, 62, 0.8))`,
                                            borderColor: getTypeColor(move.type),
                                            borderWidth: 2,
                                            borderRadius: '12px',
                                        justifyContent: 'flex-start',
                                        gap: 2,
                                            transition: 'all 0.3s ease',
                                        '&:hover': {
                                                background: `linear-gradient(to right, ${getTypeColor(move.type)}60, rgba(22, 33, 62, 0.9))`,
                                                borderColor: getTypeColor(move.type),
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 5px 15px ${getTypeColor(move.type)}40`
                                        }
                                    }}
                                >
                                    <Chip
                                        label={move.type}
                                        size="small"
                                        sx={{
                                            backgroundColor: getTypeColor(move.type),
                                            color: 'white',
                                                minWidth: '80px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                fontSize: '0.7rem',
                                        }}
                                    />
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        flex: 1
                                    }}>
                                            <Typography variant="subtitle1" sx={{
                                                color: 'text.primary',
                                                fontWeight: 'bold'
                                            }}>
                                            {move.name}
                                        </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                width: '100%'
                                            }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Power: {move.power}
                                        </Typography>

                                                {/* Power bar visualization */}
                                                <Box sx={{
                                                    flexGrow: 1,
                                                    height: '6px',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <Box sx={{
                                                        width: `${Math.min(100, (move.power / 150) * 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: move.power > 80 ? '#ff5252' : move.power > 50 ? '#ffa726' : '#4caf50',
                                                    }}/>
                                                </Box>

                                                {move.statusEffect && (
                                                    <Chip
                                                        label={move.statusEffect.type}
                                                        size="small"
                                                        sx={{
                                                            height: '20px',
                                                            fontSize: '0.625rem',
                                                            backgroundColor: (() => {
                                                                switch(move.statusEffect.type) {
                                                                    case 'burn': return '#f44336';
                                                                    case 'paralysis': return '#ffc107';
                                                                    case 'freeze': return '#2196f3';
                                                                    case 'poison': return '#9c27b0';
                                                                    case 'sleep': return '#9e9e9e';
                                                                    case 'confusion': return '#7e57c2';
                                                                    default: return '#9e9e9e';
                                                                }
                                                            })(),
                                                            color: 'white',
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                    </Box>
                                </Button>
                                </Tooltip>
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
            <Grid container spacing={2} sx={{ width: '100%' }}> {/* Added width */}
                <Grid size={6}> {/* Removed item, updated size prop */}
                    <Typography variant="subtitle2" color="primary">Team 1</Typography>
                    <Typography variant="body2">Damage Dealt: {stats.team1.damageDealt}</Typography>
                    <Typography variant="body2">Critical Hits: {stats.team1.criticalHits}</Typography>
                    <Typography variant="body2">Status Effects: {stats.team1.statusEffectsApplied}</Typography>
                    <Typography variant="body2">Turns: {stats.team1.turnsTaken}</Typography>
                </Grid>
                <Grid size={6}> {/* Removed item, updated size prop */}
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

        const initializeAbilities = (pokemon: Pokemon) => {
            const abilityKeys = Object.keys(ABILITIES);
            const randomAbility = ABILITIES[abilityKeys[Math.floor(Math.random() * abilityKeys.length)]];
            return {
                ...pokemon,
                activeAbility: randomAbility
            };
        };

        const team1WithAbilities = team1.pokemon.map(initializeAbilities);
        const team2WithAbilities = team2.pokemon.map(initializeAbilities);

        // Generate random levels between 50-100 for each Pokémon
        const generateLevels = (pokemon: Pokemon[]) => {
            return pokemon.reduce((acc: { [key: number]: number }, p: Pokemon) => ({
                ...acc,
                [p.id]: Math.floor(Math.random() * 50) + 50
            }), {});
        };

        const team1Levels = generateLevels(team1.pokemon);
        const team2Levels = generateLevels(team2.pokemon);

        // Initialize activeAbilities for all Pokémon
        const activeAbilities = {
            ...team1WithAbilities.reduce((acc: { [key: number]: { ability: Ability; isActive: boolean } }, p: Pokemon) =>
                ({ ...acc, [p.id]: { ability: p.activeAbility!, isActive: false } }), {}),
            ...team2WithAbilities.reduce((acc: { [key: number]: { ability: Ability; isActive: boolean } }, p: Pokemon) =>
                ({ ...acc, [p.id]: { ability: p.activeAbility!, isActive: false } }), {})
        };

        // Reset battle state
        setBattleState((prev) => ({
            ...prev,
            team1Pokemon: team1WithAbilities[0] || null,
            team2Pokemon: team2WithAbilities[0] || null,
            team1Health: team1.pokemon.reduce((acc: { [key: number]: number }, p: Pokemon) => ({ ...acc, [p.id]: 100 }), {}),
            team2Health: team2.pokemon.reduce((acc: { [key: number]: number }, p: Pokemon) => ({ ...acc, [p.id]: 100 }), {}),
            team1Levels,
            team2Levels,
            currentTurn: 1,
            battleLog: [addBattleLogEntry('Battle started!', 'normal')],
            team1RemainingPokemon: team1WithAbilities,
            team2RemainingPokemon: team2WithAbilities,
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
            activeAbilities,
            terrain: 'none',
            terrainTurns: 0,
        }));

        // Open battle dialog
        setIsBattleDialogOpen(true);

        // Start the battle music
        if (musicEnabled) {
            playMusic('battleTheme', true);
        }
    };

    const typeIcons = {
        normal: '⚪',
        fire: '🔥',
        water: '💧',
        electric: '⚡',
        grass: '🌿',
        ice: '❄️',
        fighting: '💪',
        poison: '☠️',
        ground: '🌍',
        flying: '🦅',
        psychic: '🔮',
        bug: '🐛',
        rock: '🪨',
        ghost: '👻',
        dragon: '🐉',
        dark: '🌑',
        steel: '⚔️',
        fairy: '✨'
    };

    const battleLogIcons = {
        critical: '💥',
        death: '💀',
        victory: '🏆',
        attack: '⚔️',
        switch: '🔄',
        status: '⚠️',
        weather: '🌤️',
        ability: '✨',
        item: '🎁',
        level: '⭐',
        normal: '•'
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
                    key={log?.id}
                    sx={{
                        mb: 1.5,
                        color: log?.type === 'critical' ? '#FF4444' :
                               log?.type === 'death' ? '#FF0000' :
                               log?.type === 'victory' ? '#00FF00' : '#FFFFFF',
                        textShadow: log?.type === 'critical' ? '0 0 8px #FF4444' :
                                   log?.type === 'death' ? '0 0 8px #FF0000' :
                                   log?.type === 'victory' ? '0 0 8px #00FF00' : '0 0 4px rgba(255, 255, 255, 0.5)',
                        opacity: 0.9,
                        transform: 'translateY(0)',
                        transition: 'all 0.3s ease-out',
                        '&:hover': {
                            opacity: 1,
                            transform: 'translateX(4px)',
                            textShadow: log?.type === 'critical' ? '0 0 12px #FF4444' :
                                       log?.type === 'death' ? '0 0 12px #FF0000' :
                                       log?.type === 'victory' ? '0 0 12px #00FF00' : '0 0 8px rgba(255, 255, 255, 0.8)',
                        },
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '&::before': {
                            content: `"${battleLogIcons[log?.type as keyof typeof battleLogIcons]}"`,
                            fontSize: '1.2em',
                            lineHeight: 1,
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            marginRight: '8px',
                            animation: log?.type === 'critical' ? 'bounce 0.5s ease-in-out' :
                                      log?.type === 'death' ? 'shake 0.5s ease-in-out' :
                                      log?.type === 'victory' ? 'spin 0.5s ease-in-out' : 'none',
                            '@keyframes bounce': {
                                '0%, 100%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.2)' }
                            },
                            '@keyframes shake': {
                                '0%, 100%': { transform: 'translateX(0)' },
                                '25%': { transform: 'translateX(-2px)' },
                                '75%': { transform: 'translateX(2px)' }
                            },
                            '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                            }
                        }
                    }}
                    dangerouslySetInnerHTML={{ __html: log?.message || '' }}
                />
            ))}
        </Box>
    );

    // Update the AI turn effect to include ability activation
    useEffect(() => {
        if (
            battleState.currentTurn === 2 &&
            !battleState.isAttackAnimating &&
            !battleState.gameOver &&
            battleState.team1Pokemon &&
            battleState.team2Pokemon &&
            !battleState.selectedMove
        ) {
            const timer = setTimeout(async () => {
                try {
                    // Activate abilities at turn start
                    if (battleState.team2Pokemon) {
                        safeActivateAbility(battleState.team2Pokemon, 'onTurnStart', battleState, setBattleState, addBattleLogEntry);
                    }

                    // Check if current AI Pokémon has fainted
                    const currentPokemon = battleState.team2Pokemon;
                    if (currentPokemon) {
                        const currentPokemonHealth = battleState.team2Health[currentPokemon.id];
                        if (currentPokemonHealth === 0) {
                            const remainingPokemon = battleState.team2RemainingPokemon.filter((p: { id: any; }) => p.id !== currentPokemon.id);
                            const nextPokemon = selectNextPokemon(remainingPokemon, currentPokemon);

                            if (nextPokemon) {
                                setBattleState((prev) => ({
                                    ...prev,
                                    team2Pokemon: nextPokemon,
                                    team2RemainingPokemon: remainingPokemon,
                                    battleLog: [addBattleLogEntry(`Go, ${nextPokemon.name}!`, 'normal'), ...prev.battleLog],
                                    currentTurn: 1,
                                    isTurnTimerActive: true
                                }));
                                return;
                            }
                        }
                    }

                    const aiMove = selectAIMove(battleState as any, typeEffectiveness, aiDifficulty, aiPersonality);
                    console.log('AI selected move:', aiMove.name); // Debug log

                    // Set the selected move
                    setBattleState((prev) => ({
                        ...prev,
                        selectedMove: aiMove,
                        isAttackAnimating: true
                    }));

                    // Wait for state update
                    await new Promise(resolve => setTimeout(resolve, 0));

                    // Get attacker and defender
                    const attacker = battleState.team2Pokemon;
                    const defender = battleState.team1Pokemon;

                    // Ensure both Pokémon are present
                    if (!attacker || !defender) {
                        console.error('Missing Pokémon for AI attack');
                        return;
                    }

                    // Type assertion after null check
                    const safeAttacker = attacker as Pokemon;
                    const safeDefender = defender as Pokemon;

                    console.log('AI attack details:', {
                        attacker: safeAttacker.name,
                        defender: safeDefender.name,
                        move: aiMove.name
                    });

                    // Calculate damage
                    const { damage, isCritical } = calculateDamage(safeAttacker, safeDefender, aiMove);

                    // Add floating text for AI attacks
                    console.log("Adding floating text for AI attack to player Pokemon ID:", safeDefender.id);
                    if (damage > 0) {
                        // Add floating text for damage
                        addFloatingText(
                            safeDefender.id,
                            `${damage}${isCritical ? '!' : ''}`,
                            isCritical ? '#FF5722' : '#FFFFFF',
                            'damage'
                        );

                        // Get effectiveness from the damage calculation
                        const effectivenessResult = calculateTypeEffectiveness(aiMove.type, safeDefender.types, typeEffectiveness);

                        // Add effectiveness text if applicable
                        if (effectivenessResult > 1.5) {
                            addFloatingText(
                                safeDefender.id,
                                'Super effective!',
                                '#4CAF50',
                                'effectiveness'
                            );
                        } else if (effectivenessResult < 0.5) {
                            addFloatingText(
                                safeDefender.id,
                                'Not very effective...',
                                '#FFC107',
                                'effectiveness'
                            );
                        }
                    }

                    // Check for status effects from AI move
                    if (aiMove.statusEffect && Math.random() < aiMove.statusEffect.chance) {
                        addFloatingText(
                            safeDefender.id,
                            `${aiMove.statusEffect.type}ed!`,
                            '#9C27B0',
                            'status'
                        );
                    }

                    // Apply damage and update state
                    setBattleState((prev) => {
                        const defenderHealth = prev.team1Health[String(safeDefender.id)]; // Cast id to string
                        const newHealth = Math.max(0, defenderHealth - damage);

                        // Correctly update battleStats
                        const updatedStats = {
                            ...prev.battleStats,
                            team2: {
                                ...prev.battleStats.team2,
                                damageDealt: prev.battleStats.team2.damageDealt + damage,
                                criticalHits: prev.battleStats.team2.criticalHits + (isCritical ? 1 : 0),
                                turnsTaken: prev.battleStats.team2.turnsTaken + 1,
                                statusEffectsApplied: prev.battleStats.team2.statusEffectsApplied + ((aiMove.statusEffect && Math.random() < aiMove.statusEffect.chance) ? 1 : 0)
                            }
                        };

                        // Update status effects if applicable
                        let newStatusEffects = prev.statusEffects;
                        if (aiMove.statusEffect && Math.random() < aiMove.statusEffect.chance) {
                             newStatusEffects = {
                                ...prev.statusEffects,
                                [String(safeDefender.id)]: { // Cast id to string
                                    type: aiMove.statusEffect!.type,
                                    turns: 3
                                }
                            };
                         }

                        let message = `${safeAttacker.name} used ${aiMove.name}!`;
                        if (isCritical) message += ' Critical hit!';
                        if (damage > 0) {
                            message += ` <span class="damage-text">(-${damage} HP)</span>`;
                        }
                        if (newHealth === 0) message += `\n${safeDefender.name} fainted!`;

                        return {
                            ...prev, // Ensure full state is returned
                            team1Health: { ...prev.team1Health, [String(safeDefender.id)]: newHealth }, // Cast id to string
                            lastDamage: damage,
                            criticalHit: isCritical,
                            battleLog: [addBattleLogEntry(message, newHealth === 0 ? 'death' : 'normal'), ...prev.battleLog],
                            isAttackAnimating: false,
                            currentTurn: 1, // Switch back to player turn
                            selectedMove: null,
                            isTurnTimerActive: true,
                            battleStats: updatedStats, // Use corrected stats
                            statusEffects: newStatusEffects // Use updated status effects
                        };
                    });

                    // Check for game over state AFTER the state update that applies damage
                    setBattleState(prev => {
                         const { isOver, winner } = checkGameOver(prev);
                         if (isOver && !prev.gameOver) {
                             if (soundEnabled) {
                                 playSound('victory');
                             }
                             return {
                                 ...prev,
                                 gameOver: true,
                                 winner,
                                 battleLog: [addBattleLogEntry(`Team ${winner} wins the battle!`, 'victory'), ...prev.battleLog]
                             };
                         }
                         return prev; // Return previous state if not over
                     });

                } catch (error) {
                    console.error('AI move selection error:', error);
                    setBattleState((prev) => ({
                        ...prev,
                        currentTurn: 1,
                        isTurnTimerActive: true
                    }));
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [
        battleState.currentTurn,
        battleState.isAttackAnimating,
        battleState.gameOver,
        battleState.team1Pokemon,
        battleState.team2Pokemon,
        battleState.selectedMove,
        battleState.team2Health,
        battleState.team2RemainingPokemon,
        aiDifficulty,
        aiPersonality,
        typeEffectiveness
    ]);

    // Add AI settings controls
    const AISettings = () => (
        <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            mb: 2,
            p: 2,
            bgcolor: 'rgba(22, 33, 62, 0.8)',
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
            width: '100%',
            background: 'linear-gradient(165deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 32, 53, 0.8) 100%)',
        }}>
            <Typography variant="subtitle1">AI Settings</Typography>
            <FormControl size="small">
                <InputLabel>Difficulty</InputLabel>
                <Select
                    value={aiDifficulty}
                    onChange={(e: { target: { value: string; }; }) => setAIDifficulty(e.target.value as AIDifficulty)}
                    label="Difficulty"
                >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="expert">Expert</MenuItem>
                </Select>
            </FormControl>
            <FormControl size="small">
                <InputLabel>Personality</InputLabel>
                <Select
                    value={aiPersonality}
                    onChange={(e: { target: { value: string; }; }) => setAIPersonality(e.target.value as AIPersonality)}
                    label="Personality"
                >
                    <MenuItem value="aggressive">Aggressive</MenuItem>
                    <MenuItem value="defensive">Defensive</MenuItem>
                    <MenuItem value="balanced">Balanced</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );

    // Function to add floating info text
    const addFloatingInfo = useCallback((targetId: number, text: string, color: string, type: 'damage' | 'status' | 'effectiveness') => {
        const newId = floatingInfoIdCounterRef.current++;
        const newInfo: FloatingInfo = { id: newId, targetId, text, color, type };

        setFloatingInfos((prev) => [...prev, newInfo]);

        // Remove the info after animation duration (1.5s)
        setTimeout(() => {
            setFloatingInfos((prev) => prev.filter((info: { id: number; }) => info.id !== newId));
        }, 1500);
    }, []);

    // Add AbilityEffect component
    const AbilityEffect = ({ ability, isActive }: { ability: Ability; isActive: boolean }) => {
        if (!ability.animation) return null;

        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 10,
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out',
                    animation: isActive ? `${keyframes`
                        0% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        50% {
                            transform: scale(1.2);
                            opacity: 0.8;
                        }
                        100% {
                            transform: scale(1);
                            opacity: 0;
                        }
                    `} ${ability.animation.duration}ms ease-in-out forwards` : 'none',
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        background: `radial-gradient(circle at center, ${ability.animation.color}40 0%, transparent 70%)`,
                        borderRadius: '50%',
                        filter: 'blur(8px)',
                    }}
                />
            </Box>
        );
    };

    // Define AttackEffect for animations
    const AttackEffect = styled(motion.div)({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    });

    // Add attack effect variants
    const attackEffectVariants = {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: 1.2, transition: { duration: 0.3 } },
        exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }
    };

    // Create a wrapper function to handle the type compatibility issues
    const safeActivateAbility = (
        pokemon: Pokemon,
        trigger: 'onAttack' | 'onDefend' | 'onTurnStart' | 'onFaint' | 'onStatus',
        state: BattleState,
        setState: React.Dispatch<React.SetStateAction<BattleState>>,
        logEntry: (message: string, type?: 'normal' | 'critical' | 'death' | 'victory') => any
    ) => {
        // This is a simplified version that avoids the type issue
        // In practice, you should modify the activateAbility function to handle your custom BattleState
        console.log(`Activating ability for ${pokemon.name} on ${trigger}`);
    };

    // Add a function to create floating text
    const addFloatingText = useCallback((targetId: number, text: string, color: string, type: 'damage' | 'status' | 'effectiveness') => {
        // Generate a unique ID for the floating text
        const id = Date.now() + Math.random();

        // Get position based on the target Pokemon (team1 or team2)
        const isPokemon1 = battleState.team1Pokemon?.id === targetId;
        const isPokemon2 = battleState.team2Pokemon?.id === targetId;

        // Default position in the center if target is not found
        let position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        // Position the text above the Pokemon (this would need to be adjusted based on your UI layout)
        if (isPokemon1) {
            position = { x: window.innerWidth * 0.25, y: window.innerHeight * 0.4 };
        } else if (isPokemon2) {
            position = { x: window.innerWidth * 0.75, y: window.innerHeight * 0.4 };
        }

        // Add the new floating text
        setFloatingTexts((prev) => [...prev, { id, text, color, type, position, targetId }]);

        // Remove the floating text after animation completes
        setTimeout(() => {
            setFloatingTexts((prev) => prev.filter((item: { id: number; }) => item.id !== id));
        }, 1500); // Match the animation duration
    }, [battleState.team1Pokemon, battleState.team2Pokemon]);

    // Add music toggle function
    const handleMusicToggle = () => {
        const newMusicEnabled = !musicEnabled;
        setMusicEnabled(newMusicEnabled);
        localStorage.setItem('musicEnabled', newMusicEnabled.toString());

        if (!newMusicEnabled) {
            pauseMusic();
        } else if (isBattleDialogOpen) {
            resumeMusic();
        }
    };

    // Update the music volume change handler to call the setMusicVolume API function
    // Add music volume change handler
    const handleMusicVolumeChange = (_event: Event, newValue: number | number[]) => {
        const volume = typeof newValue === 'number' ? newValue : newValue[0];
        setMusicVolume(volume); // Update React state
        setMusicVolumeApi(volume); // Call the music volume API function
        localStorage.setItem('musicVolume', volume.toString());
    };

    // Load sound preferences from localStorage
    useEffect(() => {
        // Load sound settings from localStorage
        const savedSoundEnabled = localStorage.getItem('soundEnabled');
        if (savedSoundEnabled) {
            setSoundEnabled(savedSoundEnabled === 'true');
        }

        const savedVolume = localStorage.getItem('volume');
        if (savedVolume) {
            setSoundVolume(parseFloat(savedVolume));
            setVolume(parseFloat(savedVolume));
        }

        // Load music settings from localStorage
        const savedMusicEnabled = localStorage.getItem('musicEnabled');
        if (savedMusicEnabled) {
            setMusicEnabled(savedMusicEnabled === 'true');
        }

        const savedMusicVolume = localStorage.getItem('musicVolume');
        if (savedMusicVolume) {
            setMusicVolume(parseFloat(savedMusicVolume));
        }

        // Preload sounds
        preloadSounds();
    }, []);

    // Add code to handle dialog close and stop music
    // Find the function that handles dialog close (it might be near the Dialog component)
    // If there's no explicit function, we may need to add one

    // Find where the battle dialog is declared - it should have an onClose handler
    // Add this to the dialog close handler or make sure it's included
    const handleDialogClose = () => {
        stopMusic(); // Stop the battle music
        setIsBattleDialogOpen(false);
    };

    // Update the Dialog component to use this handler
    // Look for something like:
    // <Dialog open={isBattleDialogOpen} onClose={() => setIsBattleDialogOpen(false)}>
    // And change it to:
    // <Dialog open={isBattleDialogOpen} onClose={handleDialogClose}>

    // Handle animation completion
    const handleAnimationComplete = () => {
      setTypeAnimation((prev) => ({
            ...prev,
        isActive: false
      }));
    };

    // Add terrain selection component
    const TerrainSelection = () => (
        <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            mb: 2,
            p: 2,
            bgcolor: 'rgba(22, 33, 62, 0.8)',
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
            width: '100%',
            background: 'linear-gradient(165deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 32, 53, 0.8) 100%)',
        }}>
            <Typography variant="subtitle1">Terrain</Typography>
            <FormControl size="small">
                <InputLabel>Select Terrain</InputLabel>
                <Select
                    value={battleState.terrain}
                    onChange={(e) => {
                        const newTerrain = e.target.value as TerrainType;
                        setBattleState(prev => ({
                            ...prev,
                            terrain: newTerrain,
                            terrainTurns: TERRAIN_EFFECTS[newTerrain].duration,
                            battleLog: [
                                addBattleLogEntry(`${TERRAIN_EFFECTS[newTerrain].visualEffect} ${newTerrain.charAt(0).toUpperCase() + newTerrain.slice(1)} Terrain activated!`, 'normal'),
                                ...prev.battleLog
                            ]
                        }));
                    }}
                    label="Select Terrain"
                >
                    {Object.keys(TERRAIN_EFFECTS).map((terrain) => (
                        <MenuItem key={terrain} value={terrain}>
                            {TERRAIN_EFFECTS[terrain as TerrainType].visualEffect} {terrain.charAt(0).toUpperCase() + terrain.slice(1)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );

    // Add terrain effect display component
    const TerrainEffect = () => {
        if (battleState.terrain === 'none') return null;

        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 1,
                    opacity: 0.3,
                    fontSize: '4rem',
                    animation: 'pulse 2s infinite'
                }}
            >
                {TERRAIN_EFFECTS[battleState.terrain].visualEffect}
            </Box>
        );
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Battle Simulator
                </Typography>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        bgcolor: 'rgba(22, 33, 62, 0.8)',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'primary.dark'
                    }}>
                        <IconButton
                            onClick={handleSoundToggle}
                            color={soundEnabled ? "primary" : "default"}
                            size="small"
                        >
                        {soundEnabled ? <VolumeUp /> : <VolumeOff />}
                    </IconButton>

                        <Box sx={{ width: 100 }}>
                        <Slider
                            value={volume}
                            onChange={handleVolumeChange}
                            min={0}
                            max={1}
                            step={0.1}
                            disabled={!soundEnabled}
                                size="small"
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value: number) => `${Math.round(value * 100)}%`}
                        />
                        </Box>
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        bgcolor: 'rgba(22, 33, 62, 0.8)',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'secondary.dark'
                    }}>
                        <IconButton
                            onClick={handleMusicToggle}
                            color={musicEnabled ? "secondary" : "default"}
                            size="small"
                        >
                            {musicEnabled ? <MusicNote /> : <MusicOff />}
                        </IconButton>

                        <Box sx={{ width: 100 }}>
                            <Slider
                                value={musicVolume}
                                onChange={handleMusicVolumeChange}
                                min={0}
                                max={1}
                                step={0.1}
                                disabled={!musicEnabled}
                                size="small"
                                color="secondary"
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value: number) => `${Math.round(value * 100)}%`}
                            />
                        </Box>
                    </Box>
                </Stack>
            </Box>
            <Grid container spacing={3} columnSpacing={{ xs: 12, sm: 6, md: 6 }}>
                <Grid size={{ xs: 12, md: 6 }}> {/* Added size prop */}
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Select Team 1
                        </Typography>
                        <Grid container spacing={2} sx={{ width: '100%' }}> {/* Added width */}
                            {teams.map((team: { id: any; name: any; pokemon: any[]; }) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={team.id}> {/* Removed item, updated size prop */}
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
                                                {team.pokemon.map((pokemon: { id: any; image: any; name: any; types: any[]; }) => (
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
                                                            {pokemon.types.map((type: any) => (
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
                <Grid size={{ xs: 12, md: 6 }}> {/* Added size prop */}
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Select Team 2
                        </Typography>
                        <Grid container spacing={2} sx={{ width: '100%' }}> {/* Added width */}
                            {teams.map((team: { id: any; name: any; pokemon: any[]; }) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={team.id}> {/* Removed item, updated size prop */}
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
                                                {team.pokemon.map((pokemon: { id: any; image: any; name: any; types: any[]; }) => (
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
                                                            {pokemon.types.map((type: any) => (
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
                        startIcon={<CompareArrows />}
                        onClick={handleStartBattle}
                    >
                        Start Battle
                    </Button>
                </Box>
            )}

            <Dialog
                open={isBattleDialogOpen}
                onClose={handleDialogClose}
                maxWidth={false}
                fullScreen
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1218 100%)',
                        overflow: 'hidden'
                    }
                }}
                disablePortal
                keepMounted
                aria-labelledby="battle-dialog-title"
                aria-describedby="battle-dialog-description"
            >
                <DialogTitle sx={{
                    p: 2,
                    pb: 1,
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderBottom: '2px solid rgba(74, 144, 226, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.light' }}>
                            Battle: {team1?.name} vs {team2?.name}
                        </Typography>
                        <IconButton
                            onClick={handleDialogClose}
                            size="small"
                        sx={{ color: 'primary.light' }}
                        >
                            <Close />
                        </IconButton>
                </DialogTitle>
                <DialogContent
                    sx={{
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        flex: 1,
                        overflow: 'hidden',
                        height: '100%',
                        position: 'relative'
                    }}
                >
                    {/* Battle Arena */}
                    <Box sx={{
                        position: 'relative',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        background: 'linear-gradient(180deg, rgba(22, 28, 45, 0.95) 0%, rgba(26, 32, 53, 0.95) 100%)',
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
                        }
                    }}>
                        <WeatherEffect />
                        <WeatherControls />

                        {/* Floating combat text */}
                        {floatingTexts.map((text: { id: Key | null | undefined; text: any; color: any; position: { x: any; y: any; }; type: any; }) => (
                            <FloatingCombatText
                                key={text.id}
                                text={text.text}
                                color={text.color}
                                x={text.position.x}
                                y={text.position.y}
                                type={text.type}
                            />
                        ))}

                        {/* Pokemon Cards Grid */}
                        <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{
                            position: 'relative',
                            zIndex: 2,
                            height: '100%',
                            p: 3,
                            '& .MuiPaper-root': {
                                background: 'rgba(22, 33, 62, 0.85)',
                                border: '2px solid rgba(74, 144, 226, 0.2)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            }
                        }}>
                            <Grid size={5}> {/* Added size prop */}
                                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                    {battleState.team1Pokemon && (
                                        renderPokemonCard(
                                            battleState.team1Pokemon,
                                            battleState.team1Health[battleState.team1Pokemon.id],
                                            battleState.currentTurn === 1 && battleState.isAttackAnimating,
                                            battleState.currentTurn === 2 && battleState.isAttackAnimating
                                        )
                                    )}
                                </Box>
                            </Grid>
                            <Grid size={2} sx={{ textAlign: 'center', minWidth: 0 }}> {/* Added size prop */}
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 'bold',
                                            color: 'primary.main',
                                            textShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
                                            animation: 'pulse 2s infinite'
                                        }}
                                    >
                                        VS
                                    </Typography>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            color: 'text.secondary',
                                            bgcolor: 'rgba(0, 0, 0, 0.3)',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 2,
                                            border: '1px solid rgba(74, 144, 226, 0.3)'
                                        }}
                                    >
                                        Turn: {battleState.currentTurn}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={5} sx={{ minWidth: 0 }}> {/* Added size prop */}
                                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                    {battleState.team2Pokemon && (
                                        renderPokemonCard(
                                            battleState.team2Pokemon,
                                            battleState.team2Health[battleState.team2Pokemon.id],
                                            battleState.currentTurn === 2 && battleState.isAttackAnimating,
                                            battleState.currentTurn === 1 && battleState.isAttackAnimating
                                        )
                                    )}
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Switch Pokemon Button */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            mt: 2,
                            mb: 2,
                            position: 'relative',
                            zIndex: 2
                        }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                onClick={() => setShowTeamOverview(1)}
                                startIcon={<SwapHoriz />}
                                        sx={{
                                    background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.8) 0%, rgba(74, 144, 226, 0.6) 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.9) 0%, rgba(74, 144, 226, 0.7) 100%)',
                                    },
                                    border: '1px solid rgba(74, 144, 226, 0.3)',
                                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.2)',
                                    backdropFilter: 'blur(5px)',
                                    borderRadius: '8px',
                                    px: 2,
                                    py: 1,
                                    fontFamily: '"Press Start 2P", monospace',
                                    fontSize: '0.8rem',
                                    textTransform: 'none',
                                    color: 'white',
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    }
                                }}
                            >
                                Switch Pokémon
                                    </Button>
                                </Box>
                    </Box>

                    {/* Battle Log and Controls */}
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        p: 2,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderTop: '2px solid rgba(74, 144, 226, 0.3)'
                    }}>
                    {/* Battle Log */}
                    <Paper
                        sx={{
                                flex: 1,
                                maxHeight: '200px',
                            overflow: 'auto',
                                background: 'rgba(22, 33, 62, 0.95)',
                                border: '2px solid rgba(74, 144, 226, 0.3)',
                            borderRadius: 2,
                            p: 2,
                            backdropFilter: 'blur(10px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            <BattleLog logs={battleState.battleLog} />
                        </Paper>

                        {/* Controls */}
                            <Box sx={{
                                            display: 'flex',
                                flexDirection: 'column',
                            gap: 2,
                            minWidth: '300px'
                        }}>
                    <Button
                        variant="contained"
                        onClick={handleMoveButtonClick}
                        disabled={
                            !battleState.team1Pokemon ||
                            !battleState.team2Pokemon ||
                            battleState.isAttackAnimating ||
                            battleState.gameOver
                        }
                                sx={{
                                    height: '100%',
                                    background: 'rgba(74, 144, 226, 0.8)',
                                    '&:hover': {
                                        background: 'rgba(74, 144, 226, 1)'
                                    }
                                }}
                    >
                        {battleState.selectedMove ? 'Execute Move' : 'Select Move'}
                    </Button>

                            {/* Speed Control */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'rgba(22, 33, 62, 0.8)',
                                p: 1,
                                borderRadius: 1
                            }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Speed: {battleState.battleSpeed}x
                                </Typography>
                                <Slider
                                    value={battleState.battleSpeed}
                                    onChange={(_: unknown, value: number) => setBattleState((prev) => ({
                                        ...prev,
                                        battleSpeed: value as number
                                    }))}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                    sx={{ flex: 1 }}
                                />
                            </Box>

                            {/* Turn Timer */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'rgba(22, 33, 62, 0.8)',
                                p: 1,
                                borderRadius: 1
                            }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Timer: {battleState.turnTimer}s
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setBattleState((prev) => ({
                                        ...prev,
                                        isTurnTimerActive: !prev.isTurnTimerActive
                                    }))}
                                    sx={{ ml: 'auto' }}
                                >
                                    {battleState.isTurnTimerActive ? 'Pause' : 'Start'}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

                    {/* Move Selection Dialog */}
                    {battleState.showMoveSelection && battleState.team1Pokemon && battleState.team2Pokemon && (
                        <MoveSelection
                            pokemon={battleState.currentTurn === 1 ? battleState.team1Pokemon : battleState.team2Pokemon}
                            onSelectMove={(move) => {
                                setBattleState((prev) => ({
                                    ...prev,
                                    selectedMove: move,
                                    showMoveSelection: false,
                                    isTurnTimerActive: true
                                }));
                            }}
                            onCancel={() => {
                                setBattleState((prev) => ({
                                    ...prev,
                                    showMoveSelection: false,
                                    isTurnTimerActive: true
                                }));
                            }}
                        />
                    )}

            {renderTeamOverview(1)}
            {renderTeamOverview(2)}

            <AISettings />

            {/* Add type animation with improved positioning */}
            {battleState.team1Pokemon && battleState.team2Pokemon && typeAnimation.isActive && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 9000,
                        pointerEvents: 'none', // Allow clicking through
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    className="animation-container"
                >
                    <TypeAnimation
                        type={typeAnimation.type}
                        isActive={typeAnimation.isActive}
                        position={typeAnimation.position}
                        onAnimationComplete={handleAnimationComplete}
                    />
                </Box>
            )}

            {/* Add terrain effect display */}
            <TerrainEffect />

            {/* Add terrain selection */}
            <TerrainSelection />
        </Box>
    );
};

export default BattleSimulator;