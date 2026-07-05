import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pokemon } from '../types/pokemon';
import type { ItemId, HeldItemId } from '../data/items';
import type { EngineState } from '../utils/battleEngine';
import type { LeagueStage } from '../data/league';
import { LEAGUE_XP_MULTIPLIER, REMATCH_XP_MULTIPLIER } from '../data/league';
import { GAUNTLET_XP_MULTIPLIER, isBossStage } from '../utils/gauntlet';
import { isTowerBossBattle } from '../utils/tower';
import type { PlayerProfile, XpGain } from '../utils/progression';
import {
    addBalls,
    addHeldItems,
    addItems,
    applyBattleXp,
    registerMonProgress,
    updateRecords,
} from '../utils/progression';
import { rollBallDrop, rollBattleRewards, rollHeldItemDrop } from '../data/rewards';
import { applyAchievements, evaluateAchievements, getAchievement } from '../utils/achievements';
import type { RecruitOffer } from '../utils/recruitment';
import { rollRecruit } from '../utils/recruitment';
import { fetchPokemonById, getEvolutionTarget } from '../utils/evolution';
import { getFullLearnset } from '../utils/movesets';
import type { MonBattleStats } from '../components/battle/PostBattlePanel';
import type { PendingEvolution } from '../components/battle/EvolutionPrompt';
import { capitalize } from '../components/battle/battleUi';
import { playChime } from '../utils/soundEffects';
import type { LogEntry } from './useBattleEvents';

export interface BattleResult {
    gains: XpGain[];
    drops: ItemId[];
    heldDrops: HeldItemId[];
    streak: number;
    /** Achievement ids unlocked by this battle. */
    achievements: string[];
}

interface UseBattleResultsOptions {
    engine: EngineState | null;
    hotseat: boolean;
    gauntletStage: number | null;
    leagueStage: LeagueStage | null;
    /** The league battle is a post-game Round 2 rematch. */
    leagueRematch: boolean;
    /** Battle Tower mode: level-normalized streak ladder. */
    towerMode: boolean;
    /** Journey trainer being fought (id in journey.clearedTrainers on win). */
    journeyTrainerId: string | null;
    pokemons: Pokemon[];
    profile: PlayerProfile;
    updateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
    battleStatsRef: React.MutableRefObject<Record<string, MonBattleStats>>;
    addLog: (message: string, type?: LogEntry['type']) => void;
    onAddPokemonToTeam: (teamId: string, pokemon: Pokemon) => void;
    onEvolvePokemon: (oldId: number, newPokemon: Pokemon) => void;
}

/**
 * Applies post-battle consequences exactly once per battle — XP, records,
 * item/held drops, league badges, recruitment offers, evolution prompts and
 * learn hints — and owns the offer state + handlers.
 */
export const useBattleResults = ({
    engine,
    hotseat,
    gauntletStage,
    leagueStage,
    leagueRematch,
    towerMode,
    journeyTrainerId,
    pokemons,
    profile,
    updateProfile,
    battleStatsRef,
    addLog,
    onAddPokemonToTeam,
    onEvolvePokemon,
}: UseBattleResultsOptions) => {
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
    const [recruitOffer, setRecruitOffer] = useState<RecruitOffer | null>(null);
    const [evolutionQueue, setEvolutionQueue] = useState<PendingEvolution[]>([]);
    const resultsAppliedRef = useRef(false);

    // Battle results: XP, records, item drops — applied exactly once per battle
    useEffect(() => {
        if (!engine || engine.phase !== 'gameOver' || engine.winner === null || resultsAppliedRef.current) return;
        resultsAppliedRef.current = true;

        // Hotseat battles are friendly matches: no XP, records, drops or
        // recruitment (also prevents farming a second local player).
        if (hotseat) return;

        const won = engine.winner === 1;
        const stats = battleStatsRef.current;
        const entries = engine.order[1].map(key => {
            const mon = engine.mons[key];
            return { pokemonId: mon.pokemon.id, kos: stats[key]?.kos ?? 0, survived: mon.currentHp > 0 };
        });

        const inGauntlet = gauntletStage !== null;
        const inLeague = leagueStage !== null;
        const wild = Boolean(engine.wild);
        const caughtMon = engine.caught ? engine.mons[engine.caught] : null;
        let records = updateRecords(profile.records, won);
        if (caughtMon) {
            records = { ...records, caught: records.caught + 1 };
        }
        if (inGauntlet && won) {
            records = { ...records, gauntletBestStage: Math.max(records.gauntletBestStage, gauntletStage) };
        }
        if (towerMode) {
            const towerStreak = won ? records.towerStreak + 1 : 0;
            records = { ...records, towerStreak, towerBestStreak: Math.max(records.towerBestStreak, towerStreak) };
        }
        const xpMultiplier = inLeague ? (leagueRematch ? REMATCH_XP_MULTIPLIER : LEAGUE_XP_MULTIPLIER) : inGauntlet ? GAUNTLET_XP_MULTIPLIER : 1;
        const { profile: withXp, gains } = applyBattleXp(profile, entries, won, records.currentStreak, xpMultiplier);
        const isBoss = inLeague || (inGauntlet && isBossStage(gauntletStage)) || (towerMode && won && isTowerBossBattle(records.towerStreak));
        const drops = won ? rollBattleRewards(records.currentStreak, isBoss, Math.random) : [];
        const heldDrop = won ? rollHeldItemDrop(records.currentStreak, isBoss, Math.random) : null;
        const heldDrops = heldDrop ? [heldDrop] : [];
        // The battle inventory started from the profile, so what's left in the
        // engine (plus drops) IS the player's new stock. Tower battles use a
        // fixed loadout instead — the player's bag is untouched.
        const items = addItems(towerMode ? { ...profile.items } : { ...engine.items[1] }, drops);
        const heldItems = addHeldItems(profile.heldItems, heldDrops);
        // Balls: in wild battles the engine tracked consumption; add any drop
        const ballDrop = won ? rollBallDrop(records.currentStreak, isBoss, Math.random) : null;
        const balls = addBalls(wild ? { ...engine.balls } : profile.balls, ballDrop ? [ballDrop] : []);

        // League progress: badges/defeats persist forever (idempotent append)
        let league = withXp.league;
        if (inLeague && won) {
            if (leagueRematch && !league.defeatedRematches.includes(leagueStage.id)) {
                league = { ...league, defeatedRematches: [...league.defeatedRematches, leagueStage.id] };
            } else if (!leagueRematch && !league.defeated.includes(leagueStage.id)) {
                league = {
                    ...league,
                    defeated: [...league.defeated, leagueStage.id],
                    champion: league.champion || leagueStage.id === 'champion',
                    champion2: league.champion2 || leagueStage.id === 'red',
                };
            }
        }
        if (inLeague && won && leagueStage.badge) playChime('recruit'); // badge fanfare

        // Journey trainer beaten → mark the route progress (idempotent)
        const journey = journeyTrainerId && won && !withXp.journey.clearedTrainers.includes(journeyTrainerId)
            ? { ...withXp.journey, clearedTrainers: [...withXp.journey.clearedTrainers, journeyTrainerId] }
            : withXp.journey;

        // A caught wild mon goes straight to the Box with its battle level
        let finalProfile: PlayerProfile = { ...withXp, records, items, heldItems, league, balls, journey };
        if (caughtMon) {
            finalProfile = registerMonProgress(finalProfile, {
                id: caughtMon.pokemon.id,
                level: caughtMon.level,
                shiny: caughtMon.shiny,
            });
            finalProfile = {
                ...finalProfile,
                box: [...finalProfile.box, {
                    pokemon: caughtMon.pokemon,
                    level: caughtMon.level,
                    shiny: caughtMon.shiny,
                }],
            };
            playChime('recruit');
        }

        // Achievements: evaluate against the fully-updated profile
        const earned = evaluateAchievements(finalProfile);
        if (earned.length > 0) {
            finalProfile = applyAchievements(finalProfile, earned);
            earned.forEach(id => {
                const a = getAchievement(id);
                if (a) addLog(`${a.emoji} Achievement unlocked: ${a.name}!`, 'victory');
            });
            playChime('evolve');
        }

        updateProfile(() => finalProfile);
        setBattleResult({ gains, drops, heldDrops, streak: records.currentStreak, achievements: earned });

        // Recruitment offer (guaranteed after gauntlet bosses and E4/champion
        // wins; never in wild battles — catching IS the recruitment)
        if (won && !wild) {
            const teamMons = engine.order[1].map(key => engine.mons[key]);
            const avgLevel = Math.round(teamMons.reduce((a, m) => a + m.level, 0) / teamMons.length);
            const guaranteed = (inGauntlet && isBoss) || (inLeague && leagueStage.kind !== 'gym');
            setRecruitOffer(
                rollRecruit(pokemons, avgLevel, records.currentStreak, Math.random, { guaranteed })
            );
        }

        // Evolution offers for mons that just leveled past their threshold
        const leveled = gains.filter(g => g.toLevel > g.fromLevel);
        leveled.forEach(async gain => {
            const target = await getEvolutionTarget(gain.pokemonId);
            if (!target || gain.toLevel < target.minLevel) return;
            const progress = withXp.mons[gain.pokemonId];
            if (progress?.declinedEvolveAt === gain.toLevel) return;
            const mon = engine.order[1].map(key => engine.mons[key]).find(m => m.pokemon.id === gain.pokemonId);
            if (!mon) return;
            setEvolutionQueue(prev =>
                prev.some(e => e.fromId === gain.pokemonId)
                    ? prev
                    : [...prev, {
                        fromId: gain.pokemonId,
                        fromName: mon.pokemon.name,
                        fromImage: mon.pokemon.image,
                        toId: target.id,
                        toName: target.name,
                        level: gain.toLevel,
                    }]
            );
        });

        // New-move hints (log-line only; fire-and-forget)
        leveled.forEach(gain => {
            const mon = engine.order[1].map(key => engine.mons[key]).find(m => m.pokemon.id === gain.pokemonId);
            if (!mon) return;
            getFullLearnset(mon.pokemon)
                .then(entries => {
                    const learnable = entries.find(e => e.level > gain.fromLevel && e.level <= gain.toLevel);
                    if (learnable) {
                        addLog(`${capitalize(mon.pokemon.name)} can learn ${learnable.move.name} — manage moves in the Team Builder!`);
                    }
                })
                .catch(() => undefined); // hint is best-effort
        });
    }, [addLog, battleStatsRef, engine, gauntletStage, leagueStage, leagueRematch, towerMode, journeyTrainerId, hotseat, pokemons, profile, updateProfile]);

    const registerRecruit = useCallback((offer: RecruitOffer) => {
        updateProfile(prev => registerMonProgress(prev, {
            id: offer.pokemon.id,
            level: offer.level,
            shiny: offer.shiny,
            elite: offer.elite,
        }));
    }, [updateProfile]);

    const handleRecruitToTeam = (teamId: string) => {
        if (!recruitOffer) return;
        registerRecruit(recruitOffer);
        onAddPokemonToTeam(teamId, recruitOffer.pokemon);
        playChime('recruit');
        setRecruitOffer(null);
    };

    const handleRecruitToBox = () => {
        if (!recruitOffer) return;
        registerRecruit(recruitOffer);
        const offer = recruitOffer;
        updateProfile(prev => ({
            ...prev,
            box: [...prev.box, { pokemon: offer.pokemon, level: offer.level, shiny: offer.shiny, elite: offer.elite }],
        }));
        playChime('recruit');
        setRecruitOffer(null);
    };

    const handleEvolve = async () => {
        const evo = evolutionQueue[0];
        if (!evo) return;
        try {
            const newPokemon = await fetchPokemonById(evo.toId);
            updateProfile(prev => {
                const mons = { ...prev.mons };
                const old = mons[evo.fromId] ?? { xp: 0, level: evo.level };
                delete mons[evo.fromId];
                mons[evo.toId] = { xp: old.xp, level: old.level, shiny: old.shiny, elite: old.elite, heldItem: old.heldItem };
                return { ...prev, mons };
            });
            onEvolvePokemon(evo.fromId, newPokemon);
            playChime('evolve');
            addLog(`${capitalize(evo.fromName)} evolved into ${capitalize(newPokemon.name)}!`, 'victory');
            // Let the reveal animation play before showing the next offer
            setTimeout(() => setEvolutionQueue(prev => prev.filter(e => e.fromId !== evo.fromId)), 1500);
        } catch {
            addLog('The evolution failed — try again after the next battle.', 'normal');
            setEvolutionQueue(prev => prev.filter(e => e.fromId !== evo.fromId));
        }
    };

    const handleDeclineEvolve = () => {
        const evo = evolutionQueue[0];
        if (!evo) return;
        updateProfile(prev => {
            const existing = prev.mons[evo.fromId];
            if (!existing) return prev;
            return { ...prev, mons: { ...prev.mons, [evo.fromId]: { ...existing, declinedEvolveAt: existing.level } } };
        });
        setEvolutionQueue(prev => prev.filter(e => e.fromId !== evo.fromId));
    };

    const resetResults = useCallback(() => {
        resultsAppliedRef.current = false;
        setBattleResult(null);
        setRecruitOffer(null);
        setEvolutionQueue([]);
    }, []);

    return {
        battleResult,
        recruitOffer,
        setRecruitOffer,
        evolutionQueue,
        handleRecruitToTeam,
        handleRecruitToBox,
        handleEvolve,
        handleDeclineEvolve,
        resetResults,
    };
};
