import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, applyAchievements, evaluateAchievements, getAchievement } from '../achievements';
import { createProfile } from '../progression';
import { GYM_STAGES } from '../../data/league';

describe('achievements', () => {
    it('fresh profile has nothing earned', () => {
        expect(evaluateAchievements(createProfile())).toEqual([]);
    });

    it('predicates fire on the right profile facts', () => {
        const p = createProfile();
        p.records = { ...p.records, wins: 25, bestStreak: 5, caught: 1, gauntletBestStage: 10 };
        p.league = { defeated: GYM_STAGES.map(s => s.id), champion: true, champion2: false, defeatedRematches: [] };
        p.mons = { 25: { xp: 0, level: 100, shiny: true, elite: true, customMoves: [{ name: 'Thunder', type: 'electric', power: 110, accuracy: 70, energyCost: 33 }] } };
        p.box = Array.from({ length: 10 }, () => ({ pokemon: { id: 1 } as never, level: 50 }));
        const earned = evaluateAchievements(p);
        for (const id of ['first-win', 'win-25', 'streak-5', 'first-catch', 'badges-8', 'champion', 'gauntlet-10', 'box-10', 'move-master', 'elite-friend', 'shiny-friend', 'level-100']) {
            expect(earned, id).toContain(id);
        }
        expect(earned).not.toContain('win-100');
        expect(earned).not.toContain('catch-10');
    });

    it('already-earned ids are not re-evaluated', () => {
        const p = createProfile();
        p.records = { ...p.records, wins: 1 };
        p.achievements = ['first-win'];
        expect(evaluateAchievements(p)).toEqual([]);
    });

    it('applyAchievements records ids and grants rewards', () => {
        const p = createProfile();
        p.records = { ...p.records, wins: 1, caught: 1 };
        const earned = evaluateAchievements(p);
        expect(earned).toEqual(expect.arrayContaining(['first-win', 'first-catch']));
        const next = applyAchievements(p, earned);
        expect(next.achievements).toEqual(expect.arrayContaining(['first-win', 'first-catch']));
        expect(next.items.potion).toBe((p.items.potion ?? 0) + 1); // first-win reward
        expect(next.balls.greatball).toBe(1); // first-catch reward
        // idempotent going forward
        expect(evaluateAchievements(next)).toEqual([]);
    });

    it('every achievement has unique id and resolvable lookup', () => {
        expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
        ACHIEVEMENTS.forEach(a => expect(getAchievement(a.id)).toBe(a));
    });
});
