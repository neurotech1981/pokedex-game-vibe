import type { Pokemon } from '../types/pokemon';
import type { Ability } from '../types/abilities';
import type { TerrainType } from '../types/terrain';
import { TERRAIN_EFFECTS } from '../types/terrain';
import type { BoostableStat, DamageClass, Move, StatusType } from '../data/moves';
import { getDamageClass, getMovesForTypes } from '../data/moves';
import type { BallId, BallInventory, HeldItemId, ItemId, ItemInventory } from '../data/items';
import { BALLS, HELD_ITEMS, ITEMS, createInventory } from '../data/items';
import { calculateTypeEffectiveness, TYPE_EFFECTIVENESS, TypeChart } from '../data/typeChart';
import type { Evs, Ivs, IvStat } from '../data/natures';
import { natureMultiplier } from '../data/natures';

export type WeatherType = 'none' | 'rain' | 'sunny' | 'sandstorm' | 'hail';
export type TeamId = 1 | 2;
export type BattlePhase = 'selecting' | 'awaitingSwitch' | 'gameOver';

export type Rng = () => number;

export interface StatusState {
    type: StatusType;
    turns: number;
}

export type StatStages = Record<BoostableStat, number>;

export interface BattleMon {
    key: string;
    team: TeamId;
    pokemon: Pokemon;
    level: number;
    maxHp: number;
    currentHp: number;
    energy: number;
    maxEnergy: number;
    energyRegen: number;
    status: StatusState | null;
    stages: StatStages;
    ability: Ability | null;
    abilityUsed: boolean;
    /** Shiny/elite mons use alternate sprites and get a golden glow. */
    shiny?: boolean;
    /** Nature id (stats already folded in at creation) — kept for UI/replays. */
    nature?: string;
    /** The mon's usable moves this battle (defaults to type-derived moves). */
    moves: Move[];
    heldItem?: HeldItemId;
    /** One-shot held item effects (Focus Sash) mark themselves used here. */
    heldItemUsed: boolean;
    /** Priority of the last move used — winner leads the next round. */
    priorityMomentum: number;
    /** Set by flinching hits; consumed (blocking the action) on the next act. */
    flinched: boolean;
}

export interface EngineState {
    mons: Record<string, BattleMon>;
    order: { 1: string[]; 2: string[] };
    active: { 1: string; 2: string };
    currentTurn: TeamId;
    /** Which team leads the current round (recomputed from speed each round). */
    roundFirst: TeamId;
    /** Which teams have already acted this round. */
    acted: { 1: boolean; 2: boolean };
    phase: BattlePhase;
    pendingSwitch: TeamId | null;
    weather: WeatherType;
    weatherTurns: number;
    terrain: TerrainType;
    terrainTurns: number;
    winner: TeamId | null;
    turnCount: number;
    items: { 1: ItemInventory; 2: ItemInventory };
    /** Wild encounter: a single catchable opponent (Safari mode). */
    wild?: boolean;
    /** Poké Balls available to team 1 during a wild encounter. */
    balls: BallInventory;
    /** Set to the wild mon's key when a throw succeeds (battle ends). */
    caught?: string;
}

export type BattleEvent =
    | { kind: 'move'; monKey: string; moveName: string; moveType: string; damageClass: DamageClass }
    | { kind: 'damage'; monKey: string; amount: number; isCritical: boolean; effectiveness: number }
    | { kind: 'multiHit'; monKey: string; hits: number }
    | { kind: 'miss'; monKey: string; moveName: string }
    | { kind: 'blocked'; monKey: string; reason: 'paralysis' | 'sleep' | 'freeze' | 'confusion' | 'flinch' }
    | { kind: 'statusApplied'; monKey: string; status: StatusType }
    | { kind: 'statusDamage'; monKey: string; status: StatusType; amount: number }
    | { kind: 'statusCured'; monKey: string; status: StatusType }
    | { kind: 'heal'; monKey: string; amount: number }
    | { kind: 'statStage'; monKey: string; stat: BoostableStat; delta: number; stage: number }
    | { kind: 'confusionHit'; monKey: string; amount: number }
    | { kind: 'weatherChanged'; weather: WeatherType }
    | { kind: 'weatherDamage'; monKey: string; amount: number; weather: WeatherType }
    | { kind: 'terrainChanged'; terrain: TerrainType }
    | { kind: 'combo'; monKey: string; moveName: string }
    | { kind: 'abilityActivated'; monKey: string; abilityName: string }
    | { kind: 'faint'; monKey: string }
    | { kind: 'switch'; team: TeamId; monKey: string; forced: boolean }
    | { kind: 'noEnergy'; monKey: string; moveName: string }
    | { kind: 'pass'; team: TeamId }
    | { kind: 'itemUsed'; team: TeamId; monKey: string; itemId: ItemId; itemName: string }
    | { kind: 'heldItem'; monKey: string; itemName: string }
    | { kind: 'ballThrown'; ballId: BallId; ballName: string; shakes: number }
    | { kind: 'caught'; monKey: string }
    | { kind: 'brokeFree'; monKey: string }
    | { kind: 'gameOver'; winner: TeamId };

export type BattleAction =
    | { kind: 'move'; move: Move }
    | { kind: 'switch'; targetKey: string }
    | { kind: 'item'; itemId: ItemId }
    | { kind: 'throwBall'; ballId: BallId }
    | { kind: 'pass' };

export interface TurnResult {
    state: EngineState;
    events: BattleEvent[];
}

const WEATHER_MOVE_MAP: Record<string, WeatherType> = {
    'Rain Dance': 'rain',
    'Sunny Day': 'sunny',
    'Hail': 'hail',
    'Sandstorm': 'sandstorm',
    'Sand Attack': 'sandstorm',
};

const TERRAIN_MOVE_MAP: Record<string, TerrainType> = {
    electric: 'electric',
    grass: 'grassy',
    psychic: 'psychic',
    fairy: 'misty',
    poison: 'misty',
    ghost: 'psychic',
    fire: 'grassy',
};

const SANDSTORM_IMMUNE = ['rock', 'ground', 'steel'];
const HAIL_IMMUNE = ['ice'];

export const monKey = (team: TeamId, index: number, pokemonId: number): string =>
    `t${team}-${index}-${pokemonId}`;

export const calculateMaxHp = (pokemon: Pokemon, level: number): number => {
    const baseHp = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
    return Math.floor((2 * baseHp * level) / 100) + level + 10;
};

/** Standard stage multiplier: +1 → x1.5, +2 → x2 ... -1 → x0.67, -6 → x0.25 */
export const stageMultiplier = (stage: number): number =>
    stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);

export const effectiveSpeed = (mon: BattleMon): number => {
    const base = mon.pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 50;
    return base * stageMultiplier(mon.stages.speed) * (mon.status?.type === 'paralysis' ? 0.5 : 1);
};

/**
 * Chance (0.05–0.9) that a thrown ball catches the wild mon: weaker and
 * statused targets are easier; legendaries resist.
 */
export const catchChance = (mon: BattleMon, ballModifier: number): number => {
    const hpFactor = 1 - (mon.currentHp / mon.maxHp) * 0.85;
    const statusBonus = mon.status
        ? (mon.status.type === 'sleep' || mon.status.type === 'freeze' ? 1.5 : 1.2)
        : 1;
    const legendaryFactor = mon.pokemon.is_legendary || mon.pokemon.is_mythical ? 0.5 : 1;
    return Math.min(0.9, Math.max(0.05, hpFactor * ballModifier * statusBonus * legendaryFactor));
};

export interface BattleMonOptions {
    /** Starting HP as a fraction of max HP (default 1 = full). */
    currentHpPct?: number;
    shiny?: boolean;
    /** Multiplier applied to all base stats (elite/boss mons). */
    statMod?: number;
    /** Explicit moveset (e.g. fetched from PokeAPI); defaults to type-derived moves. */
    moves?: Move[];
    heldItem?: HeldItemId;
    /** Nature id from data/natures.ts: ±10% on one non-HP stat each. */
    nature?: string;
    /** Per-stat IVs 0–31, folded into base stats as +floor(iv/2). */
    ivs?: Ivs;
    /** Trained EVs 0–252/stat (510 total), folded into base stats as +floor(ev/4). */
    evs?: Evs;
}

export const createBattleMon = (
    pokemon: Pokemon,
    team: TeamId,
    index: number,
    level: number,
    ability: Ability | null,
    opts: BattleMonOptions = {}
): BattleMon => {
    const statMod = opts.statMod ?? 1;
    // Effective base stat = round((base + floor(iv/2) + floor(ev/4)) * natureMult * statMod).
    // IVs add up to +15 points per stat (HP included); EVs up to +63 per stat but
    // the 510 total cap limits ~2 maxed stats; natures are ±10% on one non-HP
    // stat each (natureMultiplier returns 1 for HP and neutral natures).
    // With no opts this is the identity, so plain mons are untouched.
    const effectivePokemon = statMod === 1 && !opts.nature && !opts.ivs && !opts.evs
        ? pokemon
        : {
            ...pokemon,
            stats: pokemon.stats.map(s => ({
                ...s,
                base_stat: Math.round(
                    (s.base_stat
                        + (opts.ivs ? Math.floor((opts.ivs[s.stat.name as IvStat] ?? 0) / 2) : 0)
                        + (opts.evs ? Math.floor((opts.evs[s.stat.name as IvStat] ?? 0) / 4) : 0))
                    * natureMultiplier(opts.nature, s.stat.name)
                    * statMod
                ),
            })),
        };
    const maxHp = calculateMaxHp(effectivePokemon, level);
    const hpPct = Math.max(0, Math.min(1, opts.currentHpPct ?? 1));
    return {
        key: monKey(team, index, pokemon.id),
        team,
        pokemon: effectivePokemon,
        level,
        maxHp,
        currentHp: Math.max(1, Math.round(maxHp * hpPct)),
        shiny: opts.shiny,
        nature: opts.nature,
        energy: 100,
        maxEnergy: 100,
        energyRegen: 12,
        status: null,
        stages: { attack: 0, defense: 0, speed: 0 },
        ability,
        abilityUsed: false,
        moves: opts.moves && opts.moves.length > 0 ? opts.moves : getMovesForTypes(pokemon.types),
        heldItem: opts.heldItem,
        heldItemUsed: false,
        priorityMomentum: 0,
        flinched: false,
    };
};

export interface EngineStateOptions {
    wild?: boolean;
    balls?: BallInventory;
}

export const createEngineState = (
    team1: BattleMon[],
    team2: BattleMon[],
    items?: { 1: ItemInventory; 2: ItemInventory },
    opts: EngineStateOptions = {}
): EngineState => {
    const mons: Record<string, BattleMon> = {};
    [...team1, ...team2].forEach(mon => { mons[mon.key] = mon; });
    return {
        mons,
        order: { 1: team1.map(m => m.key), 2: team2.map(m => m.key) },
        active: { 1: team1[0].key, 2: team2[0].key },
        currentTurn: 1,
        roundFirst: 1,
        acted: { 1: false, 2: false },
        phase: 'selecting',
        pendingSwitch: null,
        weather: 'none',
        weatherTurns: 0,
        terrain: 'none',
        terrainTurns: 0,
        winner: null,
        turnCount: 1,
        items: items ?? { 1: createInventory(), 2: createInventory() },
        wild: opts.wild,
        balls: opts.balls ?? {},
    };
};

export const getActiveMon = (state: EngineState, team: TeamId): BattleMon =>
    state.mons[state.active[team]];

export const getAliveMons = (state: EngineState, team: TeamId): BattleMon[] =>
    state.order[team].map(k => state.mons[k]).filter(m => m.currentHp > 0);

export const getSwitchableMons = (state: EngineState, team: TeamId): BattleMon[] =>
    getAliveMons(state, team).filter(m => m.key !== state.active[team]);

export const canAffordMove = (mon: BattleMon, move: Move): boolean =>
    mon.energy >= move.energyCost;

export const canUseItem = (state: EngineState, team: TeamId, itemId: ItemId): boolean => {
    if ((state.items[team][itemId] ?? 0) <= 0) return false;
    const mon = getActiveMon(state, team);
    const effect = ITEMS[itemId].effect;
    switch (effect.type) {
        case 'heal': return mon.currentHp < mon.maxHp;
        case 'cureStatus': return mon.status !== null;
        case 'boost': return mon.stages[effect.stat] < 6;
    }
};

interface DamageOptions {
    weather: WeatherType;
    terrain: TerrainType;
    chart?: TypeChart;
    rng?: Rng;
}

export interface DamageResult {
    damage: number;
    isCritical: boolean;
    effectiveness: number;
    /** True when an ability (e.g. Levitate) blocked the move rather than typing. */
    abilityImmune?: boolean;
}

export const calculateDamage = (
    attacker: BattleMon,
    defender: BattleMon,
    move: Move,
    options: DamageOptions
): DamageResult => {
    const { weather, terrain, chart = TYPE_EFFECTIVENESS, rng = Math.random } = options;

    if (move.power <= 0) {
        return { damage: 0, isCritical: false, effectiveness: 1 };
    }

    const effectiveness = calculateTypeEffectiveness(move.type, defender.pokemon.types, chart);
    if (effectiveness === 0) {
        return { damage: 0, isCritical: false, effectiveness: 0 };
    }

    if (defender.ability?.effect.type === 'immunity' && defender.ability.effect.immuneType === move.type) {
        return { damage: 0, isCritical: false, effectiveness: 0, abilityImmune: true };
    }

    // Physical/special split: special moves use special-attack vs special-defense.
    // Stat stages remain class-agnostic (attack/defense stages apply to both) —
    // BoostableStat deliberately has no special variants.
    const isSpecial = getDamageClass(move) === 'special';
    const attackName = isSpecial ? 'special-attack' : 'attack';
    const defenseName = isSpecial ? 'special-defense' : 'defense';
    const attackStat = (attacker.pokemon.stats.find(s => s.stat.name === attackName)?.base_stat || 50)
        * stageMultiplier(attacker.stages.attack);
    const defenseStat = (defender.pokemon.stats.find(s => s.stat.name === defenseName)?.base_stat || 50)
        * stageMultiplier(defender.stages.defense);

    let damage = (((2 * attacker.level) / 5 + 2) * move.power * (attackStat / Math.max(1, defenseStat))) / 50 + 2;

    if (weather === 'rain') {
        if (move.type === 'water') damage *= 1.5;
        if (move.type === 'fire') damage *= 0.5;
    } else if (weather === 'sunny') {
        if (move.type === 'fire') damage *= 1.5;
        if (move.type === 'water') damage *= 0.5;
    }

    if (attacker.pokemon.types.includes(move.type)) {
        damage *= 1.5;
    }

    // Type-boosting held items (Charcoal, Mystic Water, ...)
    if (attacker.heldItem) {
        const heldEffect = HELD_ITEMS[attacker.heldItem]?.effect;
        if (heldEffect?.type === 'typeBoost' && heldEffect.moveType === move.type) {
            damage *= heldEffect.multiplier;
        }
    }

    const isCritical = rng() < 0.0625;
    if (isCritical) {
        damage *= 1.5;
    }

    // Burn weakens physical attacks only (classic behavior)
    if (attacker.status?.type === 'burn' && !isSpecial) {
        damage *= 0.5;
    }

    damage *= TERRAIN_EFFECTS[terrain].damageMultiplier;
    damage *= effectiveness;
    damage *= 0.85 + rng() * 0.15;

    return { damage: Math.max(1, Math.round(damage)), isCritical, effectiveness };
};

export interface ActCheckResult {
    canAct: boolean;
    reason?: 'paralysis' | 'sleep' | 'freeze' | 'confusion' | 'flinch';
    cured?: boolean;
}

export const checkCanAct = (mon: BattleMon, rng: Rng = Math.random): ActCheckResult => {
    // Flinch blocks unconditionally (consumed by the caller)
    if (mon.flinched) return { canAct: false, reason: 'flinch' };
    if (!mon.status) return { canAct: true };
    switch (mon.status.type) {
        case 'paralysis':
            return rng() < 0.25 ? { canAct: false, reason: 'paralysis' } : { canAct: true };
        case 'sleep':
            if (mon.status.turns <= 1) return { canAct: true, cured: true };
            return { canAct: false, reason: 'sleep' };
        case 'freeze':
            if (rng() < 0.2) return { canAct: true, cured: true };
            return { canAct: false, reason: 'freeze' };
        case 'confusion':
            return rng() < 0.33 ? { canAct: false, reason: 'confusion' } : { canAct: true };
        default:
            return { canAct: true };
    }
};

export const statusTickDamage = (mon: BattleMon): number => {
    if (!mon.status) return 0;
    if (mon.status.type === 'burn') return Math.max(1, Math.floor(mon.maxHp / 16));
    if (mon.status.type === 'poison') return Math.max(1, Math.floor(mon.maxHp / 8));
    return 0;
};

const statusDuration = (status: StatusType, rng: Rng): number => {
    switch (status) {
        case 'sleep': return 1 + Math.floor(rng() * 3);
        case 'confusion': return 2 + Math.floor(rng() * 3);
        case 'freeze': return 99;
        default: return 5;
    }
};

const cloneState = (state: EngineState): EngineState => ({
    ...state,
    mons: Object.fromEntries(
        Object.entries(state.mons).map(([k, m]) => [
            k,
            { ...m, status: m.status ? { ...m.status } : null, stages: { ...m.stages } },
        ])
    ),
    order: { 1: [...state.order[1]], 2: [...state.order[2]] },
    active: { ...state.active },
    acted: { ...state.acted },
    items: { 1: { ...state.items[1] }, 2: { ...state.items[2] } },
    balls: { ...state.balls },
});

const applyStatStage = (
    mon: BattleMon,
    stat: BoostableStat,
    delta: number,
    events: BattleEvent[]
): void => {
    const next = Math.max(-6, Math.min(6, mon.stages[stat] + delta));
    const applied = next - mon.stages[stat];
    if (applied === 0) return;
    mon.stages[stat] = next;
    events.push({ kind: 'statStage', monKey: mon.key, stat, delta: applied, stage: next });
};

/**
 * Apply damage to a mon, honoring survive-at-1HP effects (once per battle,
 * only from full HP): Sturdy-style abilities first, then a Focus Sash.
 * Returns which effect fired, or false.
 */
const applyDamage = (mon: BattleMon, amount: number): 'ability' | 'item' | false => {
    const lethalFromFull = amount >= mon.currentHp && mon.currentHp === mon.maxHp;
    if (lethalFromFull && mon.ability?.effect.type === 'survive' && !mon.abilityUsed) {
        mon.abilityUsed = true;
        mon.currentHp = 1;
        return 'ability';
    }
    if (
        lethalFromFull &&
        mon.heldItem &&
        HELD_ITEMS[mon.heldItem]?.effect.type === 'survive' &&
        !mon.heldItemUsed
    ) {
        mon.heldItemUsed = true;
        mon.currentHp = 1;
        return 'item';
    }
    mon.currentHp = Math.max(0, mon.currentHp - amount);
    return false;
};

// Entry abilities (Intimidate): fire when a mon enters the field.
const dispatchOnEnter = (state: EngineState, mon: BattleMon, events: BattleEvent[]): void => {
    if (mon.currentHp <= 0 || mon.ability?.trigger !== 'onEnter') return;
    if (mon.ability.effect.type === 'intimidate') {
        const opp = getActiveMon(state, mon.team === 1 ? 2 : 1);
        if (opp.currentHp > 0) {
            events.push({ kind: 'abilityActivated', monKey: mon.key, abilityName: mon.ability.name });
            applyStatStage(opp, 'attack', mon.ability.effect.value, events);
        }
    }
};

const determineRoundFirst = (state: EngineState, rng: Rng, events?: BattleEvent[]): TeamId => {
    const mon1 = getActiveMon(state, 1);
    const mon2 = getActiveMon(state, 2);

    // Priority momentum outranks everything: a mon that just used a
    // priority move leads the next round (momentum model — see Move.priority)
    if (mon1.priorityMomentum !== mon2.priorityMomentum) {
        return mon1.priorityMomentum > mon2.priorityMomentum ? 1 : 2;
    }

    // Quick Claw: chance to lead the round regardless of speed. If exactly
    // one side procs, that side goes first.
    const quickClawProc = (mon: BattleMon): boolean => {
        if (!mon.heldItem || mon.currentHp <= 0) return false;
        const effect = HELD_ITEMS[mon.heldItem]?.effect;
        return effect?.type === 'movePriority' && rng() < effect.chance;
    };
    const proc1 = quickClawProc(mon1);
    const proc2 = quickClawProc(mon2);
    if (proc1 !== proc2) {
        const claw = proc1 ? mon1 : mon2;
        events?.push({ kind: 'heldItem', monKey: claw.key, itemName: HELD_ITEMS[claw.heldItem!].name });
        return proc1 ? 1 : 2;
    }

    const s1 = effectiveSpeed(mon1);
    const s2 = effectiveSpeed(mon2);
    if (s1 === s2) return rng() < 0.5 ? 1 : 2;
    return s1 > s2 ? 1 : 2;
};

const handleFaint = (state: EngineState, faintedMon: BattleMon, events: BattleEvent[]): boolean => {
    events.push({ kind: 'faint', monKey: faintedMon.key });
    const team = faintedMon.team;
    const opponent: TeamId = team === 1 ? 2 : 1;
    if (getAliveMons(state, team).length === 0) {
        state.phase = 'gameOver';
        state.winner = opponent;
        state.pendingSwitch = null;
        events.push({ kind: 'gameOver', winner: opponent });
        return true;
    }
    if (state.active[team] === faintedMon.key) {
        state.phase = 'awaitingSwitch';
        state.pendingSwitch = team;
    }
    return false;
};

const applyEndOfTurn = (state: EngineState, actor: BattleMon, events: BattleEvent[], rng: Rng): void => {
    if (state.phase === 'gameOver') return;

    // Status tick damage on the acting Pokémon
    if (actor.currentHp > 0 && actor.status) {
        const tick = statusTickDamage(actor);
        if (tick > 0) {
            actor.currentHp = Math.max(0, actor.currentHp - tick);
            events.push({ kind: 'statusDamage', monKey: actor.key, status: actor.status.type, amount: tick });
            if (actor.currentHp === 0) {
                if (handleFaint(state, actor, events)) return;
            }
        }
        // Countdown status duration
        if (actor.status) {
            actor.status.turns -= 1;
            if (actor.status.turns <= 0) {
                events.push({ kind: 'statusCured', monKey: actor.key, status: actor.status.type });
                actor.status = null;
            }
        }
    }

    // Energy regen for the acting Pokémon
    if (actor.currentHp > 0) {
        actor.energy = Math.min(actor.maxEnergy, actor.energy + actor.energyRegen);
    }

    state.acted[actor.team] = true;
    const roundOver = state.acted[1] && state.acted[2];

    if (!roundOver) {
        // Pass the turn to whichever team has not acted yet this round
        // (unless someone must switch first; the turn still flips so play
        // resumes correctly after the forced switch)
        state.currentTurn = state.acted[1] ? 2 : 1;
        return;
    }

    // ---- Round end: leftovers, weather chip, countdowns, next round's turn order ----

    // Leftovers-style held items heal before weather chip damage
    ([1, 2] as TeamId[]).forEach(team => {
        const mon = getActiveMon(state, team);
        if (mon.currentHp <= 0 || mon.currentHp >= mon.maxHp || !mon.heldItem) return;
        const heldEffect = HELD_ITEMS[mon.heldItem]?.effect;
        if (heldEffect?.type !== 'endOfRoundHeal') return;
        const heal = Math.min(mon.maxHp - mon.currentHp, Math.max(1, Math.floor(mon.maxHp * heldEffect.fraction)));
        mon.currentHp += heal;
        events.push({ kind: 'heldItem', monKey: mon.key, itemName: HELD_ITEMS[mon.heldItem].name });
        events.push({ kind: 'heal', monKey: mon.key, amount: heal });
    });

    // Weather chip damage hits both active Pokémon at the end of the round
    if (state.weather === 'sandstorm' || state.weather === 'hail') {
        const immuneTypes = state.weather === 'sandstorm' ? SANDSTORM_IMMUNE : HAIL_IMMUNE;
        let over = false;
        ([1, 2] as TeamId[]).forEach(team => {
            if (over) return;
            const mon = getActiveMon(state, team);
            if (mon.currentHp > 0 && !mon.pokemon.types.some(t => immuneTypes.includes(t))) {
                const chip = Math.max(1, Math.floor(mon.maxHp / 16));
                mon.currentHp = Math.max(0, mon.currentHp - chip);
                events.push({ kind: 'weatherDamage', monKey: mon.key, amount: chip, weather: state.weather });
                if (mon.currentHp === 0) {
                    over = handleFaint(state, mon, events);
                }
            }
        });
        if (over) return;
    }

    // Weather / terrain countdown (once per full round)
    if (state.weather !== 'none') {
        state.weatherTurns -= 1;
        if (state.weatherTurns <= 0) {
            state.weather = 'none';
            events.push({ kind: 'weatherChanged', weather: 'none' });
        }
    }
    if (state.terrain !== 'none') {
        state.terrainTurns -= 1;
        if (state.terrainTurns <= 0) {
            state.terrain = 'none';
            events.push({ kind: 'terrainChanged', terrain: 'none' });
        }
    }
    state.turnCount += 1;

    // Unconsumed flinches expire with the round (e.g. the target switched out)
    getActiveMon(state, 1).flinched = false;
    getActiveMon(state, 2).flinched = false;

    // The faster active Pokémon leads the next round
    state.acted = { 1: false, 2: false };
    state.roundFirst = determineRoundFirst(state, rng, events);
    state.currentTurn = state.roundFirst;
};

const tryActivateAbility = (mon: BattleMon, events: BattleEvent[], rng: Rng): number => {
    // Low-HP boost abilities (Overgrow/Blaze/Torrent style): once per battle,
    // activate when below 30% HP for a one-turn damage boost.
    if (!mon.ability || mon.abilityUsed) return 1;
    if (mon.ability.effect.type !== 'boost') return 1;
    if (mon.currentHp / mon.maxHp > 0.3) return 1;
    if (mon.ability.effect.chance && rng() > mon.ability.effect.chance) return 1;
    mon.abilityUsed = true;
    events.push({ kind: 'abilityActivated', monKey: mon.key, abilityName: mon.ability.name });
    return mon.ability.effect.value;
};

/**
 * Kick off a battle: the faster lead moves first, and entry abilities
 * (Intimidate) trigger for both sides.
 */
export const beginBattle = (prevState: EngineState, rng: Rng = Math.random): TurnResult => {
    const state = cloneState(prevState);
    const events: BattleEvent[] = [];
    state.acted = { 1: false, 2: false };
    state.roundFirst = determineRoundFirst(state, rng, events);
    state.currentTurn = state.roundFirst;
    const other: TeamId = state.roundFirst === 1 ? 2 : 1;
    dispatchOnEnter(state, getActiveMon(state, state.roundFirst), events);
    dispatchOnEnter(state, getActiveMon(state, other), events);
    return { state, events };
};

export const resolveAction = (
    prevState: EngineState,
    action: BattleAction,
    chart: TypeChart = TYPE_EFFECTIVENESS,
    rng: Rng = Math.random
): TurnResult => {
    const state = cloneState(prevState);
    const events: BattleEvent[] = [];

    if (state.phase !== 'selecting') {
        return { state: prevState, events };
    }

    const team = state.currentTurn;
    const actor = getActiveMon(state, team);
    const defender = getActiveMon(state, team === 1 ? 2 : 1);

    if (actor.currentHp <= 0) {
        // Should not happen: a fainted Pokémon can never act
        return { state: prevState, events };
    }

    if (action.kind === 'pass') {
        actor.priorityMomentum = 0;
        events.push({ kind: 'pass', team });
        applyEndOfTurn(state, actor, events, rng);
        return { state, events };
    }

    if (action.kind === 'switch') {
        const target = state.mons[action.targetKey];
        if (!target || target.team !== team || target.currentHp <= 0 || target.key === actor.key) {
            return { state: prevState, events };
        }
        actor.priorityMomentum = 0;
        actor.flinched = false; // don't carry a flinch to the bench
        state.active[team] = target.key;
        events.push({ kind: 'switch', team, monKey: target.key, forced: false });
        dispatchOnEnter(state, target, events);
        applyEndOfTurn(state, target, events, rng);
        return { state, events };
    }

    if (action.kind === 'item') {
        if (!canUseItem(state, team, action.itemId)) {
            return { state: prevState, events };
        }
        const item = ITEMS[action.itemId];
        events.push({ kind: 'itemUsed', team, monKey: actor.key, itemId: item.id, itemName: item.name });
        switch (item.effect.type) {
            case 'heal': {
                const healAmount = Math.min(
                    actor.maxHp - actor.currentHp,
                    Math.round((actor.maxHp * item.effect.percent) / 100)
                );
                actor.currentHp += healAmount;
                events.push({ kind: 'heal', monKey: actor.key, amount: healAmount });
                break;
            }
            case 'cureStatus': {
                if (actor.status) {
                    events.push({ kind: 'statusCured', monKey: actor.key, status: actor.status.type });
                    actor.status = null;
                }
                break;
            }
            case 'boost': {
                applyStatStage(actor, item.effect.stat, item.effect.stages, events);
                break;
            }
        }
        actor.priorityMomentum = 0;
        state.items[team][action.itemId] -= 1;
        applyEndOfTurn(state, actor, events, rng);
        return { state, events };
    }

    if (action.kind === 'throwBall') {
        // Only team 1 can throw, only at wild Pokémon, only with balls left
        if (!state.wild || team !== 1 || (state.balls[action.ballId] ?? 0) <= 0) {
            return { state: prevState, events };
        }
        actor.priorityMomentum = 0;
        state.balls[action.ballId] = (state.balls[action.ballId] ?? 0) - 1;

        const target = getActiveMon(state, 2);
        const ball = BALLS[action.ballId];
        const chance = catchChance(target, ball.modifier);
        const roll = rng();
        const success = roll < chance;
        // Near misses shake more — pure drama, no mechanical effect
        const shakes = success ? 3 : roll < chance * 1.5 ? 2 : roll < chance * 2.5 ? 1 : 0;
        events.push({ kind: 'ballThrown', ballId: action.ballId, ballName: ball.name, shakes });

        if (success) {
            state.caught = target.key;
            state.phase = 'gameOver';
            state.winner = 1;
            state.pendingSwitch = null;
            events.push({ kind: 'caught', monKey: target.key });
            events.push({ kind: 'gameOver', winner: 1 });
            return { state, events };
        }

        events.push({ kind: 'brokeFree', monKey: target.key });
        applyEndOfTurn(state, actor, events, rng);
        return { state, events };
    }

    // action.kind === 'move'
    const move = action.move;

    if (!canAffordMove(actor, move)) {
        events.push({ kind: 'noEnergy', monKey: actor.key, moveName: move.name });
        return { state: prevState, events };
    }

    // Status pre-check (flinch / paralysis / sleep / freeze / confusion)
    const actCheck = checkCanAct(actor, rng);
    actor.flinched = false; // consumed either way
    if (actCheck.cured && actor.status) {
        events.push({ kind: 'statusCured', monKey: actor.key, status: actor.status.type });
        actor.status = null;
    }
    if (!actCheck.canAct) {
        actor.priorityMomentum = 0;
        events.push({ kind: 'blocked', monKey: actor.key, reason: actCheck.reason! });
        // Confused Pokémon hurt themselves: a typeless 40-power hit against their own stats
        if (actCheck.reason === 'confusion') {
            const atk = actor.pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 50;
            const def = actor.pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 50;
            const selfHit = Math.max(1, Math.round(
                (((2 * actor.level) / 5 + 2) * 40 * (atk / Math.max(1, def))) / 50 + 2
            ));
            actor.currentHp = Math.max(0, actor.currentHp - selfHit);
            events.push({ kind: 'confusionHit', monKey: actor.key, amount: selfHit });
            if (actor.currentHp === 0 && handleFaint(state, actor, events)) {
                return { state, events };
            }
        }
        applyEndOfTurn(state, actor, events, rng);
        return { state, events };
    }

    actor.energy = Math.max(0, actor.energy - move.energyCost);
    // Momentum: a priority move means this mon leads the next round (a miss
    // still counts — the mon moved fast regardless)
    actor.priorityMomentum = move.priority ?? 0;
    events.push({ kind: 'move', monKey: actor.key, moveName: move.name, moveType: move.type, damageClass: getDamageClass(move) });

    // Accuracy roll
    if (rng() >= move.accuracy) {
        events.push({ kind: 'miss', monKey: actor.key, moveName: move.name });
        applyEndOfTurn(state, actor, events, rng);
        return { state, events };
    }

    // Ability boost (Overgrow / Blaze / Torrent)
    const abilityBoost = move.power > 0 ? tryActivateAbility(actor, events, rng) : 1;

    // Damage
    let dealtDamage = 0;
    if (move.power > 0) {
        const result = calculateDamage(actor, defender, move, {
            weather: state.weather,
            terrain: state.terrain,
            chart,
            rng,
        });
        if (result.abilityImmune && defender.ability) {
            events.push({ kind: 'abilityActivated', monKey: defender.key, abilityName: defender.ability.name });
        }
        const damage = result.effectiveness === 0 ? 0 : Math.round(result.damage * abilityBoost);
        let survived: 'ability' | 'item' | false = false;
        if (damage > 0) {
            survived = applyDamage(defender, damage);
            dealtDamage += damage;
        }
        events.push({
            kind: 'damage',
            monKey: defender.key,
            amount: damage,
            isCritical: result.isCritical,
            effectiveness: result.effectiveness,
        });
        if (survived === 'ability' && defender.ability) {
            events.push({ kind: 'abilityActivated', monKey: defender.key, abilityName: defender.ability.name });
        } else if (survived === 'item' && defender.heldItem) {
            events.push({ kind: 'heldItem', monKey: defender.key, itemName: HELD_ITEMS[defender.heldItem].name });
        }

        // Multi-hit follow-ups: each extra hit rolls fresh damage/crit;
        // survive-once effects (Sturdy/Sash) naturally apply per hit
        if (move.multiHit && damage > 0) {
            const totalHits = move.multiHit.min +
                Math.floor(rng() * (move.multiHit.max - move.multiHit.min + 1));
            let landed = 1;
            for (let hit = 1; hit < totalHits && defender.currentHp > 0; hit++) {
                const hitResult = calculateDamage(actor, defender, move, {
                    weather: state.weather,
                    terrain: state.terrain,
                    chart,
                    rng,
                });
                const hitDamage = hitResult.effectiveness === 0 ? 0 : Math.round(hitResult.damage * abilityBoost);
                if (hitDamage <= 0) break;
                const hitSurvived = applyDamage(defender, hitDamage);
                dealtDamage += hitDamage;
                landed += 1;
                events.push({
                    kind: 'damage',
                    monKey: defender.key,
                    amount: hitDamage,
                    isCritical: hitResult.isCritical,
                    effectiveness: hitResult.effectiveness,
                });
                if (hitSurvived === 'ability' && defender.ability) {
                    events.push({ kind: 'abilityActivated', monKey: defender.key, abilityName: defender.ability.name });
                } else if (hitSurvived === 'item' && defender.heldItem) {
                    events.push({ kind: 'heldItem', monKey: defender.key, itemName: HELD_ITEMS[defender.heldItem].name });
                }
            }
            if (landed > 1) {
                events.push({ kind: 'multiHit', monKey: actor.key, hits: landed });
            }
        }

        // Combo follow-up
        if (defender.currentHp > 0 && move.comboMove && rng() < move.comboMove.chance) {
            const comboResult = calculateDamage(actor, defender, {
                ...move,
                name: move.comboMove.name,
                power: move.comboMove.power,
                type: move.comboMove.type,
            }, { weather: state.weather, terrain: state.terrain, chart, rng });
            if (comboResult.effectiveness > 0) {
                const comboSurvived = applyDamage(defender, comboResult.damage);
                dealtDamage += comboResult.damage;
                events.push({ kind: 'combo', monKey: actor.key, moveName: move.comboMove.name });
                events.push({
                    kind: 'damage',
                    monKey: defender.key,
                    amount: comboResult.damage,
                    isCritical: comboResult.isCritical,
                    effectiveness: comboResult.effectiveness,
                });
                if (comboSurvived === 'ability' && defender.ability) {
                    events.push({ kind: 'abilityActivated', monKey: defender.key, abilityName: defender.ability.name });
                } else if (comboSurvived === 'item' && defender.heldItem) {
                    events.push({ kind: 'heldItem', monKey: defender.key, itemName: HELD_ITEMS[defender.heldItem].name });
                }
            }
        }

        // Retaliation abilities (Static): the surviving defender may status the attacker
        if (
            dealtDamage > 0 &&
            defender.currentHp > 0 &&
            defender.ability?.effect.type === 'retaliate' &&
            !actor.status &&
            rng() < (defender.ability.effect.chance ?? 1)
        ) {
            const retaliateStatus = defender.ability.effect.statusType ?? 'paralysis';
            events.push({ kind: 'abilityActivated', monKey: defender.key, abilityName: defender.ability.name });
            actor.status = { type: retaliateStatus, turns: statusDuration(retaliateStatus, rng) };
            events.push({ kind: 'statusApplied', monKey: actor.key, status: retaliateStatus });
        }

        // Flinch: only meaningful if the defender still has to act this round
        if (
            move.flinchChance &&
            dealtDamage > 0 &&
            defender.currentHp > 0 &&
            !state.acted[defender.team] &&
            rng() < move.flinchChance
        ) {
            defender.flinched = true;
        }

        // Stat-lowering side effects (Rock Tomb, Crunch, ...)
        if (move.debuff && defender.currentHp > 0 && rng() < move.debuff.chance) {
            applyStatStage(defender, move.debuff.stat, -move.debuff.stages, events);
        }
    }

    // Pure status debuffs (Growl, Tail Whip, ...) — no damage required
    if (move.power <= 0 && move.debuff && defender.currentHp > 0 && rng() < move.debuff.chance) {
        applyStatStage(defender, move.debuff.stat, -move.debuff.stages, events);
    }

    // Status effect application (only if the target is still standing and unstatused)
    if (
        move.statusEffect &&
        defender.currentHp > 0 &&
        !defender.status &&
        rng() < move.statusEffect.chance * TERRAIN_EFFECTS[state.terrain].statusEffectChance
    ) {
        defender.status = {
            type: move.statusEffect.type,
            turns: statusDuration(move.statusEffect.type, rng),
        };
        events.push({ kind: 'statusApplied', monKey: defender.key, status: move.statusEffect.type });
    }

    // Special effects (heal / boost / weather / terrain)
    if (move.specialEffect && rng() < move.specialEffect.chance) {
        switch (move.specialEffect.type) {
            case 'heal': {
                const healAmount = Math.min(
                    actor.maxHp - actor.currentHp,
                    Math.round((actor.maxHp * move.specialEffect.value) / 100)
                );
                if (healAmount > 0) {
                    actor.currentHp += healAmount;
                    events.push({ kind: 'heal', monKey: actor.key, amount: healAmount });
                }
                break;
            }
            case 'boost': {
                applyStatStage(actor, move.specialEffect.stat ?? 'attack', move.specialEffect.value, events);
                break;
            }
            case 'weather': {
                const newWeather = WEATHER_MOVE_MAP[move.name] || 'rain';
                if (newWeather !== state.weather) {
                    state.weather = newWeather;
                    state.weatherTurns = 5;
                    events.push({ kind: 'weatherChanged', weather: newWeather });
                }
                break;
            }
            case 'terrain': {
                const newTerrain = TERRAIN_MOVE_MAP[move.type] || 'misty';
                if (newTerrain !== state.terrain) {
                    state.terrain = newTerrain;
                    state.terrainTurns = TERRAIN_EFFECTS[newTerrain].duration;
                    events.push({ kind: 'terrainChanged', terrain: newTerrain });
                }
                break;
            }
        }
    }

    // Faint check
    if (defender.currentHp === 0) {
        if (handleFaint(state, defender, events)) {
            return { state, events };
        }
    }

    applyEndOfTurn(state, actor, events, rng);
    return { state, events };
};

export const resolveForcedSwitch = (
    prevState: EngineState,
    targetKey: string,
    rng: Rng = Math.random
): TurnResult => {
    const state = cloneState(prevState);
    const events: BattleEvent[] = [];

    if (state.phase !== 'awaitingSwitch' || state.pendingSwitch === null) {
        return { state: prevState, events };
    }
    const team = state.pendingSwitch;
    const target = state.mons[targetKey];
    if (!target || target.team !== team || target.currentHp <= 0) {
        return { state: prevState, events };
    }

    state.active[team] = target.key;
    state.phase = 'selecting';
    state.pendingSwitch = null;
    events.push({ kind: 'switch', team, monKey: target.key, forced: true });
    dispatchOnEnter(state, target, events);

    // If the faint closed out a round, the new matchup decides who leads next
    if (!state.acted[1] && !state.acted[2]) {
        state.roundFirst = determineRoundFirst(state, rng, events);
        state.currentTurn = state.roundFirst;
    }
    return { state, events };
};

export const setWeather = (prevState: EngineState, weather: WeatherType): TurnResult => {
    const state = cloneState(prevState);
    state.weather = weather;
    state.weatherTurns = weather === 'none' ? 0 : 5;
    return { state, events: [{ kind: 'weatherChanged', weather }] };
};

export const setTerrain = (prevState: EngineState, terrain: TerrainType): TurnResult => {
    const state = cloneState(prevState);
    state.terrain = terrain;
    state.terrainTurns = TERRAIN_EFFECTS[terrain].duration;
    return { state, events: [{ kind: 'terrainChanged', terrain }] };
};
