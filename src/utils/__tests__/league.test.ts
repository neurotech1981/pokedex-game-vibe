import { describe, it, expect } from 'vitest';
import {
    GYM_STAGES,
    HOENN_GYM_STAGES,
    HOENN_STAGES,
    HOENN_STAGE_IDS,
    JOHTO_GYM_STAGES,
    JOHTO_STAGES,
    JOHTO_STAGE_IDS,
    LEAGUE_STAGES,
    getLeagueStage,
    isStageUnlocked,
    leagueStageLevel,
    nextLeagueStage,
} from '../../data/league';

const ALL_BACKDROPS = new Set([
    'meadow', 'forest', 'beach', 'desert', 'orasdesert', 'city', 'darkmeadow',
    'icecave', 'dampcave', 'earthycave', 'deepsea', 'skypillar', 'elite4drake',
]);

describe('league data integrity', () => {
    it('has 8 gyms per region, Blue -> Red -> Steven, unique ids', () => {
        expect(GYM_STAGES).toHaveLength(8);
        expect(JOHTO_GYM_STAGES).toHaveLength(8);
        expect(HOENN_GYM_STAGES).toHaveLength(8);
        expect(LEAGUE_STAGES.filter(s => s.kind === 'elite4')).toHaveLength(8); // Kanto + Hoenn E4
        expect(LEAGUE_STAGES.filter(s => s.kind === 'champion').map(s => s.id)).toEqual(['champion', 'red', 'steven']);
        expect(new Set(LEAGUE_STAGES.map(s => s.id)).size).toBe(LEAGUE_STAGES.length);
        expect(LEAGUE_STAGES[LEAGUE_STAGES.length - 1].id).toBe('steven');
        // region sets are disjoint and GYM_STAGES is purely Kanto
        expect(GYM_STAGES.every(s => !JOHTO_STAGE_IDS.has(s.id) && !HOENN_STAGE_IDS.has(s.id))).toBe(true);
    });

    it('teams use gen-1/2/3 species ids and valid backdrops; floors climb per region', () => {
        // Floors climb strictly within Kanto+Johto; Hoenn is pinned at the
        // level-100 ceiling (Red already sits on it) so it's flat by design.
        let lastFloor = 0;
        for (const stage of LEAGUE_STAGES) {
            expect(stage.team.length).toBeGreaterThan(0);
            stage.team.forEach(e => {
                expect(e.speciesId).toBeGreaterThanOrEqual(1);
                expect(e.speciesId).toBeLessThanOrEqual(386);
            });
            expect(ALL_BACKDROPS.has(stage.backdropId)).toBe(true);
            if (HOENN_STAGE_IDS.has(stage.id)) {
                expect(stage.levelFloor).toBe(100);
            } else {
                expect(stage.levelFloor).toBeGreaterThan(lastFloor);
                lastFloor = stage.levelFloor;
            }
        }
    });

    it('all gyms carry badges; E4/champions do not', () => {
        expect([...GYM_STAGES, ...JOHTO_GYM_STAGES, ...HOENN_GYM_STAGES].every(s => s.badge)).toBe(true);
        expect(LEAGUE_STAGES.filter(s => s.kind !== 'gym').every(s => !s.badge)).toBe(true);
    });

    it('Johto is gated behind the Kanto champion and linear after', () => {
        const kantoDone = LEAGUE_STAGES.filter(s => !JOHTO_STAGES.includes(s) && !HOENN_STAGES.includes(s)).map(s => s.id);
        // locked with 7 badges + E4 but no champion win
        expect(isStageUnlocked('falkner', kantoDone.filter(id => id !== 'champion'))).toBe(false);
        expect(isStageUnlocked('falkner', kantoDone)).toBe(true);
        expect(isStageUnlocked('bugsy', kantoDone)).toBe(false);
        expect(isStageUnlocked('bugsy', [...kantoDone, 'falkner'])).toBe(true);
        // Red needs everything before him
        const throughClair = LEAGUE_STAGES.map(s => s.id).filter(id => id !== 'red' && !HOENN_STAGE_IDS.has(id));
        expect(isStageUnlocked('red', kantoDone)).toBe(false);
        expect(isStageUnlocked('red', throughClair)).toBe(true);
        expect(nextLeagueStage(kantoDone)?.id).toBe('falkner');
        expect(nextLeagueStage(LEAGUE_STAGES.map(s => s.id))).toBeNull();
    });

    it('Hoenn is gated behind Red and ends with Steven', () => {
        const throughRed = LEAGUE_STAGES.map(s => s.id).filter(id => !HOENN_STAGE_IDS.has(id));
        expect(isStageUnlocked('roxanne', throughRed.filter(id => id !== 'red'))).toBe(false);
        expect(isStageUnlocked('roxanne', throughRed)).toBe(true);
        expect(nextLeagueStage(throughRed)?.id).toBe('roxanne');
        const allButSteven = LEAGUE_STAGES.map(s => s.id).filter(id => id !== 'steven');
        expect(isStageUnlocked('steven', throughRed)).toBe(false);
        expect(isStageUnlocked('steven', allButSteven)).toBe(true);
    });
});

describe('league progression', () => {
    it('unlocks strictly in order', () => {
        expect(isStageUnlocked('brock', [])).toBe(true);
        expect(isStageUnlocked('misty', [])).toBe(false);
        expect(isStageUnlocked('misty', ['brock'])).toBe(true);
        // E4 needs all 8 gyms
        const eightBadges = GYM_STAGES.map(s => s.id);
        expect(isStageUnlocked('lorelei', eightBadges.slice(0, 7))).toBe(false);
        expect(isStageUnlocked('lorelei', eightBadges)).toBe(true);
        // Champion needs the full E4 too
        expect(isStageUnlocked('champion', eightBadges)).toBe(false);
        expect(isStageUnlocked('champion', [...eightBadges, 'lorelei', 'bruno', 'agatha', 'lance'])).toBe(true);
    });

    it('nextLeagueStage walks the ladder and ends at null', () => {
        expect(nextLeagueStage([])?.id).toBe('brock');
        expect(nextLeagueStage(['brock'])?.id).toBe('misty');
        expect(nextLeagueStage(LEAGUE_STAGES.map(s => s.id))).toBeNull();
    });

    it('stage level respects the floor and scales with the player', () => {
        const brock = getLeagueStage('brock')!;
        expect(leagueStageLevel(brock, 50)).toBe(52); // floor wins
        expect(leagueStageLevel(brock, 80)).toBe(81); // player avg + gym offset
        const champion = getLeagueStage('champion')!;
        expect(leagueStageLevel(champion, 50)).toBe(80); // floor
        expect(leagueStageLevel(champion, 99)).toBe(100); // capped
    });
});
