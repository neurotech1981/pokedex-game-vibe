import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Card, CardType, CardRarity } from '../types/card';

interface CardComponentProps {
    card: Card;
    onClick: () => void;
    isOpponent?: boolean;
    isSelected?: boolean;
    disabled?: boolean;
}

const CardContainer = styled(Paper)<{ isOpponent?: boolean; isSelected?: boolean }>(
    ({ theme, isOpponent, isSelected }) => ({
        position: 'relative',
        width: '100%',
        height: '200px',
        background: 'linear-gradient(165deg, #2a2a3a 0%, #1a1a2e 100%)',
        borderRadius: '12px',
        border: '2px solid',
        borderColor: isSelected ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.2)',
        cursor: isOpponent ? 'default' : 'pointer',
        transform: isSelected ? 'translateY(-10px)' : 'none',
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden',
        '&:hover': {
            transform: isOpponent ? 'none' : 'translateY(-5px)',
            boxShadow: isOpponent ? 'none' : '0 8px 16px rgba(0, 0, 0, 0.3)',
        },
    })
);

const CardImage = styled('img')({
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
});

const CardContent = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
}));

const CardName = styled(Typography)<{ rarity: CardRarity }>(({ theme, rarity }) => ({
    color: rarity === 'legendary' ? '#ffd700' :
           rarity === 'epic' ? '#9400d3' :
           rarity === 'rare' ? '#4169e1' : '#ffffff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
}));

const CardDescription = styled(Typography)(({ theme }) => ({
    color: '#cccccc',
    fontSize: '0.8rem',
    lineHeight: 1.2,
}));

const CardCost = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30px',
    height: '30px',
    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    textShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
}));

const CardStats = styled(Box)(({ theme }) => ({
    position: 'absolute',
    bottom: 0,
    right: 0,
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5),
}));

const StatBox = styled(Box)<{ type: 'attack' | 'health' }>(({ theme, type }) => ({
    width: '24px',
    height: '24px',
    background: type === 'attack'
        ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
        : 'linear-gradient(135deg, #00c853 0%, #009624 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    textShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: type === 'attack'
        ? '0 0 10px rgba(255, 68, 68, 0.5)'
        : '0 0 10px rgba(0, 200, 83, 0.5)',
}));

const CardTypeBadge = styled(Box)<{ type: CardType }>(({ theme, type }) => ({
    position: 'absolute',
    top: 0,
    right: 0,
    padding: theme.spacing(0.5, 1),
    background: type === 'minion' ? 'rgba(74, 144, 226, 0.8)' :
                type === 'spell' ? 'rgba(255, 215, 0, 0.8)' :
                type === 'weapon' ? 'rgba(255, 69, 0, 0.8)' :
                'rgba(147, 112, 219, 0.8)',
    borderRadius: '0 12px 0 12px',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
}));

const CardComponent: React.FC<CardComponentProps> = ({
    card,
    onClick,
    isOpponent,
    isSelected,
    disabled,
}) => {
    return (
        <CardContainer
            isOpponent={isOpponent}
            isSelected={isSelected}
            onClick={disabled ? () => {} : onClick}
            sx={{ opacity: disabled ? 0.7 : 1, cursor: disabled ? 'default' : 'pointer' }}
        >
            <CardCost>{card.cost}</CardCost>
            <CardTypeBadge type={card.type}>{card.type}</CardTypeBadge>
            <CardImage src={card.image} alt={card.name} />
            <CardContent>
                <CardName rarity={card.rarity}>{card.name}</CardName>
                <CardDescription>{card.description}</CardDescription>
            </CardContent>
            {card.type === 'minion' && (
                <CardStats>
                    <StatBox type="attack">{card.attack}</StatBox>
                    <StatBox type="health">{card.health}</StatBox>
                </CardStats>
            )}
        </CardContainer>
    );
};

export default CardComponent;