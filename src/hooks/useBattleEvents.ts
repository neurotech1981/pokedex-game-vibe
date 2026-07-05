import { useCallback, useRef, useState } from 'react';
import type { EngineState, TeamId, TurnResult } from '../utils/battleEngine';
import type { SceneFx } from '../components/battle/BattleScene3D';
import type { MonBattleStats } from '../components/battle/PostBattlePanel';
import { STATUS_COLORS, STATUS_LABELS, STAT_ABBR, WEATHER_LABELS, capitalize } from '../components/battle/battleUi';
import { playCry, playSound, stopMusic } from '../utils/soundEffects';

export interface LogEntry {
    id: number;
    message: string;
    type: 'normal' | 'critical' | 'death' | 'victory';
    timestamp: number;
}

export interface FloatingText {
    id: number;
    text: string;
    color: string;
    side: TeamId;
    type: 'damage' | 'status' | 'effectiveness';
}

interface UseBattleEventsOptions {
    hotseat: boolean;
    /** Receives the new engine state after each processed turn. */
    onEngineState: (state: EngineState) => void;
}

/**
 * Battle presentation state: the log, floating combat text, per-battle
 * damage stats and the 3D SceneFx — all driven by `processEvents`, which
 * translates engine BattleEvents into UI side effects.
 */
export const useBattleEvents = ({ hotseat, onEngineState }: UseBattleEventsOptions) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [fx, setFx] = useState<SceneFx | null>(null);
    const battleStatsRef = useRef<Record<string, MonBattleStats>>({});

    const idCounter = useRef(0);
    const nextId = useCallback(() => ++idCounter.current, []);

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'normal') => {
        setLogs(prev => [...prev.slice(-60), { id: nextId(), message, type, timestamp: Date.now() }]);
    }, [nextId]);

    const addFloatingText = useCallback((text: string, color: string, side: TeamId, type: FloatingText['type']) => {
        const id = nextId();
        setFloatingTexts(prev => [...prev, { id, text, color, side, type }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1600);
    }, [nextId]);

    const resetEvents = useCallback(() => {
        battleStatsRef.current = {};
        setLogs([]);
        setFloatingTexts([]);
        setFx(null);
    }, []);

    const processEvents = useCallback((result: TurnResult) => {
        const { state, events } = result;
        const nameOf = (key: string) => capitalize(state.mons[key].pokemon.name);
        const teamOf = (key: string): TeamId => state.mons[key].team;
        const sideLabel = (team: TeamId) => (hotseat ? `Player ${team}` : team === 1 ? 'You' : 'Opponent');

        let sceneFx: SceneFx | null = null;
        let attackerKey: string | null = null;
        const statFor = (key: string): MonBattleStats => {
            if (!battleStatsRef.current[key]) {
                battleStatsRef.current[key] = { dealt: 0, taken: 0, kos: 0 };
            }
            return battleStatsRef.current[key];
        };

        events.forEach(ev => {
            switch (ev.kind) {
                case 'move': {
                    attackerKey = ev.monKey;
                    addLog(`${nameOf(ev.monKey)} used ${ev.moveName}!`);
                    playSound('attack');
                    sceneFx = {
                        id: nextId(),
                        attackerTeam: teamOf(ev.monKey),
                        moveType: ev.moveType,
                        moveName: ev.moveName,
                        damageClass: ev.damageClass,
                        isCritical: false,
                        isDamaging: false,
                    };
                    break;
                }
                case 'damage': {
                    statFor(ev.monKey).taken += ev.amount;
                    if (attackerKey && teamOf(attackerKey) !== teamOf(ev.monKey)) {
                        statFor(attackerKey).dealt += ev.amount;
                    }
                    if (sceneFx) {
                        sceneFx.isDamaging = sceneFx.isDamaging || ev.amount > 0;
                        sceneFx.isCritical = sceneFx.isCritical || ev.isCritical;
                    }
                    if (ev.effectiveness === 0) {
                        addLog(`It doesn't affect ${nameOf(ev.monKey)}...`);
                        addFloatingText('Immune!', '#9e9e9e', teamOf(ev.monKey), 'effectiveness');
                        break;
                    }
                    addLog(
                        `${nameOf(ev.monKey)} took ${ev.amount} damage!${ev.isCritical ? ' Critical hit!' : ''}`,
                        ev.isCritical ? 'critical' : 'normal'
                    );
                    addFloatingText(`-${ev.amount}`, ev.isCritical ? '#ff1744' : '#ff5252', teamOf(ev.monKey), 'damage');
                    if (ev.isCritical) playSound('critical');
                    if (ev.effectiveness > 1) {
                        addLog(`It's super effective!`, 'critical');
                        addFloatingText('Super effective!', '#ffd740', teamOf(ev.monKey), 'effectiveness');
                    } else if (ev.effectiveness < 1) {
                        addLog(`It's not very effective...`);
                    }
                    break;
                }
                case 'miss':
                    addLog(`${nameOf(ev.monKey)}'s ${ev.moveName} missed!`);
                    addFloatingText('Miss!', '#90caf9', teamOf(ev.monKey) === 1 ? 2 : 1, 'status');
                    break;
                case 'blocked': {
                    const reasonText = {
                        paralysis: 'is paralyzed and cannot move!',
                        sleep: 'is fast asleep...',
                        freeze: 'is frozen solid!',
                        confusion: 'is confused and stumbled!',
                        flinch: 'flinched and couldn’t move!',
                    }[ev.reason];
                    addLog(`${nameOf(ev.monKey)} ${reasonText}`);
                    break;
                }
                case 'multiHit':
                    addLog(`Hit ${ev.hits} times!`, 'critical');
                    break;
                case 'statusApplied':
                    addLog(`${nameOf(ev.monKey)} was afflicted with ${ev.status}!`);
                    addFloatingText(STATUS_LABELS[ev.status], STATUS_COLORS[ev.status], teamOf(ev.monKey), 'status');
                    break;
                case 'statusDamage':
                    addLog(`${nameOf(ev.monKey)} took ${ev.amount} damage from ${ev.status}!`);
                    addFloatingText(`-${ev.amount}`, STATUS_COLORS[ev.status], teamOf(ev.monKey), 'damage');
                    break;
                case 'statusCured':
                    addLog(`${nameOf(ev.monKey)} recovered from ${ev.status}!`);
                    break;
                case 'heal':
                    addLog(`${nameOf(ev.monKey)} restored ${ev.amount} HP!`);
                    addFloatingText(`+${ev.amount}`, '#66bb6a', teamOf(ev.monKey), 'damage');
                    break;
                case 'statStage': {
                    const statName = STAT_ABBR[ev.stat];
                    const rose = ev.delta > 0;
                    addLog(
                        `${nameOf(ev.monKey)}'s ${ev.stat} ${Math.abs(ev.delta) >= 2 ? (rose ? 'rose sharply' : 'fell harshly') : rose ? 'rose' : 'fell'}! (${statName} ${ev.stage > 0 ? '+' : ''}${ev.stage})`
                    );
                    addFloatingText(`${statName} ${rose ? '↑' : '↓'}`, rose ? '#ff9800' : '#e53935', teamOf(ev.monKey), 'status');
                    break;
                }
                case 'confusionHit':
                    addLog(`${nameOf(ev.monKey)} hurt itself in confusion! (-${ev.amount} HP)`, 'critical');
                    addFloatingText(`-${ev.amount}`, STATUS_COLORS.confusion, teamOf(ev.monKey), 'damage');
                    break;
                case 'weatherChanged':
                    addLog(ev.weather === 'none' ? 'The weather returned to normal.' : `The weather changed to ${WEATHER_LABELS[ev.weather]}!`);
                    break;
                case 'weatherDamage':
                    addLog(`${nameOf(ev.monKey)} is buffeted by the ${WEATHER_LABELS[ev.weather].toLowerCase()}! (-${ev.amount} HP)`);
                    break;
                case 'terrainChanged':
                    addLog(ev.terrain === 'none' ? 'The terrain returned to normal.' : `The battlefield became ${ev.terrain} terrain!`);
                    break;
                case 'combo':
                    addLog(`${nameOf(ev.monKey)} followed up with ${ev.moveName}!`, 'critical');
                    break;
                case 'abilityActivated':
                    addLog(`${nameOf(ev.monKey)}'s ${ev.abilityName} activated!`, 'critical');
                    addFloatingText(ev.abilityName, '#ab47bc', teamOf(ev.monKey), 'status');
                    break;
                case 'faint':
                    if (attackerKey && teamOf(attackerKey) !== teamOf(ev.monKey)) {
                        statFor(attackerKey).kos += 1;
                    }
                    if (sceneFx) sceneFx.faintedTeam = teamOf(ev.monKey);
                    addLog(`${nameOf(ev.monKey)} fainted!`, 'death');
                    playSound('faint');
                    playCry(state.mons[ev.monKey].pokemon.id, 0.55); // dying cry
                    break;
                case 'switch':
                    addLog(`${sideLabel(teamOf(ev.monKey))} sent out ${nameOf(ev.monKey)}!`);
                    playSound('switch');
                    playCry(state.mons[ev.monKey].pokemon.id, 0.8);
                    break;
                case 'noEnergy':
                    addLog(`${nameOf(ev.monKey)} doesn't have enough energy for ${ev.moveName}!`);
                    break;
                case 'itemUsed':
                    addLog(`${sideLabel(ev.team)} used a ${ev.itemName} on ${nameOf(ev.monKey)}!`, 'critical');
                    addFloatingText(ev.itemName, '#4fc3f7', ev.team, 'status');
                    playSound('switch');
                    break;
                case 'heldItem':
                    addLog(`${nameOf(ev.monKey)}'s ${ev.itemName} activated!`, 'critical');
                    addFloatingText(ev.itemName, '#ffd54f', teamOf(ev.monKey), 'status');
                    break;
                case 'ballThrown': {
                    addLog(`You threw ${/^[AEIOU]/.test(ev.ballName) ? 'an' : 'a'} ${ev.ballName}!`);
                    if (sceneFx) {
                        sceneFx.ballThrow = { shakes: ev.shakes, caught: false };
                    } else {
                        sceneFx = {
                            id: nextId(),
                            attackerTeam: 1,
                            moveType: 'normal',
                            damageClass: 'status',
                            isCritical: false,
                            isDamaging: false,
                            ballThrow: { shakes: ev.shakes, caught: false },
                        };
                    }
                    if (ev.shakes > 0) addLog(`${'· '.repeat(ev.shakes).trim()} it shook ${ev.shakes} time${ev.shakes === 1 ? '' : 's'}...`);
                    playSound('switch');
                    break;
                }
                case 'caught':
                    if (sceneFx?.ballThrow) sceneFx.ballThrow.caught = true;
                    addLog(`Gotcha! ${nameOf(ev.monKey)} was caught!`, 'victory');
                    break;
                case 'brokeFree':
                    addLog(`Oh no! ${nameOf(ev.monKey)} broke free!`, 'critical');
                    addFloatingText('Broke free!', '#ff8a65', 2, 'status');
                    break;
                case 'pass':
                    addLog(`${sideLabel(ev.team)} passed the turn.`);
                    break;
                case 'gameOver':
                    addLog(
                        hotseat
                            ? `Player ${ev.winner} won the battle!`
                            : ev.winner === 1 ? 'You won the battle!' : 'You lost the battle!',
                        'victory'
                    );
                    playSound('victory');
                    stopMusic();
                    break;
            }
        });

        if (sceneFx) setFx(sceneFx);
        onEngineState(state);
    }, [addFloatingText, addLog, hotseat, nextId, onEngineState]);

    return {
        logs,
        floatingTexts,
        fx,
        setFx,
        battleStatsRef,
        addLog,
        addFloatingText,
        processEvents,
        resetEvents,
    };
};
