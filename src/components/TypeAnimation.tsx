import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { getMoveAnimation } from '../utils/moveAnimationHelper';

interface TypeAnimationProps {
  type: string;
  isActive: boolean;
  position: 'attacker' | 'defender';
  onAnimationComplete?: () => void;
}

const TypeAnimation: React.FC<TypeAnimationProps> = ({
  type,
  isActive,
  position,
  onAnimationComplete
}) => {
  const [shouldRender, setShouldRender] = useState(isActive);
  const animationData = getMoveAnimation(type);

  // Debug info
  console.log(`TypeAnimation rendering: type=${type}, position=${position}, isActive=${isActive}`);
  console.log('Animation data:', animationData);

  // Handle animation completion
  useEffect(() => {
    if (isActive) {
      console.log(`Animation activated: ${type}`);
      setShouldRender(true);

      // Estimate total animation duration based on spritesheet data
      const duration = animationData.spritesheet
        ? animationData.spritesheet.frameCount * animationData.spritesheet.frameDuration
        : 1000; // Default to 1 second if no spritesheet info

      console.log(`Animation will run for ${duration}ms`);

      const timer = setTimeout(() => {
        setShouldRender(false);
        console.log(`Animation completed: ${type}`);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, animationData, onAnimationComplete, type]);

  if (!shouldRender) {
    return null;
  }

  // Calculate position based on attacker/defender
  const positionStyles = position === 'attacker'
    ? {
        right: '20%',
        transform: 'translateY(-50%) scaleX(-1)' // Flip horizontally for attacker
      }
    : {
        left: '20%',
        transform: 'translateY(-50%)'
      };

  // Make sure the image path is correct
  const imagePath = animationData.gif;
  console.log(`Using image: ${imagePath}`);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        width: '300px', // Increased size for visibility
        height: '300px',
        pointerEvents: 'none',
        zIndex: 1000, // Ensure it's above other elements
        ...positionStyles
      }}
      className={`type-animation type-${type} position-${position}`} // Add helpful classes for debugging
    >
      {/* Add a colored background to help see the animation container */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: '2px solid rgba(255,255,255,0.3)',
          position: 'relative',
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible'
        }}
      >
        {/* Use GIF for animation */}
        <img
          src={imagePath}
          alt={`${type} attack`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.8))',
            transform: 'scale(1.5)' // Make it larger
          }}
        />
      </Box>
    </Box>
  );
};

export default TypeAnimation;