import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Card } from '../types/card';
import CardComponent from './CardComponent';

interface HandProps {
    cards: Card[];
    onCardClick: (action: any) => void;
    disabled?: boolean;
    mana?: number;
}

const HandContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    minHeight: '300px'
}));

const Hand: React.FC<HandProps> = ({ cards, onCardClick, disabled, mana = 0 }) => {
    return (
        <HandContainer>
            {cards.map(card => (
                <CardComponent
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick({
                        type: 'playCard',
                        playerId: 'player',
                        cardId: card.id
                    })}
                    disabled={disabled || card.cost > mana}
                />
            ))}
        </HandContainer>
    );
};

export default Hand;