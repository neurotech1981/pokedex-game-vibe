import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Popover,
    Select,
    Slider,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MusicOffIcon from '@mui/icons-material/MusicOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloudIcon from '@mui/icons-material/Cloud';
import LandscapeIcon from '@mui/icons-material/Landscape';
import BoltIcon from '@mui/icons-material/Bolt';
import BackpackIcon from '@mui/icons-material/Backpack';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SpeedIcon from '@mui/icons-material/Speed';

import type { Pokemon, Team } from '../types/pokemon';
import type { TerrainType } from '../types/terrain';
import { getAbilityForTypes } from '../types/abilities';
import type { Move } from '../data/moves';
import type { ItemId } from '../data/items';
import { BALLS, BALL_IDS, ITEMS, ITEM_IDS, createInventory } from '../data/items';
import type { TypeChart } from '../data/typeChart';
import type {
    BattleAction,
    BattleMon,
    EngineState,
    TeamId,
    WeatherType,
} from '../utils/battleEngine';
import {
    beginBattle,
    canUseItem,
    createBattleMon,
    createEngineState,
    getActiveMon,
    getSwitchableMons,
    resolveAction,
    resolveForcedSwitch,
    setTerrain as engineSetTerrain,
    setWeather as engineSetWeather,
} from '../utils/battleEngine';
import type { AIDifficulty, AIPersonality } from '../utils/battleAI';
import { selectAIAction, selectAIForcedSwitch } from '../utils/battleAI';
import BattleScene3D from './battle/BattleScene3D';
import BattleLog from './battle/BattleLog';
import MoveSelection from './battle/MoveSelection';
import FloatingCombatText from './FloatingCombatText';
import PostBattlePanel from './battle/PostBattlePanel';
import BattleSetup, { RANDOM_ID } from './battle/BattleSetup';
import type { PlayerProfile } from '../utils/progression';
import { getMonProgress } from '../utils/progression';
import {
    GAUNTLET_XP_MULTIPLIER,
    createGauntletStage,
    isBossStage,
    nextStageHpPct,
} from '../utils/gauntlet';
import { recruitStatMod } from '../utils/recruitment';
import { getMovesetForPokemon } from '../utils/movesets';
import type { Biome } from '../utils/safari';
import { BIOMES, getBiome, rollWildEncounter } from '../utils/safari';
import { getAchievement } from '../utils/achievements';
import { TOWER_LEVEL, TOWER_TEAM_SIZE, isTowerBossBattle, pickTowerOpponents } from '../utils/tower';
import { backgroundUrl, pickBattleBackgroundId } from '../data/battleBackgrounds';
import type { LeagueStage } from '../data/league';
import {
    REMATCH_LEVEL_BONUS,
    fetchLeagueTeam,
    getLeagueStage,
    leagueStageLevel,
    nextLeagueStage,
    trainerPortraitUrl,
} from '../data/league';
import LeagueCard from './battle/LeagueCard';
import type { VsIntroPayload } from './battle/VsIntro';
import VsIntro from './battle/VsIntro';
import { useBattleEvents } from '../hooks/useBattleEvents';
import { useBattleResults } from '../hooks/useBattleResults';
import { STATUS_COLORS, STATUS_LABELS, STAT_ABBR, WEATHER_LABELS, capitalize, hpColor } from './battle/battleUi';
import { getBattleSprites } from '../utils/spriteSources';
import RecruitOfferCard from './battle/RecruitOfferCard';
import EvolutionPrompt from './battle/EvolutionPrompt';
import {
    getVolume,
    playCry,
    playMusic,
    playSound,
    preloadSounds,
    setMusicVolume,
    setVolume,
    stopMusic,
} from '../utils/soundEffects';

interface Props {
    teams: Team[];
    pokemons: Pokemon[];
    getTypeColor: (type: string) => string;
    typeEffectiveness: TypeChart;
    onAddPokemonToTeam: (teamId: string, pokemon: Pokemon) => void;
    onEvolvePokemon: (oldId: number, newPokemon: Pokemon) => void;
    profile: PlayerProfile;
    updateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

const generateRandomTeam = (pokemons: Pokemon[], size = 6): Team => {
    const pool = [...pokemons];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { id: RANDOM_ID, name: 'Random Team', pokemon: pool.slice(0, Math.min(size, pool.length)) };
};


/** Smoothly counts toward a target value (for HP readouts). */
const useAnimatedNumber = (target: number): number => {
    const [display, setDisplay] = useState(target);
    const displayRef = useRef(target);
    useEffect(() => {
        const from = displayRef.current;
        if (from === target) return;
        const startTime = performance.now();
        const duration = 500;
        let raf = 0;
        const tick = (now: number) => {
            const p = Math.min(1, (now - startTime) / duration);
            const eased = 1 - (1 - p) * (1 - p);
            const value = Math.round(from + (target - from) * eased);
            displayRef.current = value;
            setDisplay(value);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target]);
    return display;
};

/** Two-layer HP bar: a springy colored fill plus a white "ghost" that lags behind on damage. */
const AnimatedHpBar: React.FC<{ pct: number; height: number; color: string }> = ({ pct, height, color }) => (
    <Box
        sx={{
            flexGrow: 1,
            height,
            borderRadius: height / 2,
            bgcolor: 'rgba(255,255,255,0.12)',
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        <motion.div
            initial={false}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            style={{
                position: 'absolute',
                inset: 0,
                width: `${pct * 100}%`,
                borderRadius: height / 2,
                background: 'rgba(255,255,255,0.55)',
            }}
        />
        <motion.div
            initial={false}
            animate={{ width: `${pct * 100}%`, backgroundColor: color }}
            transition={{ type: 'spring', stiffness: 210, damping: 26 }}
            style={{
                position: 'absolute',
                inset: 0,
                width: `${pct * 100}%`,
                borderRadius: height / 2,
                backgroundColor: color,
            }}
        />
    </Box>
);

const MonStatusPanel: React.FC<{
    mon: BattleMon;
    align: 'left' | 'right';
    getTypeColor: (type: string) => string;
}> = ({ mon, align, getTypeColor }) => {
    const hpPct = mon.currentHp / mon.maxHp;
    const displayHp = useAnimatedNumber(mon.currentHp);
    return (
        <motion.div
            key={mon.key}
            initial={{ x: align === 'left' ? -90 : 90, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
        <Paper
            elevation={6}
            sx={{
                p: { xs: 1, sm: 1.5 },
                minWidth: { xs: 180, sm: 230 },
                background: 'rgba(13, 20, 40, 0.88)',
                border: mon.shiny ? '2px solid rgba(255, 215, 0, 0.65)' : '2px solid rgba(74, 144, 226, 0.5)',
                borderRadius: 3,
                backdropFilter: 'blur(6px)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textTransform: 'capitalize', color: '#fff' }}>
                    {mon.pokemon.name}
                </Typography>
                <Chip label={`Lv ${mon.level}`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                {mon.status && (
                    <Chip
                        label={STATUS_LABELS[mon.status.type]}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', bgcolor: STATUS_COLORS[mon.status.type], color: '#fff', fontWeight: 'bold' }}
                    />
                )}
                {(Object.entries(mon.stages) as [string, number][])
                    .filter(([, stage]) => stage !== 0)
                    .map(([stat, stage]) => (
                        <Chip
                            key={stat}
                            label={`${STAT_ABBR[stat]} ${stage > 0 ? '+' : ''}${stage}`}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                bgcolor: stage > 0 ? '#ff9800' : '#e53935',
                                color: '#fff',
                                fontWeight: 'bold',
                            }}
                        />
                    ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, my: 0.5, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
                {mon.pokemon.types.map(type => (
                    <Chip
                        key={type}
                        label={type}
                        size="small"
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: getTypeColor(type), color: '#fff', textTransform: 'uppercase' }}
                    />
                ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#aaa', width: 24 }}>HP</Typography>
                <AnimatedHpBar pct={hpPct} height={10} color={hpColor(hpPct)} />
                <Typography variant="caption" sx={{ color: '#fff', minWidth: 58, textAlign: 'right' }}>
                    {displayHp}/{mon.maxHp}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <BoltIcon sx={{ color: '#ffd54f', fontSize: '0.9rem' }} />
                <LinearProgress
                    variant="determinate"
                    value={(mon.energy / mon.maxEnergy) * 100}
                    sx={{
                        flexGrow: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#ffd54f', transition: 'transform 0.6s ease' },
                    }}
                />
                <Typography variant="caption" sx={{ color: '#ffd54f', minWidth: 58, textAlign: 'right' }}>
                    {mon.energy}/{mon.maxEnergy}
                </Typography>
            </Box>
        </Paper>
        </motion.div>
    );
};

const TeamRoster: React.FC<{
    state: EngineState;
    team: TeamId;
}> = ({ state, team }) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
        {state.order[team].map(key => {
            const mon = state.mons[key];
            const isActive = state.active[team] === key;
            const fainted = mon.currentHp <= 0;
            return (
                <Tooltip key={key} title={`${capitalize(mon.pokemon.name)} — ${mon.currentHp}/${mon.maxHp} HP`}>
                    <Box
                        sx={{
                            position: 'relative',
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            border: isActive ? '2px solid #4A90E2' : '2px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.4)',
                            opacity: fainted ? 0.35 : 1,
                            filter: fainted ? 'grayscale(1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        <img src={mon.pokemon.image} alt={mon.pokemon.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <Box sx={{ position: 'absolute', bottom: 2, left: 4, right: 4, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <Box sx={{ width: `${(mon.currentHp / mon.maxHp) * 100}%`, height: '100%', borderRadius: 2, bgcolor: hpColor(mon.currentHp / mon.maxHp) }} />
                        </Box>
                    </Box>
                </Tooltip>
            );
        })}
    </Box>
);

const BattleSimulator: React.FC<Props> = ({ teams, pokemons, getTypeColor, typeEffectiveness, onAddPokemonToTeam, onEvolvePokemon, profile, updateProfile }) => {
    const [team1Id, setTeam1Id] = useState<string>(() => localStorage.getItem('battleSimulator_team1') || '');
    const [team2Id, setTeam2Id] = useState<string>(() => localStorage.getItem('battleSimulator_team2') || '');
    const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('intermediate');
    const [aiPersonality, setAIPersonality] = useState<AIPersonality>('balanced');

    const [engine, setEngine] = useState<EngineState | null>(null);
    const [showSwitchDialog, setShowSwitchDialog] = useState(false);
    const [confirmExit, setConfirmExit] = useState(false);
    const [volumeAnchor, setVolumeAnchor] = useState<HTMLElement | null>(null);
    const [bagAnchor, setBagAnchor] = useState<HTMLElement | null>(null);
    const [ballAnchor, setBallAnchor] = useState<HTMLElement | null>(null);
    const [randomTeam2, setRandomTeam2] = useState<Team | null>(null);
    const [busy, setBusy] = useState(false);

    // Gauntlet run state: null = quick battle mode
    const [gauntletStage, setGauntletStage] = useState<number | null>(null);
    const gauntletHpRef = useRef<Record<number, number>>({});

    // Safari (wild encounter) state
    const [safariBiomeId, setSafariBiomeId] = useState<string | null>(null);
    const [selectedBiomeId, setSelectedBiomeId] = useState<string>(BIOMES[0].id);

    // Battle Tower state
    const [towerMode, setTowerMode] = useState(false);

    // League challenge state
    const [leagueStageId, setLeagueStageId] = useState<string | null>(null);
    const [leagueRematch, setLeagueRematch] = useState(false);
    const [leagueError, setLeagueError] = useState<string | null>(null);
    const leagueStage = leagueStageId ? getLeagueStage(leagueStageId) ?? null : null;

    // Guards async battle start (moveset fetches) against double-clicks
    const [starting, setStarting] = useState(false);

    // Opponent mode: AI or a second human sharing the keyboard (hotseat)
    const [opponentKind, setOpponentKind] = useState<'ai' | 'human'>('ai');
    const hotseat = opponentKind === 'human';

    // Battle pacing: divides every scripted delay (busy lock, AI think time)
    const [battleSpeed, setBattleSpeed] = useState<number>(() => {
        const saved = Number(localStorage.getItem('battleSpeed'));
        return saved === 1.5 || saved === 2 ? saved : 1;
    });
    useEffect(() => {
        localStorage.setItem('battleSpeed', String(battleSpeed));
    }, [battleSpeed]);
    const paced = useCallback((ms: number) => ms / battleSpeed, [battleSpeed]);

    // Battle scene backdrop, chosen once per battle
    const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

    // VS intro: engine events are deferred until the splash dismisses
    const [intro, setIntro] = useState<VsIntroPayload | null>(null);
    const pendingBeginRef = useRef<EngineState | null>(null);

    const [soundVolume, setSoundVolume] = useState(getVolume());
    const [musicOn, setMusicOn] = useState(true);
    const [debugMode, setDebugMode] = useState(false);

    // Battle presentation (log, floating text, scene fx, per-battle stats)
    const {
        logs,
        floatingTexts,
        fx,
        battleStatsRef,
        addLog,
        processEvents,
        resetEvents,
    } = useBattleEvents({ hotseat, onEngineState: setEngine });

    // Post-battle consequences (XP, drops, badges, recruits, evolutions)
    const {
        battleResult,
        recruitOffer,
        setRecruitOffer,
        evolutionQueue,
        handleRecruitToTeam,
        handleRecruitToBox,
        handleEvolve,
        handleDeclineEvolve,
        resetResults,
    } = useBattleResults({
        engine,
        hotseat,
        gauntletStage,
        leagueStage,
        leagueRematch,
        towerMode,
        pokemons,
        profile,
        updateProfile,
        battleStatsRef,
        addLog,
        onAddPokemonToTeam,
        onEvolvePokemon,
    });

    // Compact (stacked) battle dock on small screens
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        preloadSounds();
        return () => stopMusic();
    }, []);

    useEffect(() => {
        setVolume(soundVolume);
    }, [soundVolume]);

    useEffect(() => {
        if (team1Id) localStorage.setItem('battleSimulator_team1', team1Id);
    }, [team1Id]);
    useEffect(() => {
        if (team2Id && team2Id !== RANDOM_ID) localStorage.setItem('battleSimulator_team2', team2Id);
    }, [team2Id]);


    const runPlayerAction = useCallback((action: BattleAction) => {
        if (!engine || engine.phase !== 'selecting' || busy) return;
        // In hotseat both teams are human; vs AI only team 1 takes input
        if (engine.currentTurn !== 1 && !hotseat) return;
        setBusy(true);
        processEvents(resolveAction(engine, action, typeEffectiveness));
        setTimeout(() => setBusy(false), paced(1200));
    }, [busy, engine, hotseat, paced, processEvents, typeEffectiveness]);

    // AI turn (never fires in hotseat or under the VS intro)
    useEffect(() => {
        if (intro !== null || hotseat || !engine || engine.phase !== 'selecting' || engine.currentTurn !== 2) return;
        const timer = setTimeout(() => {
            const action = selectAIAction(engine, typeEffectiveness, aiDifficulty, aiPersonality);
            processEvents(resolveAction(engine, action, typeEffectiveness));
        }, paced(1500));
        return () => clearTimeout(timer);
    }, [engine, hotseat, intro, aiDifficulty, aiPersonality, paced, processEvents, typeEffectiveness]);

    // AI forced switch (never fires in hotseat or under the VS intro)
    useEffect(() => {
        if (intro !== null || hotseat || !engine || engine.phase !== 'awaitingSwitch' || engine.pendingSwitch !== 2) return;
        const timer = setTimeout(() => {
            const key = selectAIForcedSwitch(engine, 2, typeEffectiveness);
            if (key) processEvents(resolveForcedSwitch(engine, key));
        }, paced(1000));
        return () => clearTimeout(timer);
    }, [engine, hotseat, intro, paced, processEvents, typeEffectiveness]);

    const playerAvgLevel = (t1: Team): number => {
        const levels = t1.pokemon.map(p => getMonProgress(profile, p.id).level);
        return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
    };

    const launchBattle = (state: EngineState, openingLog: string, introPayload: VsIntroPayload) => {
        resetEvents();
        resetResults();
        setBusy(true); // locked until the VS intro dismisses
        playSound('battleStart');
        if (musicOn) playMusic('battleTheme');
        addLog(openingLog);
        addLog(`${capitalize(getActiveMon(state, 1).pokemon.name)} and ${capitalize(getActiveMon(state, 2).pokemon.name)} enter the arena!`);
        // Defer beginBattle (speed order, Intimidate, Quick Claw) until after
        // the intro so its events land on a visible arena
        setEngine(state);
        pendingBeginRef.current = state;
        setIntro(introPayload);
    };

    const handleIntroDone = useCallback(() => {
        setIntro(null);
        const pending = pendingBeginRef.current;
        pendingBeginRef.current = null;
        if (pending) {
            // Both leads call out as they materialize
            playCry(getActiveMon(pending, 1).pokemon.id, 0.8);
            setTimeout(() => playCry(getActiveMon(pending, 2).pokemon.id, 0.8), 650);
            processEvents(beginBattle(pending));
        }
        setTimeout(() => setBusy(false), paced(400));
    }, [paced, processEvents]);

    // Real movesets are fetched per species (cached, falls back to
    // type-derived moves) — resolve them for every combatant up front.
    const fetchMovesets = async (mons: Pokemon[]): Promise<Map<number, Move[]>> => {
        const unique = [...new Map(mons.map(p => [p.id, p])).values()];
        const movesets = await Promise.all(unique.map(p => getMovesetForPokemon(p)));
        return new Map(unique.map((p, i) => [p.id, movesets[i]]));
    };

    const handleStartBattle = async () => {
        if (starting) return;
        const t1 = teams.find(t => t.id === team1Id);
        const t2 = team2Id === RANDOM_ID ? randomTeam2 : teams.find(t => t.id === team2Id);
        if (!t1 || !t2 || t1.pokemon.length === 0 || t2.pokemon.length === 0) return;

        setStarting(true);
        try {
            const movesets = await fetchMovesets([...t1.pokemon, ...t2.pokemon]);

            // Your mons fight at their persisted levels; enemies scale to your
            // team's average with a difficulty offset and a little jitter.
            const avgLevel = playerAvgLevel(t1);
            const difficultyOffset = { beginner: -5, intermediate: 0, expert: 5 }[aiDifficulty];
            const enemyLevel = () =>
                Math.max(5, Math.min(100, avgLevel + difficultyOffset + Math.floor(Math.random() * 5) - 2));

            const team1 = t1.pokemon.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(p, 1, i, progress.level, getAbilityForTypes(p.types), {
                    shiny: progress.shiny,
                    statMod: recruitStatMod(progress.elite),
                    // Hotseat is a friendly: no held-item edge for player 1
                    heldItem: hotseat ? undefined : progress.heldItem,
                    moves: progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                });
            });
            const team2 = t2.pokemon.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(
                    p,
                    2,
                    i,
                    // Player 2's mons also fight at persisted levels in hotseat
                    hotseat ? progress.level : enemyLevel(),
                    getAbilityForTypes(p.types),
                    {
                        // Hotseat player 2 gets their custom sets too
                        moves: hotseat && progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                    }
                );
            });

            setGauntletStage(null);
            setLeagueStageId(null);
            setSafariBiomeId(null);
            setTowerMode(false);
            gauntletHpRef.current = {};
            setBackdropUrl(backgroundUrl(pickBattleBackgroundId({ rng: Math.random })));
            // Hotseat gives both sides the stock inventory (profile items stay untouched)
            const state = createEngineState(team1, team2, {
                1: hotseat ? createInventory() : { ...profile.items },
                2: createInventory(),
            });
            launchBattle(
                state,
                hotseat
                    ? `Hotseat battle: ${t1.name} (Player 1) vs ${t2.name} (Player 2)!`
                    : `Battle started: ${t1.name} vs ${t2.name}!`,
                {
                    leftLabel: hotseat ? 'Player 1' : t1.name,
                    leftSprites: t1.pokemon.map(p => getBattleSprites(p.id).artwork),
                    rightLabel: hotseat ? 'Player 2' : 'AI Trainer',
                    rightSubLabel: hotseat ? t2.name : capitalize(aiDifficulty),
                    rightKind: hotseat ? 'human' : 'ai',
                }
            );
        } finally {
            setStarting(false);
        }
    };

    const startGauntletStage = async (stageIndex: number) => {
        if (starting) return;
        const t1 = teams.find(t => t.id === team1Id);
        if (!t1 || t1.pokemon.length === 0 || pokemons.length === 0) return;

        setStarting(true);
        try {
            const stage = createGauntletStage(pokemons, stageIndex, playerAvgLevel(t1), Math.random);
            const movesets = await fetchMovesets([...t1.pokemon, ...stage.opponents.map(o => o.pokemon)]);

            const team1 = t1.pokemon.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(p, 1, i, progress.level, getAbilityForTypes(p.types), {
                    currentHpPct: gauntletHpRef.current[i] ?? 1,
                    shiny: progress.shiny,
                    statMod: recruitStatMod(progress.elite),
                    heldItem: progress.heldItem,
                    moves: progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                });
            });
            const team2 = stage.opponents.map((o, i) =>
                createBattleMon(o.pokemon, 2, i, o.level, getAbilityForTypes(o.pokemon.types), {
                    shiny: o.shiny,
                    statMod: o.statMod,
                    moves: movesets.get(o.pokemon.id),
                })
            );

            setAIDifficulty(stage.difficulty);
            setAIPersonality(stage.personality);
            setOpponentKind('ai'); // gauntlet is always vs AI
            setGauntletStage(stageIndex);
            setLeagueStageId(null);
            setSafariBiomeId(null);
            setTowerMode(false);
            setBackdropUrl(backgroundUrl(pickBattleBackgroundId({ isBoss: stage.isBoss, rng: Math.random })));
            const state = createEngineState(team1, team2, { 1: { ...profile.items }, 2: createInventory() });
            launchBattle(state, `Gauntlet stage ${stageIndex}${stage.isBoss ? ' — BOSS BATTLE!' : ''}`, {
                leftLabel: t1.name,
                leftSprites: t1.pokemon.map(p => getBattleSprites(p.id).artwork),
                rightLabel: 'Gauntlet',
                rightSubLabel: `Stage ${stageIndex}${stage.isBoss ? ' — BOSS' : ''}`,
                rightKind: 'ai',
            });
        } finally {
            setStarting(false);
        }
    };

    const handleStartGauntlet = () => {
        gauntletHpRef.current = {};
        startGauntletStage(1);
    };

    const startLeagueStage = async (stage: LeagueStage, rematch = false) => {
        if (starting) return;
        const t1 = teams.find(t => t.id === team1Id);
        if (!t1 || t1.pokemon.length === 0) return;

        setStarting(true);
        setLeagueError(null);
        try {
            const roster = await fetchLeagueTeam(stage);
            const movesets = await fetchMovesets([...t1.pokemon, ...roster]);
            const stageLevel = Math.min(100, leagueStageLevel(stage, playerAvgLevel(t1)) + (rematch ? REMATCH_LEVEL_BONUS : 0));

            const team1 = t1.pokemon.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(p, 1, i, progress.level, getAbilityForTypes(p.types), {
                    shiny: progress.shiny,
                    statMod: recruitStatMod(progress.elite),
                    heldItem: progress.heldItem,
                    moves: progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                });
            });
            const team2 = roster.map((p, i) => {
                const entry = stage.team[i];
                return createBattleMon(p, 2, i, Math.min(100, stageLevel + entry.levelOffset), getAbilityForTypes(p.types), {
                    heldItem: entry.heldItem,
                    moves: movesets.get(p.id),
                });
            });

            setOpponentKind('ai');
            setAIDifficulty(stage.difficulty);
            setAIPersonality(stage.personality);
            setGauntletStage(null);
            gauntletHpRef.current = {};
            setLeagueStageId(stage.id);
            setLeagueRematch(rematch);
            setSafariBiomeId(null);
            setTowerMode(false);
            setBackdropUrl(backgroundUrl(stage.backdropId));
            const state = createEngineState(team1, team2, { 1: { ...profile.items }, 2: createInventory() });
            launchBattle(state, rematch ? `Round 2! ${stage.title} ${stage.name} wants revenge!` : `${stage.title} ${stage.name} challenges you!`, {
                leftLabel: t1.name,
                leftSprites: t1.pokemon.map(p => getBattleSprites(p.id).artwork),
                rightLabel: stage.name,
                rightSubLabel: rematch ? `${stage.title} — Round 2` : stage.title,
                rightPortrait: trainerPortraitUrl(stage.portrait),
                rightKind: 'trainer',
            });
        } catch {
            setLeagueError('Couldn’t reach PokeAPI to build the trainer’s team — check your connection and retry.');
        } finally {
            setStarting(false);
        }
    };

    const handleLeagueContinue = () => {
        const next = nextLeagueStage(profile.league.defeated);
        if (next) void startLeagueStage(next);
    };

    const startTowerBattle = async () => {
        if (starting) return;
        const t1 = teams.find(t => t.id === team1Id);
        if (!t1 || t1.pokemon.length === 0 || pokemons.length === 0) return;
        const battleNumber = profile.records.towerStreak + 1;
        const opponents = pickTowerOpponents(pokemons, battleNumber, Math.random);
        if (opponents.length === 0) return;

        setStarting(true);
        try {
            const picks = t1.pokemon.slice(0, TOWER_TEAM_SIZE);
            const movesets = await fetchMovesets([...picks, ...opponents.map(o => o.pokemon)]);

            // Tower rules: everyone at level 50, no held items, no elite mods
            const team1 = picks.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(p, 1, i, TOWER_LEVEL, getAbilityForTypes(p.types), {
                    shiny: progress.shiny, // cosmetic only
                    moves: progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                });
            });
            const team2 = opponents.map((o, i) =>
                createBattleMon(o.pokemon, 2, i, TOWER_LEVEL, getAbilityForTypes(o.pokemon.types), {
                    statMod: recruitStatMod(o.elite),
                    shiny: o.elite,
                    moves: movesets.get(o.pokemon.id),
                })
            );

            setOpponentKind('ai');
            setAIDifficulty('expert');
            setAIPersonality((['aggressive', 'defensive', 'balanced'] as const)[Math.floor(Math.random() * 3)]);
            setGauntletStage(null);
            setLeagueStageId(null);
            setSafariBiomeId(null);
            setTowerMode(true);
            gauntletHpRef.current = {};
            setBackdropUrl(backgroundUrl('skypillar'));
            // Fixed loadout each battle — the tower never touches your bag
            const state = createEngineState(team1, team2, { 1: createInventory(), 2: createInventory() });
            const boss = isTowerBossBattle(battleNumber);
            launchBattle(state, `Battle Tower — battle #${battleNumber}${boss ? ' — BOSS BATTLE!' : ''}`, {
                leftLabel: t1.name,
                leftSprites: picks.map(p => getBattleSprites(p.id).artwork),
                rightLabel: 'Battle Tower',
                rightSubLabel: `Battle #${battleNumber}${boss ? ' — BOSS' : ''} · everyone at Lv ${TOWER_LEVEL}`,
                rightKind: 'ai',
            });
        } finally {
            setStarting(false);
        }
    };

    const startSafariEncounter = async (biome: Biome) => {
        if (starting) return;
        const t1 = teams.find(t => t.id === team1Id);
        if (!t1 || t1.pokemon.length === 0 || pokemons.length === 0) return;

        const encounter = rollWildEncounter(pokemons, biome, playerAvgLevel(t1), Math.random);
        if (!encounter) {
            addLog('No wild Pokémon found in this biome yet — load more of the Pokédex first.');
            return;
        }

        setStarting(true);
        try {
            const movesets = await fetchMovesets([...t1.pokemon, encounter.pokemon]);

            const team1 = t1.pokemon.map((p, i) => {
                const progress = getMonProgress(profile, p.id);
                return createBattleMon(p, 1, i, progress.level, getAbilityForTypes(p.types), {
                    shiny: progress.shiny,
                    statMod: recruitStatMod(progress.elite),
                    heldItem: progress.heldItem,
                    moves: progress.customMoves?.length ? progress.customMoves : movesets.get(p.id),
                });
            });
            const wildMon = createBattleMon(
                encounter.pokemon, 2, 0, encounter.level, getAbilityForTypes(encounter.pokemon.types),
                { shiny: encounter.shiny, moves: movesets.get(encounter.pokemon.id) }
            );

            setOpponentKind('ai');
            setAIDifficulty('beginner');
            setAIPersonality('balanced');
            setGauntletStage(null);
            setLeagueStageId(null);
            setSafariBiomeId(biome.id);
            setTowerMode(false);
            gauntletHpRef.current = {};
            const backdropId = biome.backdrops[Math.floor(Math.random() * biome.backdrops.length)];
            setBackdropUrl(backgroundUrl(backdropId));
            const state = createEngineState(
                team1,
                [wildMon],
                { 1: { ...profile.items }, 2: createInventory() },
                { wild: true, balls: { ...profile.balls } }
            );
            const rarityTag = encounter.rarity !== 'common' ? ` (${encounter.rarity}${encounter.shiny ? ', shiny!' : ''})` : '';
            launchBattle(state, `A wild ${capitalize(encounter.pokemon.name)} appeared${rarityTag}!`, {
                leftLabel: t1.name,
                leftSprites: t1.pokemon.map(p => getBattleSprites(p.id).artwork),
                rightLabel: `Wild ${capitalize(encounter.pokemon.name)}`,
                rightSubLabel: `${biome.emoji} ${biome.name}`,
                rightPortrait: getBattleSprites(encounter.pokemon.id, encounter.shiny).artwork,
                rightKind: 'trainer',
            });
        } finally {
            setStarting(false);
        }
    };

    const handleGauntletContinue = () => {
        if (!engine || gauntletStage === null) return;
        // Carry battle scars into the next stage: survivors heal 40%, fainted mons return at 30%
        const pcts: Record<number, number> = {};
        engine.order[1].forEach((key, i) => {
            const mon = engine.mons[key];
            pcts[i] = nextStageHpPct(mon.currentHp, mon.maxHp);
        });
        gauntletHpRef.current = pcts;
        startGauntletStage(gauntletStage + 1);
    };

    const handleCloseBattle = () => {
        stopMusic();
        setEngine(null);
        setConfirmExit(false);
        setShowSwitchDialog(false);
        setGauntletStage(null);
        gauntletHpRef.current = {};
        setLeagueStageId(null);
        setLeagueError(null);
        setSafariBiomeId(null);
        setTowerMode(false);
        setLeagueRematch(false);
        setBackdropUrl(null);
        setIntro(null);
        pendingBeginRef.current = null;
    };

    const handleSelectMove = (move: Move) => {
        runPlayerAction({ kind: 'move', move });
    };

    const handleVoluntarySwitch = (key: string) => {
        setShowSwitchDialog(false);
        runPlayerAction({ kind: 'switch', targetKey: key });
    };

    const handleUseItem = (itemId: ItemId) => {
        setBagAnchor(null);
        runPlayerAction({ kind: 'item', itemId });
    };

    const handleRandomOpponent = () => {
        setRandomTeam2(generateRandomTeam(pokemons));
        setTeam2Id(RANDOM_ID);
    };

    const handleForcedSwitch = (key: string) => {
        if (!engine) return;
        processEvents(resolveForcedSwitch(engine, key));
    };

    const handleToggleMusic = () => {
        if (musicOn) {
            stopMusic();
        } else if (engine && engine.phase !== 'gameOver') {
            playMusic('battleTheme');
        }
        setMusicOn(!musicOn);
    };

    const handleDebugWeather = (weather: WeatherType) => {
        if (!engine) return;
        processEvents(engineSetWeather(engine, weather));
    };

    const handleDebugTerrain = (terrain: TerrainType) => {
        if (!engine) return;
        processEvents(engineSetTerrain(engine, terrain));
    };

    // Which team the local input controls right now (in hotseat it follows the turn)
    const activeHumanTeam: TeamId = hotseat && engine ? engine.currentTurn : 1;
    const playerTurn =
        engine !== null &&
        engine.phase === 'selecting' &&
        (engine.currentTurn === 1 || hotseat) &&
        !busy;
    const playerMustSwitch =
        engine !== null &&
        engine.phase === 'awaitingSwitch' &&
        engine.pendingSwitch !== null &&
        (engine.pendingSwitch === 1 || hotseat);
    const switchTeam: TeamId = playerMustSwitch && engine?.pendingSwitch ? engine.pendingSwitch : activeHumanTeam;

    const leftMon = engine ? getActiveMon(engine, 1) : null;
    const rightMon = engine ? getActiveMon(engine, 2) : null;
    // The mon whose moves/bag the dock shows (player 1 vs AI; whoever's turn in hotseat)
    const controlMon = engine ? getActiveMon(engine, activeHumanTeam) : null;

    // ---------- Team selection screen ----------
    if (!engine) {
        return (
            <BattleSetup
                teams={teams}
                pokemons={pokemons}
                profile={profile}
                team1Id={team1Id}
                team2Id={team2Id}
                onTeam1Change={setTeam1Id}
                onTeam2Change={setTeam2Id}
                aiDifficulty={aiDifficulty}
                aiPersonality={aiPersonality}
                onDifficultyChange={setAIDifficulty}
                onPersonalityChange={setAIPersonality}
                randomTeam2={randomTeam2}
                onRandomOpponent={handleRandomOpponent}
                onStartBattle={handleStartBattle}
                starting={starting}
                opponentKind={opponentKind}
                onOpponentKindChange={setOpponentKind}
            >
                <Paper sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <WhatshotIcon sx={{ fontSize: 36, color: '#ff8a65' }} />
                    <Box sx={{ flexGrow: 1, minWidth: 260 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ff8a65' }}>
                            Gauntlet Mode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Take your team through an endless run of escalating battles. HP carries over
                            between stages, every 3rd stage is a boss with an elite Pokémon, and all XP
                            is boosted ×{GAUNTLET_XP_MULTIPLIER}. How deep can you go?
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={starting || !team1Id || pokemons.length === 0}
                        onClick={handleStartGauntlet}
                        startIcon={<WhatshotIcon />}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {starting ? 'Preparing…' : 'Start Gauntlet'}
                    </Button>
                </Paper>
                <LeagueCard
                    league={profile.league}
                    stageLevel={stage => {
                        const t1 = teams.find(t => t.id === team1Id);
                        return t1 && t1.pokemon.length > 0 ? leagueStageLevel(stage, playerAvgLevel(t1)) : stage.levelFloor;
                    }}
                    starting={starting}
                    disabled={!team1Id}
                    error={leagueError}
                    onChallenge={(stage, rematch) => void startLeagueStage(stage, rematch)}
                />
                <Paper sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 32 }}>🧭</Typography>
                        <Box sx={{ flexGrow: 1, minWidth: 240 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#81c784' }}>
                                Safari Expedition
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Explore a biome, battle a wild Pokémon, weaken it and throw
                                Poké Balls to catch it. Rare and shiny encounters await.
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                            {BALL_IDS.map(id => (
                                <Chip
                                    key={id}
                                    label={`${BALLS[id].name} ×${profile.balls[id] ?? 0}`}
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                />
                            ))}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>Biome</InputLabel>
                            <Select value={selectedBiomeId} label="Biome" onChange={e => setSelectedBiomeId(e.target.value)}>
                                {BIOMES.map(b => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.emoji} {b.name} — {b.types.join(', ')}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            color="success"
                            disabled={starting || !team1Id || pokemons.length === 0}
                            onClick={() => {
                                const biome = getBiome(selectedBiomeId);
                                if (biome) void startSafariEncounter(biome);
                            }}
                        >
                            {starting ? 'Preparing…' : 'Explore'}
                        </Button>
                    </Box>
                </Paper>
                <Paper sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 32 }}>🗼</Typography>
                        <Box sx={{ flexGrow: 1, minWidth: 240 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#90caf9' }}>
                                Battle Tower
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                A pure-skill streak ladder: everyone fights at Lv {TOWER_LEVEL}, no held
                                items, expert AI. Every 7th battle is a boss. How far can you climb?
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#90caf9' }}>
                                {profile.records.towerStreak}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                streak · best {profile.records.towerBestStreak}
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: '#90caf9', color: '#1a1a2e', fontWeight: 700, '&:hover': { bgcolor: '#64b5f6' } }}
                            disabled={starting || !team1Id || pokemons.length === 0}
                            onClick={() => void startTowerBattle()}
                        >
                            {starting ? 'Preparing…' : `Battle #${profile.records.towerStreak + 1}`}
                        </Button>
                    </Box>
                </Paper>
            </BattleSetup>
        );
    }

    // ---------- Battle screen ----------
    return (
        <Dialog open fullScreen PaperProps={{ sx: { background: '#0b1026' } }}>
            {intro && <VsIntro payload={intro} onDone={handleIntroDone} />}
            {/* Top bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                    Battle
                </Typography>
                {gauntletStage !== null && (
                    <Chip
                        icon={<WhatshotIcon sx={{ fontSize: 14 }} />}
                        label={`Stage ${gauntletStage}${isBossStage(gauntletStage) ? ' · BOSS' : ''}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 138, 101, 0.2)', color: '#ff8a65', fontWeight: 700, '& .MuiChip-icon': { color: '#ff8a65' } }}
                    />
                )}
                {leagueStage && (
                    <Chip
                        avatar={<Avatar src={trainerPortraitUrl(leagueStage.portrait)} sx={{ imageRendering: 'pixelated' }} />}
                        label={`${leagueStage.name} — ${leagueStage.title}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', fontWeight: 700 }}
                    />
                )}
                <Chip label={`Turn ${engine.turnCount}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700 }} />
                {engine.weather !== 'none' && (
                    <Chip
                        icon={<CloudIcon sx={{ fontSize: 14 }} />}
                        label={`${WEATHER_LABELS[engine.weather]} · ${engine.weatherTurns}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(56, 189, 248, 0.18)', color: '#7dd3fc', '& .MuiChip-icon': { color: '#7dd3fc' } }}
                    />
                )}
                {engine.terrain !== 'none' && (
                    <Chip
                        icon={<LandscapeIcon sx={{ fontSize: 14 }} />}
                        label={`${capitalize(engine.terrain)} · ${engine.terrainTurns}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(52, 211, 153, 0.18)', color: '#6ee7b7', '& .MuiChip-icon': { color: '#6ee7b7' } }}
                    />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title={`Battle speed: ${battleSpeed}× (click to change)`}>
                    <Button
                        size="small"
                        onClick={() => setBattleSpeed(battleSpeed === 1 ? 1.5 : battleSpeed === 1.5 ? 2 : 1)}
                        startIcon={<SpeedIcon />}
                        sx={{ color: battleSpeed > 1 ? '#4fc3f7' : '#94a3b8', minWidth: 64, fontWeight: 700 }}
                    >
                        {battleSpeed}×
                    </Button>
                </Tooltip>
                <Tooltip title="Debug controls">
                    <IconButton size="small" onClick={() => setDebugMode(!debugMode)} sx={{ color: debugMode ? '#ffd54f' : '#666' }}>
                        <BugReportIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={musicOn ? 'Music off' : 'Music on'}>
                    <IconButton size="small" onClick={handleToggleMusic} sx={{ color: '#fff' }}>
                        {musicOn ? <MusicNoteIcon /> : <MusicOffIcon />}
                    </IconButton>
                </Tooltip>
                <Tooltip title="Volume">
                    <IconButton size="small" onClick={e => setVolumeAnchor(e.currentTarget)} sx={{ color: '#fff' }}>
                        <VolumeUpIcon />
                    </IconButton>
                </Tooltip>
                <Popover
                    open={Boolean(volumeAnchor)}
                    anchorEl={volumeAnchor}
                    onClose={() => setVolumeAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Box sx={{ px: 2, py: 1.5, width: 200, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <VolumeUpIcon fontSize="small" />
                        <Slider
                            size="small"
                            value={soundVolume}
                            min={0}
                            max={1}
                            step={0.05}
                            onChange={(_, v) => {
                                setSoundVolume(v as number);
                                setMusicVolume((v as number) * 0.6);
                            }}
                        />
                    </Box>
                </Popover>
                <Tooltip title="Exit battle">
                    <IconButton
                        onClick={() => (engine.phase === 'gameOver' ? handleCloseBattle() : setConfirmExit(true))}
                        sx={{ color: '#fff' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Debug controls */}
            {debugMode && (
                <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1, borderBottom: '1px solid rgba(255,213,79,0.3)', bgcolor: 'rgba(255,213,79,0.05)' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel sx={{ color: '#ffd54f' }}>Weather</InputLabel>
                        <Select value={engine.weather} label="Weather" onChange={e => handleDebugWeather(e.target.value as WeatherType)} sx={{ color: '#fff' }}>
                            {(['none', 'rain', 'sunny', 'sandstorm', 'hail'] as WeatherType[]).map(w => (
                                <MenuItem key={w} value={w}>{WEATHER_LABELS[w]}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel sx={{ color: '#ffd54f' }}>Terrain</InputLabel>
                        <Select value={engine.terrain} label="Terrain" onChange={e => handleDebugTerrain(e.target.value as TerrainType)} sx={{ color: '#fff' }}>
                            {(['none', 'electric', 'grassy', 'psychic', 'misty'] as TerrainType[]).map(t => (
                                <MenuItem key={t} value={t}>{capitalize(t)}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* 3D scene with overlays */}
            <Box sx={{ position: 'relative', flexGrow: 1, minHeight: '46vh' }}>
                <BattleScene3D
                    leftMon={leftMon}
                    rightMon={rightMon}
                    weather={engine.weather}
                    terrain={engine.terrain}
                    fx={fx}
                    getTypeColor={getTypeColor}
                    backdrop={backdropUrl}
                />
                {leftMon && (
                    <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                        <MonStatusPanel key={leftMon.key} mon={leftMon} align="left" getTypeColor={getTypeColor} />
                    </Box>
                )}
                {rightMon && (
                    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                        <MonStatusPanel key={rightMon.key} mon={rightMon} align="right" getTypeColor={getTypeColor} />
                    </Box>
                )}
                {floatingTexts.map(ft => (
                    <Box
                        key={ft.id}
                        sx={{
                            position: 'absolute',
                            left: ft.side === 1 ? '28%' : '72%',
                            top: '38%',
                            pointerEvents: 'none',
                        }}
                    >
                        <FloatingCombatText text={ft.text} color={ft.color} x={0} y={0} type={ft.type} />
                    </Box>
                ))}
            </Box>

            {/* Bottom dock */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(10, 15, 30, 0.92)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, pt: 1.25 }}>
                    <Chip
                        size="small"
                        label={
                            engine.phase === 'gameOver'
                                ? 'Battle over'
                                : playerMustSwitch
                                    ? hotseat
                                        ? `Player ${switchTeam}: choose your next Pokémon`
                                        : 'Choose your next Pokémon'
                                    : busy
                                        ? 'Resolving…'
                                        : hotseat
                                            ? `Player ${engine.currentTurn} — pick a move`
                                            : engine.currentTurn === 1
                                                ? 'Your turn — pick a move'
                                                : 'Opponent is thinking…'
                        }
                        sx={{
                            bgcolor: playerTurn ? 'rgba(79, 142, 247, 0.9)' : 'rgba(255,255,255,0.12)',
                            color: '#fff',
                            fontWeight: 700,
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: compact ? 'column' : 'row',
                        gap: compact ? 1 : 2,
                        px: 2,
                        py: 1.5,
                        flexWrap: { xs: 'nowrap', lg: 'nowrap' },
                    }}
                >
                    <Box sx={{ flex: compact ? '0 0 auto' : '1.2 1 360px', minWidth: compact ? 0 : 320 }}>
                        {controlMon && (
                            <MoveSelection
                                key={controlMon.key}
                                mon={controlMon}
                                onSelectMove={handleSelectMove}
                                disabled={!playerTurn}
                                getTypeColor={getTypeColor}
                            />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: compact ? 0 : 220 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={!playerTurn || getSwitchableMons(engine, activeHumanTeam).length === 0}
                                onClick={() => setShowSwitchDialog(true)}
                                startIcon={<SwapHorizIcon />}
                                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', flexGrow: 1 }}
                            >
                                Switch
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={!playerTurn || !ITEM_IDS.some(id => canUseItem(engine, activeHumanTeam, id))}
                                onClick={e => setBagAnchor(e.currentTarget)}
                                startIcon={<BackpackIcon />}
                                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', flexGrow: 1 }}
                            >
                                Bag
                            </Button>
                            {engine.wild && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    color="error"
                                    disabled={!playerTurn || !BALL_IDS.some(id => (engine.balls[id] ?? 0) > 0)}
                                    onClick={e => setBallAnchor(e.currentTarget)}
                                    sx={{ flexGrow: 1, fontWeight: 700 }}
                                >
                                    ⚪ Ball
                                </Button>
                            )}
                        </Box>
                        <Popover
                            open={Boolean(ballAnchor)}
                            anchorEl={ballAnchor}
                            onClose={() => setBallAnchor(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        >
                            <Stack spacing={1} sx={{ p: 1.5, width: 260 }}>
                                {BALL_IDS.map(id => {
                                    const count = engine.balls[id] ?? 0;
                                    return (
                                        <Button
                                            key={id}
                                            variant="outlined"
                                            size="small"
                                            disabled={!playerTurn || count <= 0}
                                            onClick={() => {
                                                setBallAnchor(null);
                                                runPlayerAction({ kind: 'throwBall', ballId: id });
                                            }}
                                            sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1 }}
                                        >
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2">{BALLS[id].name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {BALLS[id].description}
                                                </Typography>
                                            </Box>
                                            <Chip label={`x${count}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                        </Button>
                                    );
                                })}
                            </Stack>
                        </Popover>
                        <Popover
                            open={Boolean(bagAnchor)}
                            anchorEl={bagAnchor}
                            onClose={() => setBagAnchor(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        >
                            <Stack spacing={1} sx={{ p: 1.5, width: 260 }}>
                                {ITEM_IDS.map(id => {
                                    const item = ITEMS[id];
                                    const count = engine.items[activeHumanTeam][id];
                                    const usable = playerTurn && canUseItem(engine, activeHumanTeam, id);
                                    return (
                                        <Button
                                            key={id}
                                            variant="outlined"
                                            size="small"
                                            disabled={!usable}
                                            onClick={() => handleUseItem(id)}
                                            sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1 }}
                                        >
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2">{item.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.description}
                                                </Typography>
                                            </Box>
                                            <Chip label={`x${count}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                        </Button>
                                    );
                                })}
                            </Stack>
                        </Popover>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>{hotseat ? 'Player 1' : 'Your team'}</Typography>
                            <TeamRoster state={engine} team={1} />
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>{hotseat ? 'Player 2' : 'Opponent team'}</Typography>
                            <TeamRoster state={engine} team={2} />
                        </Box>
                    </Box>
                    <Box sx={{ flex: compact ? '0 0 auto' : '1 1 300px', minWidth: compact ? 0 : 280, height: compact ? 120 : 190 }}>
                        <BattleLog logs={logs} />
                    </Box>
                </Box>
            </Box>

            {/* Post-battle results overlay (covers the whole battle screen) */}
                {engine.phase === 'gameOver' && engine.winner !== null && (
                    <PostBattlePanel
                        // Hotseat matches are neutral: always celebrate the winner (gold trophy)
                        winner={hotseat ? 1 : engine.winner}
                        turnCount={engine.turnCount}
                        teamMons={engine.order[hotseat ? engine.winner : 1].map(key => engine.mons[key])}
                        stats={battleStatsRef.current}
                        xpGains={battleResult?.gains ?? []}
                        drops={battleResult?.drops ?? []}
                        heldDrops={battleResult?.heldDrops ?? []}
                        streak={battleResult?.streak ?? 0}
                        stageLabel={
                            hotseat
                                ? `Player ${engine.winner} wins!`
                                : towerMode
                                    ? engine.winner === 1
                                        ? `🗼 Tower win #${profile.records.towerStreak}!`
                                        : `Tower run over — best streak ${profile.records.towerBestStreak}`
                                : engine.wild
                                    ? engine.caught
                                        ? `Gotcha! ${(() => { const m = engine.mons[engine.caught]; return m ? capitalize(m.pokemon.name) : 'It'; })()} was caught!`
                                        : engine.winner === 1
                                            ? 'The wild Pokémon fainted...'
                                            : 'Your team was defeated...'
                                    : leagueStage
                                    ? engine.winner === 1
                                        ? leagueStage.badge
                                            ? `${leagueStage.badge.emoji} ${leagueStage.badge.name}${leagueRematch ? ' — Round 2 won!' : ' earned!'}`
                                            : leagueStage.kind === 'champion'
                                                ? '🏆 You are the Champion!'
                                                : `Elite Four ${leagueStage.name} defeated!`
                                        : `Defeated by ${leagueStage.name}...`
                                    : gauntletStage !== null
                                        ? engine.winner === 1
                                            ? `Stage ${gauntletStage} cleared!`
                                            : `Run over — stage ${gauntletStage}`
                                        : undefined
                        }
                        onContinue={
                            towerMode && engine.winner === 1
                                ? () => void startTowerBattle()
                                : leagueStage && engine.winner === 1 && !leagueRematch && nextLeagueStage(profile.league.defeated)
                                    ? handleLeagueContinue
                                    : gauntletStage !== null && engine.winner === 1
                                        ? handleGauntletContinue
                                        : undefined
                        }
                        onRematch={
                            towerMode
                                ? engine.winner === 1
                                    ? undefined
                                    : () => void startTowerBattle()
                                : safariBiomeId
                                ? () => { const b = getBiome(safariBiomeId); if (b) void startSafariEncounter(b); }
                                : leagueStage
                                    ? engine.winner === 1
                                        ? undefined
                                        : () => void startLeagueStage(leagueStage, leagueRematch)
                                    : gauntletStage === null
                                        ? handleStartBattle
                                        : engine.winner === 1
                                            ? undefined
                                            : handleStartGauntlet
                        }
                        rematchLabel={towerMode ? 'New Run' : safariBiomeId ? 'Explore Again' : leagueStage ? 'Retry' : gauntletStage !== null ? 'New Run' : 'Rematch'}
                        onExit={handleCloseBattle}
                    >
                        {(battleResult?.achievements?.length ?? 0) > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {battleResult!.achievements.map(id => {
                                    const a = getAchievement(id);
                                    return a ? (
                                        <Chip
                                            key={id}
                                            label={`${a.emoji} ${a.name}`}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255, 215, 0, 0.18)', color: '#ffd700', fontWeight: 700 }}
                                        />
                                    ) : null;
                                })}
                            </Box>
                        )}
                        {recruitOffer && engine.winner === 1 && (
                            <RecruitOfferCard
                                offer={recruitOffer}
                                teams={teams}
                                onAddToTeam={handleRecruitToTeam}
                                onSendToBox={handleRecruitToBox}
                                onDecline={() => setRecruitOffer(null)}
                            />
                        )}
                        {evolutionQueue.length > 0 && (
                            <EvolutionPrompt
                                key={evolutionQueue[0].fromId}
                                evolution={evolutionQueue[0]}
                                onEvolve={handleEvolve}
                                onDecline={handleDeclineEvolve}
                            />
                        )}
                    </PostBattlePanel>
                )}

            {/* Switch dialog (voluntary + forced) */}
            <Dialog open={showSwitchDialog || playerMustSwitch} onClose={() => !playerMustSwitch && setShowSwitchDialog(false)}>
                <DialogTitle>
                    {playerMustSwitch
                        ? hotseat
                            ? `Player ${switchTeam}'s Pokémon fainted! Choose the next one:`
                            : 'Your Pokémon fainted! Choose the next one:'
                        : 'Switch Pokémon'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1} sx={{ mt: 1, minWidth: 300 }}>
                        {getSwitchableMons(engine, switchTeam).map(mon => (
                            <Button
                                key={mon.key}
                                variant="outlined"
                                onClick={() => (playerMustSwitch ? handleForcedSwitch(mon.key) : handleVoluntarySwitch(mon.key))}
                                sx={{ justifyContent: 'flex-start', gap: 2, textTransform: 'capitalize', p: 1 }}
                            >
                                <img src={mon.pokemon.image} alt={mon.pokemon.name} style={{ width: 42, height: 42, objectFit: 'contain' }} />
                                <Box sx={{ flexGrow: 1, textAlign: 'left' }}>
                                    <Typography variant="subtitle2">{mon.pokemon.name} (Lv {mon.level})</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(mon.currentHp / mon.maxHp) * 100}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            '& .MuiLinearProgress-bar': { bgcolor: hpColor(mon.currentHp / mon.maxHp) },
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption">{mon.currentHp}/{mon.maxHp}</Typography>
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
                {!playerMustSwitch && (
                    <DialogActions>
                        <Button onClick={() => setShowSwitchDialog(false)}>Cancel</Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Exit confirmation */}
            <Dialog open={confirmExit} onClose={() => setConfirmExit(false)}>
                <DialogTitle>Forfeit battle?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        The battle is still in progress. Exiting now will forfeit the match.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmExit(false)}>Keep fighting</Button>
                    <Button color="error" variant="contained" onClick={handleCloseBattle}>
                        Exit battle
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default BattleSimulator;
