import type { HeldItemId, ItemId } from './items';
import { HELD_ITEM_IDS } from './items';
import type { Rng } from '../utils/battleEngine';

/**
 * Post-battle item drop tables. Every win pays out one roll; hot streaks
 * (every 3rd consecutive win) and gauntlet bosses add bonus rolls.
 */

const DROP_TABLE: { id: ItemId; weight: number }[] = [
    { id: 'potion', weight: 0.55 },
    { id: 'fullHeal', weight: 0.25 },
    { id: 'xAttack', weight: 0.2 },
];

export const rollItemDrop = (rng: Rng): ItemId => {
    const roll = rng();
    let cumulative = 0;
    for (const entry of DROP_TABLE) {
        cumulative += entry.weight;
        if (roll < cumulative) return entry.id;
    }
    return DROP_TABLE[DROP_TABLE.length - 1].id;
};

export const rollBattleRewards = (streak: number, isBoss: boolean, rng: Rng): ItemId[] => {
    const drops = [rollItemDrop(rng)];
    if (streak > 0 && streak % 3 === 0) drops.push(rollItemDrop(rng));
    if (isBoss) drops.push(rollItemDrop(rng));
    return drops;
};

/**
 * Held items are rarer: only boss kills and every-3rd-streak wins get a
 * 15% roll, uniform over the catalog.
 */
export const rollHeldItemDrop = (streak: number, isBoss: boolean, rng: Rng): HeldItemId | null => {
    if (!isBoss && !(streak > 0 && streak % 3 === 0)) return null;
    if (rng() >= 0.15) return null;
    return HELD_ITEM_IDS[Math.floor(rng() * HELD_ITEM_IDS.length)] ?? null;
};
