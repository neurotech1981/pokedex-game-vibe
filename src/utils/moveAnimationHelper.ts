/**
 * Move type → impact animation mapping (grid spritesheets rendered by
 * BattleScene3D's ImpactEffect). Frame metadata matches the actual assets
 * in public/assets/particles/Spritesheets.
 */

const base = import.meta.env.BASE_URL;

export interface SpriteSheetMeta {
    src: string;
    frameCount: number;
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    frameDuration: number;
}

export interface MoveAnimation {
    spritesheet: SpriteSheetMeta;
    tint?: string;
}

const sheet = (
    file: string,
    frameCount: number,
    columns: number,
    rows: number,
    frameWidth: number,
    frameHeight: number,
    frameDuration: number
): SpriteSheetMeta => ({
    src: `${base}assets/particles/Spritesheets/${file}`,
    frameCount,
    columns,
    rows,
    frameWidth,
    frameHeight,
    frameDuration,
});

const SHEETS = {
    flamethrower: sheet('Flamethrower-Sheet.png', 10, 3, 4, 96, 48, 60),
    waterVortex: sheet('Water Vortex Splash-Sheet.png', 30, 5, 6, 150, 150, 40),
    electric: sheet('Eletric A-Sheet.png', 9, 3, 3, 96, 96, 60),
    leaves: sheet('Leaves-Sheet.png', 19, 4, 5, 150, 150, 55),
    poisonCloud: sheet('Poison Cloud-Sheet.png', 19, 4, 5, 144, 144, 55),
    smoke: sheet('Smoke-Sheet.png', 19, 4, 5, 80, 80, 50),
    gravity: sheet('Gravity-Sheet.png', 20, 4, 5, 96, 80, 50),
    smoke2: sheet('Smoke2-Sheet.png', 40, 5, 8, 150, 150, 30),
    spark1: sheet('Spark1-Sheet.png', 30, 5, 6, 150, 150, 40),
    sparks: sheet('Sparks-Sheet.png', 9, 3, 3, 96, 96, 55),
    splatter: sheet('Splatter-Sheet.png', 30, 5, 6, 150, 150, 40),
    rocketFire: sheet('Rocket Fire 2-Sheet.png', 25, 5, 5, 150, 150, 45),
    fireSparks: sheet('Fire+Sparks-Sheet.png', 20, 4, 5, 96, 96, 50),
};

export const moveAnimations: Record<string, MoveAnimation> = {
    fire: { spritesheet: SHEETS.flamethrower },
    water: { spritesheet: SHEETS.waterVortex },
    electric: { spritesheet: SHEETS.electric },
    grass: { spritesheet: SHEETS.leaves },
    poison: { spritesheet: SHEETS.poisonCloud },
    normal: { spritesheet: SHEETS.smoke },
    psychic: { spritesheet: SHEETS.gravity },
    ice: { spritesheet: SHEETS.smoke2, tint: '#9fdcff' },
    fighting: { spritesheet: SHEETS.splatter, tint: '#ffab91' },
    rock: { spritesheet: SHEETS.splatter, tint: '#bcaaa4' },
    ground: { spritesheet: SHEETS.splatter, tint: '#d7a86e' },
    steel: { spritesheet: SHEETS.sparks, tint: '#cfd8dc' },
    flying: { spritesheet: SHEETS.sparks, tint: '#b3e5fc' },
    dragon: { spritesheet: SHEETS.rocketFire, tint: '#b388ff' },
    dark: { spritesheet: SHEETS.smoke2, tint: '#7e57c2' },
    ghost: { spritesheet: SHEETS.gravity, tint: '#b39ddb' },
    fairy: { spritesheet: SHEETS.spark1, tint: '#f48fb1' },
    bug: { spritesheet: SHEETS.leaves, tint: '#9ccc65' },
    default: { spritesheet: SHEETS.spark1 },
};

/** Extra burst layered on top of the impact for critical hits. */
export const criticalOverlay: MoveAnimation = { spritesheet: SHEETS.fireSparks, tint: '#ffd740' };

/**
 * Get animation assets for a specific move type
 */
export const getMoveAnimation = (moveType: string): MoveAnimation => {
    const normalizedType = moveType.toLowerCase();
    return moveAnimations[normalizedType] || moveAnimations.default;
};
