import { describe, it, expect } from 'vitest';
import {
    GYM_STAGES,
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
    it('has 8 gyms, 4 elite four, 1 champion with unique ids', () => {
        expect(GYM_STAGES).toHaveLength(8);
        expect(LEAGUE_STAGES.filter(s => s.kind === 'elite4')).toHaveLength(4);
        expect(LEAGUE_STAGES.filter(s => s.kind === 'champion')).toHaveLength(1);
        expect(new Set(LEAGUE_STAGES.map(s => s.id)).size).toBe(LEAGUE_STAGES.length);
    });

    it('teams use Kanto species ids and valid backdrops; floors climb', () => {
        let lastFloor = 0;
        for (const stage of LEAGUE_STAGES) {
            expect(stage.team.length).toBeGreaterThan(0);
            stage.team.forEach(e => {
                expect(e.speciesId).toBeGreaterThanOrEqual(1);
                expect(e.speciesId).toBeLessThanOrEqual(151);
            });
            expect(ALL_BACKDROPS.has(stage.backdropId)).toBe(true);
            expect(stage.levelFloor).toBeGreaterThan(lastFloor);
            lastFloor = stage.levelFloor;
        }
    });

    it('all gyms carry badges; E4/champion do not', () => {
        expect(GYM_STAGES.every(s => s.badge)).toBe(true);
        expect(LEAGUE_STAGES.filter(s => s.kind !== 'gym').every(s => !s.badge)).toBe(true);
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
