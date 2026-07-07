import { describe, expect, it } from 'vitest';
import { getBattleSprites, localStaticSprite, spriteFallbacks } from '../spriteSources';

describe('sprite sources', () => {
    it('pins CDN URLs to a commit SHA, never master', () => {
        const sprites = getBattleSprites(25);
        Object.values(sprites).forEach(url => {
            if (typeof url === 'string') {
                expect(url).not.toContain('/master/');
                expect(url).toMatch(/PokeAPI\/sprites\/[0-9a-f]{40}\//);
            }
        });
    });

    it('bundles local static sprites for gen 1–2 only', () => {
        expect(localStaticSprite(1, 'front')).toContain('assets/sprites/1.png');
        expect(localStaticSprite(251, 'back')).toContain('assets/sprites/back/251.png');
        expect(localStaticSprite(252, 'front')).toBeNull();
    });

    it('fallback ladder ends with local sprite then default image', () => {
        const back = spriteFallbacks(25, 'back', 'https://example.com/default.png');
        expect(back[0]).toContain('showdown/back/25.gif');
        expect(back[back.length - 2]).toContain('assets/sprites/back/25.png');
        expect(back[back.length - 1]).toBe('https://example.com/default.png');

        // gen 3+: no local rung, no gen5 rung above 649
        const high = spriteFallbacks(700, 'front', 'default.png');
        expect(high.some(u => u.includes('assets/sprites/'))).toBe(false);
        expect(high.some(u => u.includes('generation-v'))).toBe(false);
        expect(high[high.length - 1]).toBe('default.png');
    });

    it('drops empty default images instead of producing a bad URL', () => {
        const ladder = spriteFallbacks(25, 'front', '');
        expect(ladder.every(u => u.length > 0)).toBe(true);
    });

    it('shiny back ladder still ends at the regular local sprite', () => {
        const ladder = spriteFallbacks(25, 'back', 'default.png', true);
        expect(ladder[0]).toContain('showdown/back/shiny/25.gif');
        expect(ladder).toContain(localStaticSprite(25, 'back'));
    });
});
