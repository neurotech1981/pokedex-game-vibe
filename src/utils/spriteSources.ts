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

/**
 * Gen 1–2 assets bundled in public/assets (fetched by scripts/fetch-assets.sh):
 * static + animated sprites (front/back, regular/shiny), official artwork and
 * cries. Everything the Journey/League/Safari/Tower roster needs is served
 * from our own origin — raw.githubusercontent.com rate-limits per IP, so the
 * CDN is only a fallback for ids we don't bundle.
 */
const LOCAL_MAX_ID = 386;

/** Bundled static sprite — same-origin, can't fail on CDN hiccups. */
export const localStaticSprite = (id: number, view: 'front' | 'back'): string | null =>
    id <= LOCAL_MAX_ID
        ? `${import.meta.env.BASE_URL}assets/sprites/${view === 'back' ? 'back/' : ''}${id}.png`
        : null;

/** Bundled showdown-style animated GIF (regular and shiny variants). */
export const localAnimSprite = (id: number, view: 'front' | 'back', shiny = false): string | null =>
    id <= LOCAL_MAX_ID
        ? `${import.meta.env.BASE_URL}assets/sprites/anim/${view === 'back' ? 'back/' : ''}${shiny ? 'shiny/' : ''}${id}.gif`
        : null;

/** Bundled official artwork (regular only — shiny artwork stays on the CDN). */
export const localArtwork = (id: number): string | null =>
    id <= LOCAL_MAX_ID ? `${import.meta.env.BASE_URL}assets/artwork/${id}.png` : null;

/** Bundled cry audio. */
export const localCry = (id: number): string | null =>
    id <= LOCAL_MAX_ID ? `${import.meta.env.BASE_URL}assets/cries/${id}.ogg` : null;

/**
 * Preferred Pokédex list/detail image: the bundled sprite when we have it
 * (the same file PokeAPI's front_default points at, but served from our own
 * origin — browsing the list must not burn GitHub rate limit), else the
 * API-provided image.
 */
export const dexSprite = (id: number, apiImage: string): string =>
    localStaticSprite(id, 'front') ?? apiImage;

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
    // Bundled ids serve everything same-origin (shiny anim included);
    // only shiny artwork/statics remain CDN-only.
    return {
        animFront: localAnimSprite(id, 'front', shiny) ?? `${CDN}/other/showdown${s}/${id}.gif`,
        animBack: localAnimSprite(id, 'back', shiny) ?? `${CDN}/other/showdown/back${s}/${id}.gif`,
        gen5Front: id <= GEN5_MAX_ID ? `${gen5}${s}/${id}.gif` : null,
        gen5Back: id <= GEN5_MAX_ID ? `${gen5}/back${s}/${id}.gif` : null,
        staticFront: shiny ? `${CDN}/shiny/${id}.png` : localStaticSprite(id, 'front') ?? `${CDN}/${id}.png`,
        staticBack: shiny ? `${CDN}/back/shiny/${id}.png` : localStaticSprite(id, 'back') ?? `${CDN}/back/${id}.png`,
        artwork: shiny
            ? `${CDN}/other/official-artwork/shiny/${id}.png`
            : localArtwork(id) ?? `${CDN}/other/official-artwork/${id}.png`,
    };
};

/**
 * Ordered candidate URLs for a battle sprite: animated first, then static,
 * then the caller-provided default (PokeAPI front_default).
 *
 * Gen 1–2 ladders are entirely same-origin (bundled animated GIF → bundled
 * static; shiny animated is bundled too, its static rung falls back to the
 * regular bundled sprite) — zero CDN requests. Higher ids walk the CDN
 * ladder: showdown GIF → gen-5 GIF → CDN static.
 */
export const spriteFallbacks = (
    id: number,
    view: 'front' | 'back',
    defaultImage: string,
    shiny = false
): string[] => {
    const localAnim = localAnimSprite(id, view, shiny);
    const local = localStaticSprite(id, view);
    if (localAnim && local) {
        return [localAnim, local, defaultImage].filter(u => u !== '');
    }
    const sprites = getBattleSprites(id, shiny);
    const chain = view === 'front'
        ? [sprites.animFront, sprites.gen5Front, sprites.staticFront]
        : [sprites.animBack, sprites.gen5Back, sprites.staticBack];
    return [...chain.filter((u): u is string => u !== null), defaultImage]
        .filter((u): u is string => u !== null && u !== '');
};
