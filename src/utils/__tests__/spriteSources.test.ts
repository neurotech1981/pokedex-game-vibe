import { describe, expect, it } from 'vitest';
import {
    dexSprite,
    getBattleSprites,
    localAnimSprite,
    localArtwork,
    localCry,
    localStaticSprite,
    spriteFallbacks,
} from '../spriteSources';

describe('sprite sources', () => {
    it('pins CDN URLs to a commit SHA, never master', () => {
        const sprites = getBattleSprites(700); // gen 3+: everything is CDN
        Object.values(sprites).forEach(url => {
            if (typeof url === 'string') {
                expect(url).not.toContain('/master/');
                expect(url).toMatch(/PokeAPI\/sprites\/[0-9a-f]{40}\//);
            }
        });
    });

    it('bundles local assets for gen 1–2 only', () => {
        expect(localStaticSprite(1, 'front')).toContain('assets/sprites/1.png');
        expect(localStaticSprite(251, 'back')).toContain('assets/sprites/back/251.png');
        expect(localAnimSprite(25, 'front')).toContain('assets/sprites/anim/25.gif');
        expect(localAnimSprite(25, 'back', true)).toContain('assets/sprites/anim/back/shiny/25.gif');
        expect(localArtwork(151)).toContain('assets/artwork/151.png');
        expect(localCry(6)).toContain('assets/cries/6.ogg');
        expect(localStaticSprite(252, 'front')).toBeNull();
        expect(localAnimSprite(252, 'front')).toBeNull();
        expect(localArtwork(252)).toBeNull();
        expect(localCry(252)).toBeNull();
    });

    it('gen 1–2 ladder is fully same-origin: anim → static → default', () => {
        const back = spriteFallbacks(25, 'back', 'https://example.com/default.png');
        expect(back[0]).toContain('assets/sprites/anim/back/25.gif');
        expect(back[1]).toContain('assets/sprites/back/25.png');
        expect(back[2]).toBe('https://example.com/default.png');
        expect(back.some(u => u.includes('raw.githubusercontent'))).toBe(false);
    });

    it('shiny gen 1–2 ladder uses bundled shiny anim, regular static fallback', () => {
        const ladder = spriteFallbacks(25, 'back', 'default.png', true);
        expect(ladder[0]).toContain('assets/sprites/anim/back/shiny/25.gif');
        expect(ladder).toContain(localStaticSprite(25, 'back'));
        expect(ladder.some(u => u.includes('raw.githubusercontent'))).toBe(false);
    });

    it('gen 3+ walks the CDN ladder: showdown → gen5 → static → default', () => {
        const ladder = spriteFallbacks(600, 'front', 'default.png');
        expect(ladder[0]).toContain('showdown/600.gif');
        expect(ladder[1]).toContain('generation-v');
        expect(ladder[2]).toContain('/600.png');
        expect(ladder[ladder.length - 1]).toBe('default.png');

        // no gen5 rung above 649
        const high = spriteFallbacks(700, 'front', 'default.png');
        expect(high.some(u => u.includes('generation-v'))).toBe(false);
        expect(high.some(u => u.includes('assets/sprites/'))).toBe(false);
    });

    it('drops empty default images instead of producing a bad URL', () => {
        expect(spriteFallbacks(25, 'front', '').every(u => u.length > 0)).toBe(true);
        expect(spriteFallbacks(700, 'front', '').every(u => u.length > 0)).toBe(true);
    });

    it('artwork is bundled for gen 1–2 regular, CDN for shiny and gen 3+', () => {
        expect(getBattleSprites(25).artwork).toContain('assets/artwork/25.png');
        expect(getBattleSprites(25, true).artwork).toContain('official-artwork/shiny/25.png');
        expect(getBattleSprites(700).artwork).toContain('official-artwork/700.png');
    });

    it('dexSprite prefers the bundled sprite, falls back to the API image', () => {
        expect(dexSprite(25, 'https://example.com/api.png')).toContain('assets/sprites/25.png');
        expect(dexSprite(700, 'https://example.com/api.png')).toBe('https://example.com/api.png');
    });
});
