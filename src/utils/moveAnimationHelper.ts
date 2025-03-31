/**
 * Utility for managing move animations with GIFs and spritesheets
 */

// Map of move types to their animation assets
export const moveAnimations = {
  fire: {
    gif: '/assets/particles/GIFs/Flamethrower.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Flamethrower-Sheet.png',
      frameCount: 14,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 50
    }
  },
  water: {
    gif: '/assets/particles/GIFs/Water Vortex Splash.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Water Vortex Splash-Sheet.png',
      frameCount: 29,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 50
    }
  },
  electric: {
    gif: '/assets/particles/GIFs/Sparks.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Eletric A-Sheet.png',
      frameCount: 14,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 50
    }
  },
  grass: {
    gif: '/assets/particles/GIFs/Leaves.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Leaves-Sheet.png',
      frameCount: 10,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 100
    }
  },
  poison: {
    gif: '/assets/particles/GIFs/Poison Cloud.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Poison Cloud-Sheet.png',
      frameCount: 134,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 30
    }
  },
  normal: {
    gif: '/assets/particles/GIFs/Smoke.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Smoke-Sheet.png',
      frameCount: 27,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 50
    }
  },
  psychic: {
    gif: '/assets/particles/GIFs/Gravity.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Gravity-Sheet.png',
      frameCount: 69,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 30
    }
  },
  ice: {
    gif: '/assets/particles/GIFs/Fire+Sparks.gif', // Use a cool blue effect for ice
    spritesheet: {
      src: '/assets/particles/Spritesheets/Fire+Sparks-Sheet.png',
      frameCount: 89,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 40
    }
  },
  // Fallback for any type not specifically mapped
  default: {
    gif: '/assets/particles/GIFs/Spark1.gif',
    spritesheet: {
      src: '/assets/particles/Spritesheets/Spark1-Sheet.png',
      frameCount: 13,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 50
    }
  }
};

/**
 * Get animation assets for a specific move type
 * @param moveType The type of move (fire, water, etc.)
 * @returns Animation assets for the move type
 */
export const getMoveAnimation = (moveType: string) => {
  const normalizedType = moveType.toLowerCase();
  return moveAnimations[normalizedType as keyof typeof moveAnimations] || moveAnimations.default;
};

/**
 * Calculate the total animation duration for a move type
 * @param moveType The type of move
 * @returns Total duration in milliseconds
 */
export const getAnimationDuration = (moveType: string) => {
  const animation = getMoveAnimation(moveType);
  if (animation.spritesheet) {
    return animation.spritesheet.frameCount * animation.spritesheet.frameDuration;
  }
  return 1000; // Default duration
};