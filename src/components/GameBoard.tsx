import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Player, Card } from '../types/card';
import CardComponent from './CardComponent';
import Hand from './Hand';

interface ModifiedGameState {
    players: {
        player: Player;
        ai: Player;
    };
    currentPlayer: string; // 'player' or 'ai'
    currentTurn: number;
    gameOver: boolean;
    lastPlayedCard?: Card;
    battleLog: string[];
    effects: any[];
}

interface GameBoardProps {
    gameState: ModifiedGameState;
    onCardClick: (action: any) => void;
    onEndTurn: () => void;
    onHeroPower: () => void;
}

const BoardContainer = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
}));

const OpponentBoard = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
}));

const PlayerBoard = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
}));

const HeroSection = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius
}));

const BoardSection = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    minHeight: '150px'
}));

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onCardClick, onEndTurn, onHeroPower }) => {
    const { players } = gameState;
    const opponent = players.ai;
    const player = players.player;

    return (
        <BoardContainer>
            {/* Opponent's side */}
            <OpponentBoard>
                <HeroSection>
                    <Typography variant="h6">{opponent.name}</Typography>
                    <Typography>Health: {opponent.health}</Typography>
                    <Typography>Mana: {opponent.mana}</Typography>
                    <CardComponent
                        card={opponent.hero}
                        onClick={() => {}}
                        disabled={true}
                    />
                </HeroSection>
                <BoardSection>
                    {opponent.board.map((card: Card) => (
                        <CardComponent
                            key={card.id}
                            card={card}
                            onClick={() => {}}
                            disabled={true}
                        />
                    ))}
                </BoardSection>
            </OpponentBoard>

            {/* Player's side */}
            <PlayerBoard>
                <BoardSection>
                    {player.board.map((card: Card) => (
                        <CardComponent
                            key={card.id}
                            card={card}
                            onClick={() => onCardClick({
                                type: 'attack',
                                playerId: 'player',
                                attackerId: card.id
                            })}
                            disabled={gameState.currentPlayer !== 'player'}
                        />
                    ))}
                </BoardSection>
                <HeroSection>
                    <Typography variant="h6">{player.name}</Typography>
                    <Typography>Health: {player.health}</Typography>
                    <Typography>Mana: {player.mana}</Typography>
                    <CardComponent
                        card={player.hero}
                        onClick={() => {}}
                        disabled={true}
                    />
                    <CardComponent
                        card={player.heroPower}
                        onClick={onHeroPower}
                        disabled={gameState.currentPlayer !== 'player' || player.mana < 2}
                    />
                </HeroSection>
                <Hand
                    cards={player.hand}
                    onCardClick={onCardClick}
                    disabled={gameState.currentPlayer !== 'player'}
                    mana={player.mana}
                />
            </PlayerBoard>
        </BoardContainer>
    );
};

export default GameBoard;