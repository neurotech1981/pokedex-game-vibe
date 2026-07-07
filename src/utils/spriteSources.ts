/**
 * Battle sprite URLs derived from a Pokémon's national dex id.
 *
 * All URLs point at the PokeAPI sprites CDN (the same GitHub-hosted files
 * PokeAPI itself returns), so no extra API calls are needed. Not every
 * generation covers every Pokémon — consumers should walk the fallback
 * ladder returned by `spriteFallbacks`.
 */

// Pinned to a commit SHA (not `master`) so URLs are immutable — caches can
// hold them forever and files can't move underneath us.
const SPRITES_SHA = 'b70e1604eb94d37d9040d661dff952caecf93d78';
const CDN = `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_SHA}/sprites/pokemon`;

/** Gen 5 animated sprites only exist up to Unova (id 649). */
const GEN5_MAX_ID = 649;

/** Gen 1–2 static sprites bundled in public/assets/sprites (front + back). */
const LOCAL_MAX_ID = 251;

/**
 * Bundled static sprite — served from our own origin, so it can't fail on
 * CDN hiccups. Only gen 1–2 (the Journey/League roster) is bundled.
 */
export const localStaticSprite = (id: number, view: 'front' | 'back'): string | null =>
    id <= LOCAL_MAX_ID
        ? `${import.meta.env.BASE_URL}assets/sprites/${view === 'back' ? 'back/' : ''}${id}.png`
        : null;

export interface BattleSprites {
    /** Animated Showdown-style GIF, front view. */
    animFront: string;
    /** Animated Showdown-style GIF, back view. */
    animBack: string;
    /** Gen-5 Black/White animated GIF (ids <= 649), front. */
    gen5Front: string | null;
    /** Gen-5 Black/White animated GIF (ids <= 649), back. */
    gen5Back: string | null;
    /** Static PNG, front view. */
    staticFront: string;
    /** Static PNG, back view. */
    staticBack: string;
    /** Hi-res official artwork PNG. */
    artwork: string;
}

export const getBattleSprites = (id: number, shiny = false): BattleSprites => {
    const s = shiny ? '/shiny' : '';
    const gen5 = `${CDN}/versions/generation-v/black-white/animated`;
    return {
        animFront: `${CDN}/other/showdown${s}/${id}.gif`,
        animBack: `${CDN}/other/showdown/back${s}/${id}.gif`,
        gen5Front: id <= GEN5_MAX_ID ? `${gen5}${s}/${id}.gif` : null,
        gen5Back: id <= GEN5_MAX_ID ? `${gen5}/back${s}/${id}.gif` : null,
        staticFront: shiny ? `${CDN}/shiny/${id}.png` : `${CDN}/${id}.png`,
        staticBack: shiny ? `${CDN}/back/shiny/${id}.png` : `${CDN}/back/${id}.png`,
        artwork: shiny
            ? `${CDN}/other/official-artwork/shiny/${id}.png`
            : `${CDN}/other/official-artwork/${id}.png`,
    };
};

/**
 * Ordered candidate URLs for a battle sprite: animated first, then static,
 * then the bundled local sprite (gen 1–2 — same-origin, cannot fail on CDN
 * hiccups; shiny mons fall back to the regular local sprite), and finally
 * the caller-provided default (PokeAPI front_default).
 */
export const spriteFallbacks = (
    id: number,
    view: 'front' | 'back',
    defaultImage: string,
    shiny = false
): string[] => {
    const sprites = getBattleSprites(id, shiny);
    const chain = view === 'front'
        ? [sprites.animFront, sprites.gen5Front, sprites.staticFront]
        : [sprites.animBack, sprites.gen5Back, sprites.staticBack];
    return [...chain.filter((u): u is string => u !== null), localStaticSprite(id, view), defaultImage]
        .filter((u): u is string => u !== null && u !== '');
};
