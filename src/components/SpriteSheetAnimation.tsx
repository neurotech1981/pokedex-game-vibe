import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { getMoveAnimation, getAnimationDuration } from '../utils/moveAnimationHelper';

interface SpriteSheetAnimationProps {
  moveType: string;
  isActive: boolean;
  position: 'attacker' | 'defender';
  loop?: boolean;
  scale?: number;
  onAnimationComplete?: () => void;
}

const SpriteSheetAnimation: React.FC<SpriteSheetAnimationProps> = ({
  moveType,
  isActive,
  position,
  loop = false,
  scale = 1.5,
  onAnimationComplete
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Get animation data from the helper
  const animation = getMoveAnimation(moveType);
  const { src, frameCount, frameWidth, frameHeight, frameDuration } = animation.spritesheet || {
    src: '',
    frameCount: 1,
    frameWidth: 64,
    frameHeight: 64,
    frameDuration: 100
  };

  // Start or stop animation based on isActive prop
  useEffect(() => {
    if (isActive && !isPlaying && src) {
      setIsPlaying(true);
      setCurrentFrame(0);
    } else if (!isActive && isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isActive, isPlaying, src]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current || timestamp - lastFrameTimeRef.current >= frameDuration) {
        lastFrameTimeRef.current = timestamp;

        setCurrentFrame(prevFrame => {
          const nextFrame = prevFrame + 1;

          // Check if animation is complete
          if (nextFrame >= frameCount) {
            if (!loop) {
              // If not looping, stop animation
              setIsPlaying(false);
              if (onAnimationComplete) {
                onAnimationComplete();
              }
              return prevFrame;
            }
            // If looping, reset to first frame
            return 0;
          }

          return nextFrame;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, frameCount, frameDuration, loop, onAnimationComplete]);

  // Set position based on attacker/defender
  const positionStyles = position === 'attacker'
    ? {
        right: '10%',
        transform: 'scaleX(-1)' // Flip horizontally for attacker
      }
    : {
        left: '10%'
      };

  // Calculate background position based on current frame
  const backgroundPosition = `${-(currentFrame * frameWidth)}px 0px`;

  if (!isActive && !isPlaying || !src) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        marginTop: `-${frameHeight * scale / 2}px`,
        width: frameWidth * scale,
        height: frameHeight * scale,
        backgroundImage: `url(${src})`,
        backgroundPosition,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frameWidth * frameCount * scale}px ${frameHeight * scale}px`,
        transformOrigin: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        ...positionStyles
      }}
    />
  );
};

export default SpriteSheetAnimation;