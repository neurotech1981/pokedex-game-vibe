import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface SpritesheetAnimationProps {
  src: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  frameDuration: number;
  isActive: boolean;
  loop?: boolean;
  scale?: number;
  onAnimationComplete?: () => void;
}

const SpritesheetAnimation: React.FC<SpritesheetAnimationProps> = ({
  src,
  frameCount,
  frameWidth,
  frameHeight,
  frameDuration,
  isActive,
  loop = false,
  scale = 1,
  onAnimationComplete
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Start or stop animation based on isActive prop
  useEffect(() => {
    if (isActive && !isPlaying) {
      setIsPlaying(true);
      setCurrentFrame(0);
    } else if (!isActive && isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isActive, isPlaying]);

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

  // Calculate background position based on current frame
  const backgroundPosition = `${-(currentFrame * frameWidth)}px 0px`;

  if (!isActive && !isPlaying) {
    return null;
  }

  return (
    <Box
      sx={{
        width: frameWidth * scale,
        height: frameHeight * scale,
        backgroundImage: `url(${src})`,
        backgroundPosition,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frameWidth * frameCount * scale}px ${frameHeight * scale}px`,
        transformOrigin: 'center',
      }}
    />
  );
};

export default SpritesheetAnimation;