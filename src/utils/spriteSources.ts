/**
 * Battle sprite URLs derived from a Pokémon's national dex id.
 *
 * All URLs point at the PokeAPI sprites CDN (the same GitHub-hosted files
 * PokeAPI itself returns), so no extra API calls are needed. Not every
 * generation covers every Pokémon — consumers should walk the fallback
 * ladder returned by `spriteFallbacks`.
 */

const CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Gen 5 animated sprites only exist up to Unova (id 649). */
const GEN5_MAX_ID = 649;

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
 * Ordered candidate URLs for a battle sprite: animated first, then static.
 * The final entry is the caller-provided default (PokeAPI front_default).
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
    return [...chain.filter((u): u is string => u !== null), defaultImage];
};
