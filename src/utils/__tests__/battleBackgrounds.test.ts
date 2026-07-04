import { describe, it, expect } from 'vitest';
import { backgroundUrl, pickBattleBackgroundId } from '../../data/battleBackgrounds';

describe('pickBattleBackgroundId', () => {
    it('bosses always fight in the Elite Four chamber', () => {
        expect(pickBattleBackgroundId({ isBoss: true, weather: 'hail', terrain: 'grassy', rng: () => 0 }))
            .toBe('elite4drake');
    });

    it('weather picks a fitting scene', () => {
        expect(pickBattleBackgroundId({ weather: 'sandstorm', rng: () => 0 })).toBe('desert');
        expect(pickBattleBackgroundId({ weather: 'sandstorm', rng: () => 0.9 })).toBe('orasdesert');
        expect(pickBattleBackgroundId({ weather: 'hail', rng: () => 0 })).toBe('icecave');
        expect(pickBattleBackgroundId({ weather: 'sunny', rng: () => 0 })).toBe('beach');
    });

    it('terrain picks a fitting scene when weather does not decide', () => {
        expect(pickBattleBackgroundId({ terrain: 'grassy', rng: () => 0 })).toBe('forest');
        expect(pickBattleBackgroundId({ terrain: 'psychic', rng: () => 0 })).toBe('skypillar');
        expect(pickBattleBackgroundId({ terrain: 'misty', rng: () => 0 })).toBe('dampcave');
        expect(pickBattleBackgroundId({ terrain: 'electric', rng: () => 0 })).toBe('city');
    });

    it('weather outranks terrain', () => {
        expect(pickBattleBackgroundId({ weather: 'hail', terrain: 'grassy', rng: () => 0 })).toBe('icecave');
    });

    it('otherwise draws from the default pool by rng', () => {
        expect(pickBattleBackgroundId({ rng: () => 0 })).toBe('meadow');
        expect(pickBattleBackgroundId({ rng: () => 0.99 })).toBe('deepsea');
        // rain has no dedicated scene: pool decides, weather mood handles the rest
        expect(pickBattleBackgroundId({ weather: 'rain', rng: () => 0 })).toBe('meadow');
    });

    it('backgroundUrl points at the bundled asset', () => {
        expect(backgroundUrl('meadow').endsWith('assets/backgrounds/bg-meadow.jpg')).toBe(true);
        expect(backgroundUrl('elite4drake').endsWith('assets/backgrounds/bg-elite4drake.jpg')).toBe(true);
    });
});
