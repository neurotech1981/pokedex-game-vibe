import { describe, it, expect } from 'vitest';
import {
    JOURNEY_NODES,
    getJourneyNode,
    isNodeComplete,
    journeyBattleLevel,
    nextGymIdAt,
    nextJourneyNode,
    nextTrainerAt,
} from '../../data/journey';
import { LEAGUE_STAGES } from '../../data/league';
import { BIOMES } from '../safari';
import { createProfile } from '../progression';

describe('journey graph integrity', () => {
    it('has unique node and trainer ids', () => {
        expect(new Set(JOURNEY_NODES.map(n => n.id)).size).toBe(JOURNEY_NODES.length);
        const trainerIds = JOURNEY_NODES.flatMap(n => n.trainers.map(t => t.id));
        expect(new Set(trainerIds).size).toBe(trainerIds.length);
    });

    it('every gymId exists in the league ladder, in ladder order', () => {
        const ladder = LEAGUE_STAGES.map(s => s.id);
        const journeyGyms = JOURNEY_NODES.flatMap(n => n.gymIds);
        journeyGyms.forEach(id => expect(ladder).toContain(id));
        // journey order must match ladder order so league gating never conflicts
        const positions = journeyGyms.map(id => ladder.indexOf(id));
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });

    it('every biomeId exists; floors ramp 5 → 50; ends at Indigo Plateau', () => {
        const biomeIds = new Set(BIOMES.map(b => b.id));
        let last = 0;
        for (const node of JOURNEY_NODES) {
            if (node.biomeId) expect(biomeIds.has(node.biomeId), node.id).toBe(true);
            expect(node.levelFloor).toBeGreaterThanOrEqual(last);
            last = node.levelFloor;
            node.trainers.forEach(t => {
                expect(t.speciesIds.length).toBeGreaterThan(0);
                t.speciesIds.forEach(id => expect(id).toBeLessThanOrEqual(151));
            });
        }
        expect(JOURNEY_NODES[0].id).toBe('pallet-town');
        expect(JOURNEY_NODES[JOURNEY_NODES.length - 1].id).toBe('indigo-plateau');
        expect(JOURNEY_NODES[JOURNEY_NODES.length - 1].levelFloor).toBe(50);
    });
});

describe('journey progression helpers', () => {
    const profile = createProfile();

    it('node completion needs all trainers and gyms', () => {
        const pewter = getJourneyNode('pewter-city')!;
        expect(isNodeComplete(pewter, profile.journey, profile.league)).toBe(false);
        const journeyDone = { ...profile.journey, clearedTrainers: pewter.trainers.map(t => t.id) };
        expect(isNodeComplete(pewter, journeyDone, profile.league)).toBe(false); // gym still standing
        expect(isNodeComplete(pewter, journeyDone, { ...profile.league, defeated: ['brock'] })).toBe(true);
        // trainer-less start node is trivially complete
        expect(isNodeComplete(getJourneyNode('pallet-town')!, profile.journey, profile.league)).toBe(true);
    });

    it('nextTrainerAt / nextGymIdAt walk in order', () => {
        const forest = getJourneyNode('viridian-forest')!;
        expect(nextTrainerAt(forest, profile.journey)?.id).toBe('vf-rick');
        const cleared = { ...profile.journey, clearedTrainers: ['vf-rick'] };
        expect(nextTrainerAt(forest, cleared)?.id).toBe('vf-doug');
        const indigo = getJourneyNode('indigo-plateau')!;
        expect(nextGymIdAt(indigo, profile.league)).toBe('lorelei');
        expect(nextGymIdAt(indigo, { ...profile.league, defeated: ['lorelei', 'bruno'] })).toBe('agatha');
    });

    it('battle level respects the floor and trails the player', () => {
        const route1 = getJourneyNode('route-1')!;
        expect(journeyBattleLevel(route1, 5)).toBe(5);
        expect(journeyBattleLevel(route1, 40)).toBe(38); // player avg − 2
        expect(nextJourneyNode('victory-road')?.id).toBe('indigo-plateau');
        expect(nextJourneyNode('indigo-plateau')).toBeNull();
    });

    it('fresh profile starts unstarted at Pallet Town', () => {
        expect(profile.journey).toEqual({ started: false, position: 'pallet-town', clearedTrainers: [] });
    });
});
