import React from 'react';
import { Box, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';

const floatAnimation = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-50px);
    opacity: 0;
  }
`;

const FloatingTextContainer = styled(Box)({
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 1000,
  animation: `${floatAnimation} 1.5s ease-out forwards`,
});

interface FloatingCombatTextProps {
  text: string;
  color: string;
  x: number;
  y: number;
  type: 'damage' | 'status' | 'effectiveness';
}

const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({
  text,
  color,
  x,
  y,
  type
}) => {
  // Choose font size based on text type
  const fontSize = type === 'damage' ? '24px' : '18px';
  const fontWeight = type === 'damage' ? 'bold' : 'medium';

  return (
    <FloatingTextContainer
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Box
        sx={{
          color,
          fontSize,
          fontWeight,
          textShadow: `0 0 8px rgba(0, 0, 0, 0.8)`,
        }}
      >
        {text}
      </Box>
    </FloatingTextContainer>
  );
};

export default FloatingCombatText;
