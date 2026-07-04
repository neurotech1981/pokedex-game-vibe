import type { Move } from '../data/moves';
import { STRUGGLE } from '../data/moves';
import type { TypeChart } from '../data/typeChart';
import { TYPE_EFFECTIVENESS, calculateTypeEffectiveness } from '../data/typeChart';
import type { BattleAction, BattleMon, EngineState, Rng, TeamId } from './battleEngine';
import {
    calculateDamage,
    canAffordMove,
    canUseItem,
    getActiveMon,
    getSwitchableMons,
} from './battleEngine';

export type AIDifficulty = 'beginner' | 'intermediate' | 'expert';
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced';

const DETERMINISTIC_RNG: Rng = () => 0.5;

const expectedDamage = (
    attacker: BattleMon,
    defender: BattleMon,
    move: Move,
    state: EngineState,
    chart: TypeChart
): number => {
    if (move.power <= 0) return 0;
    const result = calculateDamage(attacker, defender, move, {
        weather: state.weather,
        terrain: state.terrain,
        chart,
        rng: DETERMINISTIC_RNG,
    });
    return result.damage * move.accuracy;
};

const evaluateMove = (
    move: Move,
    attacker: BattleMon,
    defender: BattleMon,
    state: EngineState,
    chart: TypeChart,
    personality: AIPersonality
): number => {
    let score = 0;

    const damage = expectedDamage(attacker, defender, move, state, chart);
    score += damage * (personality === 'aggressive' ? 1.5 : 1);

    // A guaranteed KO is the best possible outcome
    if (damage >= defender.currentHp && move.accuracy >= 0.9) {
        score += 200;
    }

    // Status moves: only worthwhile if the target is not already statused
    if (move.statusEffect) {
        if (!defender.status) {
            const effectiveness = calculateTypeEffectiveness(move.type, defender.pokemon.types, chart);
            if (effectiveness > 0) {
                score += move.statusEffect.chance * move.accuracy * 50 *
                    (personality === 'defensive' ? 1.5 : 1);
            }
        } else if (move.power <= 0) {
            score -= 40;
        }
    }

    if (move.specialEffect) {
        const { type, value, chance } = move.specialEffect;
        if (type === 'heal') {
            const hpPct = attacker.currentHp / attacker.maxHp;
            const missingHp = attacker.maxHp - attacker.currentHp;
            const healValue = Math.min(missingHp, (attacker.maxHp * value) / 100);
            if (hpPct < 0.3) score += healValue * 3;
            else if (hpPct < 0.55) score += healValue * 1.5;
            else score -= 30;
            if (personality === 'defensive') score *= 1.3;
        } else if (type === 'boost') {
            const stat = move.specialEffect.stat ?? 'attack';
            score += attacker.stages[stat] < 2 ? 45 * chance : -20;
        } else if (type === 'weather') {
            score += state.weather === 'none' ? 30 * chance : -15;
        } else if (type === 'terrain') {
            score += state.terrain === 'none' ? 20 * chance : -15;
        }
    }

    if (move.comboMove) {
        score += move.comboMove.chance * 15;
    }

    // Prefer cheap moves when energy is running low
    if (attacker.energy < 40 && move.energyCost > 25) {
        score *= 0.7;
    }

    // Don't waste huge attacks on nearly-dead targets
    if (move.power > 100 && defender.currentHp / defender.maxHp < 0.25 && damage >= defender.currentHp) {
        score -= 20;
    }

    return score;
};

const matchupScore = (mon: BattleMon, opponent: BattleMon, chart: TypeChart): number => {
    let score = 0;
    // How hard can this mon hit the opponent?
    for (const type of mon.pokemon.types) {
        score += calculateTypeEffectiveness(type, opponent.pokemon.types, chart) * 10;
    }
    // How hard does the opponent hit this mon?
    for (const type of opponent.pokemon.types) {
        score -= calculateTypeEffectiveness(type, mon.pokemon.types, chart) * 8;
    }
    // Prefer healthy Pokémon
    score += (mon.currentHp / mon.maxHp) * 10;
    return score;
};

export const selectAIAction = (
    state: EngineState,
    chart: TypeChart = TYPE_EFFECTIVENESS,
    difficulty: AIDifficulty = 'intermediate',
    personality: AIPersonality = 'balanced',
    rng: Rng = Math.random
): BattleAction => {
    const team = state.currentTurn;
    const attacker = getActiveMon(state, team);
    const defender = getActiveMon(state, team === 1 ? 2 : 1);

    const allMoves = attacker.moves;
    const affordable = allMoves.filter(move => canAffordMove(attacker, move));

    if (affordable.length === 0) {
        return { kind: 'move', move: STRUGGLE };
    }

    const scored = affordable
        .map(move => ({
            move,
            score: evaluateMove(move, attacker, defender, state, chart, personality),
        }))
        .sort((a, b) => b.score - a.score);

    // Item usage (intermediate and expert only), unless the best move is a likely KO
    if (difficulty !== 'beginner') {
        const bestDamage = expectedDamage(attacker, defender, scored[0].move, state, chart);
        const likelyKO = bestDamage >= defender.currentHp && scored[0].move.accuracy >= 0.9;
        if (!likelyKO) {
            const hpPct = attacker.currentHp / attacker.maxHp;
            const badStatus = attacker.status?.type === 'sleep' || attacker.status?.type === 'freeze';
            if (canUseItem(state, team, 'fullHeal') && (badStatus || (attacker.status && hpPct < 0.6))) {
                return { kind: 'item', itemId: 'fullHeal' };
            }
            const potionThreshold = personality === 'defensive' ? 0.45 : 0.35;
            if (canUseItem(state, team, 'potion') && hpPct < potionThreshold) {
                return { kind: 'item', itemId: 'potion' };
            }
            if (
                personality === 'aggressive' &&
                canUseItem(state, team, 'xAttack') &&
                attacker.stages.attack === 0 &&
                hpPct > 0.6
            ) {
                return { kind: 'item', itemId: 'xAttack' };
            }
        }
    }

    // Expert AI considers switching out of terrible matchups
    if (difficulty === 'expert' && scored[0].score < 20) {
        const bench = getSwitchableMons(state, team);
        if (bench.length > 0) {
            const current = matchupScore(attacker, defender, chart);
            const best = bench
                .map(mon => ({ mon, score: matchupScore(mon, defender, chart) }))
                .sort((a, b) => b.score - a.score)[0];
            if (best.score > current + 15) {
                return { kind: 'switch', targetKey: best.mon.key };
            }
        }
    }

    const randomizationFactor = { beginner: 0.35, intermediate: 0.12, expert: 0 }[difficulty];
    if (rng() < randomizationFactor && scored.length > 1) {
        const pool = scored.slice(0, Math.min(3, scored.length));
        return { kind: 'move', move: pool[Math.floor(rng() * pool.length)].move };
    }

    return { kind: 'move', move: scored[0].move };
};

export const selectAIForcedSwitch = (
    state: EngineState,
    team: TeamId,
    chart: TypeChart = TYPE_EFFECTIVENESS
): string | null => {
    const bench = getSwitchableMons(state, team);
    if (bench.length === 0) return null;
    const opponent = getActiveMon(state, team === 1 ? 2 : 1);
    return bench
        .map(mon => ({ mon, score: matchupScore(mon, opponent, chart) }))
        .sort((a, b) => b.score - a.score)[0].mon.key;
};
