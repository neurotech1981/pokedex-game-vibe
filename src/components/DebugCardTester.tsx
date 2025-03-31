import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { createGameCard } from '../data/cards';
import CardComponent from './CardComponent';

const DebugCardTester: React.FC = () => {
    const testCard = createGameCard(
        'Test Card',
        'Testing the type-safe card creation function',
        3,
        'minion',
        'rare',
        'water',
        '/images/cards/vaporeon.jpg',
        3,
        3,
        [
            {
                type: 'battlecry',
                description: 'Type-safe effect description',
                target: 'all'
            }
        ]
    );

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5">Debug Card Tester</Typography>
            <Box sx={{ mt: 2 }}>
                <CardComponent card={testCard} onClick={() => console.log('Card clicked')} />
            </Box>
        </Box>
    );
};

export default DebugCardTester;