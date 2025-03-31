import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Card, GameState, GameAction, CardClass } from '../types/card';
import GameBoard from './GameBoard';
import Hand from './Hand';
import { GameEngine } from '../utils/gameEngine';
import { AI } from '../utils/ai';
import { getStarterDeck } from '../data/cards';
import { v4 as uuidv4 } from 'uuid';

const GameContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
}));

const GameHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1),
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
}));

const PlayerInfo = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
}));

const HealthBar = styled(Box)<{ health: number }>(({ theme, health }) => ({
    width: '200px',
    height: '20px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    overflow: 'hidden',
    '&::after': {
        content: '""',
        display: 'block',
        width: `${health}%`,
        height: '100%',
        background: health > 50 ? '#00c853' : health > 25 ? '#ffd600' : '#ff1744',
        transition: 'width 0.3s ease-in-out',
    },
}));

const EndTurnButton = styled(Button)(({ theme }) => ({
    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
    color: '#ffffff',
    padding: theme.spacing(1, 3),
    borderRadius: '20px',
    textTransform: 'none',
    fontWeight: 'bold',
    '&:hover': {
        background: 'linear-gradient(135deg, #357abd 0%, #2a5f9e 100%)',
    },
    '&:disabled': {
        background: 'rgba(74, 144, 226, 0.5)',
    },
}));

const defaultGameState: GameState = {
    currentTurn: 1,
    currentPlayer: '',
    players: {
        player: {
            id: 'player',
            name: 'Player',
            health: 30,
            maxHealth: 30,
            mana: 1,
            maxMana: 1,
            deck: getStarterDeck(),
            hand: [],
            board: [],
            hero: {
                id: 'player_hero',
                name: 'Trainer',
                description: 'Your hero',
                cost: 0,
                type: 'hero',
                rarity: 'common',
                class: 'neutral',
                image: '/images/heroes/trainer.jpg',
                health: 30,
                attack: 0
            },
            heroPower: {
                id: 'player_hero_power',
                name: 'Train',
                description: 'Give a friendly minion +1/+1',
                cost: 2,
                type: 'hero_power',
                rarity: 'common',
                class: 'neutral',
                image: '/images/heroes/train.jpg',
                effects: [
                    {
                        type: 'battlecry',
                        description: 'Give a friendly minion +1/+1',
                        target: 'minion',
                        value: 1
                    }
                ]
            },
            heroPowerUsed: false
        },
        ai: {
            id: 'ai',
            name: 'AI Opponent',
            health: 30,
            maxHealth: 30,
            mana: 1,
            maxMana: 1,
            deck: getStarterDeck(),
            hand: [],
            board: [],
            hero: {
                id: 'ai_hero',
                name: 'AI Trainer',
                description: 'AI hero',
                cost: 0,
                type: 'hero',
                rarity: 'common',
                class: 'neutral',
                image: '/images/heroes/ai_trainer.jpg',
                health: 30,
                attack: 0
            },
            heroPower: {
                id: 'ai_hero_power',
                name: 'Train',
                description: 'Give a friendly minion +1/+1',
                cost: 2,
                type: 'hero_power',
                rarity: 'common',
                class: 'neutral',
                image: '/images/heroes/train.jpg',
                effects: [
                    {
                        type: 'battlecry',
                        description: 'Give a friendly minion +1/+1',
                        target: 'minion',
                        value: 1
                    }
                ]
            },
            heroPowerUsed: false
        }
    },
    gameOver: false,
    effects: []
};

const Game: React.FC = () => {
    const [gameEngine] = useState(() => new GameEngine(defaultGameState.players));
    const [gameState, setGameState] = useState<GameState>(defaultGameState);
    const [selectedCard, setSelectedCard] = useState<Card | undefined>();
    const [ai] = useState(() => new AI('ai'));

    useEffect(() => {
        // Handle AI turns
        if (gameState.currentPlayer === 'ai' && !gameState.gameOver) {
            const timer = setTimeout(() => {
                const action = ai.getAction(gameState);
                gameEngine.handleAction(action);
                setGameState(gameEngine.getState());
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [gameState, ai, gameEngine]);

    const handleCardClick = (card: Card) => {
        if (gameState.currentPlayer === 'player' && !gameState.gameOver) {
            if (selectedCard?.id === card.id) {
                setSelectedCard(undefined);
            } else {
                setSelectedCard(card);
            }
        }
    };

    const handleEndTurn = () => {
        if (gameState.currentPlayer === 'player' && !gameState.gameOver) {
            handleAction({ type: 'endTurn', playerId: 'player' });
        }
    };

    const handleConcede = () => {
        handleAction({ type: 'concede', playerId: 'player' });
    };

    const handleAction = (action: any) => {
        if (gameState.currentPlayer === 'player' && !gameState.gameOver) {
            gameEngine.handleAction(action);
            setGameState(gameEngine.getState());
        }
    };

    const { players } = gameState;
    const opponent = players.ai;
    const player = players.player;

    return (
        <GameContainer>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Pokemon Card Game
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                    Turn {gameState.currentTurn} - {gameState.currentPlayer === 'player' ? 'Your Turn' : "AI's Turn"}
                </Typography>
                {gameState.gameOver && (
                    <Typography variant="h5" color="primary">
                        {gameState.winner === 'player' ? 'You Win!' : 'AI Wins!'}
                    </Typography>
                )}
            </Paper>

            <GameHeader>
                <PlayerInfo>
                    <Typography variant="h6" color="white">
                        {opponent.name}
                    </Typography>
                    <HealthBar health={opponent.hero.health || 0} />
                </PlayerInfo>
                <EndTurnButton
                    onClick={handleEndTurn}
                    disabled={gameState.currentPlayer !== 'player' || gameState.gameOver}
                >
                    End Turn
                </EndTurnButton>
                <PlayerInfo>
                    <HealthBar health={player.hero.health || 0} />
                    <Typography variant="h6" color="white">
                        {player.name}
                    </Typography>
                </PlayerInfo>
            </GameHeader>

            <GameBoard
                gameState={gameState}
                onCardClick={handleCardClick}
                onEndTurn={handleEndTurn}
                onHeroPower={handleAction}
            />

            <Hand
                cards={player.hand}
                onCardClick={handleCardClick}
                selectedCard={selectedCard}
                mana={player.mana}
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConcede}
                    disabled={gameState.gameOver}
                >
                    Concede
                </Button>
            </Box>
        </GameContainer>
    );
};

export default Game;