import type { BallId, HeldItemId, ItemId } from '../data/items';
import type { PlayerProfile } from './progression';
import { KANTO_DEX_SIZE, addBalls, addHeldItems, addItems } from './progression';
import { GYM_STAGES, JOHTO_GYM_STAGES } from '../data/league';

const kantoCaught = (p: PlayerProfile): number => p.dex.caught.filter(id => id <= KANTO_DEX_SIZE).length;

/**
 * Achievements: pure predicates over the player profile, evaluated after
 * every battle. Earned ids persist in profile.achievements.
 */

export interface AchievementReward {
    items?: ItemId[];
    balls?: BallId[];
    heldItems?: HeldItemId[];
    /** PokéCoins. Paid once, when the achievement is first earned — no
     * retroactive backpay for saves that earned it before coins existed
     * (evaluateAchievements never re-returns recorded ids). */
    coins?: number;
}

export interface Achievement {
    id: string;
    name: string;
    emoji: string;
    description: string;
    reward?: AchievementReward;
    check: (profile: PlayerProfile) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first-win', name: 'First Victory', emoji: '🎉',
        description: 'Win your first battle.',
        reward: { coins: 100, items: ['potion'] },
        check: p => p.records.wins >= 1,
    },
    {
        id: 'win-25', name: 'Battle Hardened', emoji: '⚔️',
        description: 'Win 25 battles.',
        reward: { coins: 250, items: ['fullHeal', 'xAttack'] },
        check: p => p.records.wins >= 25,
    },
    {
        id: 'win-100', name: 'Centurion', emoji: '🏛️',
        description: 'Win 100 battles.',
        reward: { coins: 500, balls: ['ultraball', 'ultraball'] },
        check: p => p.records.wins >= 100,
    },
    {
        id: 'streak-5', name: 'On Fire', emoji: '🔥',
        description: 'Reach a 5-win streak.',
        reward: { coins: 100, items: ['potion', 'potion'] },
        check: p => p.records.bestStreak >= 5,
    },
    {
        id: 'streak-10', name: 'Unstoppable', emoji: '⚡',
        description: 'Reach a 10-win streak.',
        reward: { coins: 250, balls: ['greatball', 'greatball'] },
        check: p => p.records.bestStreak >= 10,
    },
    {
        id: 'first-catch', name: 'Gotcha!', emoji: '🎣',
        description: 'Catch your first wild Pokémon.',
        reward: { coins: 100, balls: ['greatball'] },
        check: p => p.records.caught >= 1,
    },
    {
        id: 'catch-10', name: 'Collector', emoji: '🧺',
        description: 'Catch 10 wild Pokémon.',
        reward: { coins: 250, balls: ['ultraball', 'ultraball', 'ultraball'] },
        check: p => p.records.caught >= 10,
    },
    {
        id: 'badges-8', name: 'Badge Master', emoji: '🎖️',
        description: 'Earn all 8 Kanto gym badges.',
        reward: { coins: 250, items: ['fullHeal', 'fullHeal'] },
        check: p => GYM_STAGES.every(s => p.league.defeated.includes(s.id)),
    },
    {
        id: 'champion', name: 'Pokémon Champion', emoji: '🏆',
        description: 'Defeat the Elite Four and the Champion.',
        reward: { coins: 500, balls: ['ultraball', 'ultraball', 'ultraball'] },
        check: p => p.league.champion,
    },
    {
        id: 'johto-badges-8', name: 'Johto Trailblazer', emoji: '🎌',
        description: 'Earn all 8 Johto gym badges.',
        reward: { coins: 250, balls: ['ultraball', 'ultraball'] },
        check: p => JOHTO_GYM_STAGES.every(s => p.league.defeated.includes(s.id)),
    },
    {
        id: 'champion-red', name: 'The Very Best', emoji: '🔴',
        description: 'Defeat Red at Mt. Silver — the true ending.',
        reward: { coins: 500, heldItems: ['leftovers'], balls: ['ultraball', 'ultraball', 'ultraball'] },
        check: p => p.league.champion2,
    },
    {
        id: 'gauntlet-10', name: 'Gauntlet Runner', emoji: '🏃',
        description: 'Reach stage 10 of the gauntlet.',
        reward: { coins: 250, items: ['xAttack', 'xAttack'] },
        check: p => p.records.gauntletBestStage >= 10,
    },
    {
        id: 'box-10', name: 'Full House', emoji: '📦',
        description: 'Have 10 Pokémon in your Box.',
        reward: { coins: 100 },
        check: p => p.box.length >= 10,
    },
    {
        id: 'move-master', name: 'Move Tutor', emoji: '📖',
        description: 'Customize a moveset in the Team Builder.',
        reward: { coins: 100 },
        check: p => Object.values(p.mons).some(m => (m.customMoves?.length ?? 0) > 0),
    },
    {
        id: 'elite-friend', name: 'Elite Company', emoji: '⭐',
        description: 'Recruit an elite Pokémon.',
        reward: { coins: 100 },
        check: p => Object.values(p.mons).some(m => m.elite),
    },
    {
        id: 'shiny-friend', name: 'Shine Bright', emoji: '✨',
        description: 'Own a shiny Pokémon.',
        reward: { coins: 100 },
        check: p => Object.values(p.mons).some(m => m.shiny),
    },
    {
        id: 'level-100', name: 'Peak Performance', emoji: '💯',
        description: 'Raise a Pokémon to level 100.',
        reward: { coins: 250, heldItems: ['leftovers'] },
        check: p => Object.values(p.mons).some(m => m.level >= 100),
    },
    {
        id: 'dex-seen-50', name: 'Field Researcher', emoji: '🔍',
        description: 'See 50 Kanto species in battle.',
        reward: { coins: 100, balls: ['greatball', 'greatball'] },
        check: p => p.dex.seen.filter(id => id <= KANTO_DEX_SIZE).length >= 50,
    },
    {
        id: 'dex-caught-10', name: 'Dex Apprentice', emoji: '📕',
        description: 'Register 10 Kanto species as caught.',
        reward: { coins: 100, balls: ['greatball', 'greatball'] },
        check: p => kantoCaught(p) >= 10,
    },
    {
        id: 'dex-caught-50', name: 'Dex Scholar', emoji: '📗',
        description: 'Register 50 Kanto species as caught.',
        reward: { coins: 250, balls: ['ultraball', 'ultraball'] },
        check: p => kantoCaught(p) >= 50,
    },
    {
        id: 'dex-caught-100', name: 'Dex Professor', emoji: '📘',
        description: 'Register 100 Kanto species as caught.',
        reward: { coins: 250, heldItems: ['leftovers'], balls: ['ultraball'] },
        check: p => kantoCaught(p) >= 100,
    },
    {
        id: 'dex-caught-151', name: 'Kanto Master', emoji: '🏅',
        description: 'Complete the Kanto Pokédex — all 151 caught.',
        reward: { coins: 500, heldItems: ['leftovers'], balls: ['ultraball', 'ultraball', 'ultraball'] },
        check: p => kantoCaught(p) >= KANTO_DEX_SIZE,
    },
];

export const getAchievement = (id: string): Achievement | undefined =>
    ACHIEVEMENTS.find(a => a.id === id);

/** Ids newly satisfied but not yet recorded on the profile. */
export const evaluateAchievements = (profile: PlayerProfile): string[] =>
    ACHIEVEMENTS.filter(a => !profile.achievements.includes(a.id) && a.check(profile)).map(a => a.id);

/** Record earned ids and merge their rewards into the profile. */
export const applyAchievements = (profile: PlayerProfile, earned: string[]): PlayerProfile => {
    let next: PlayerProfile = { ...profile, achievements: [...profile.achievements, ...earned] };
    for (const id of earned) {
        const reward = getAchievement(id)?.reward;
        if (!reward) continue;
        next = {
            ...next,
            items: reward.items ? addItems(next.items, reward.items) : next.items,
            balls: reward.balls ? addBalls(next.balls, reward.balls) : next.balls,
            heldItems: reward.heldItems ? addHeldItems(next.heldItems, reward.heldItems) : next.heldItems,
            coins: next.coins + (reward.coins ?? 0),
        };
    }
    return next;
};
