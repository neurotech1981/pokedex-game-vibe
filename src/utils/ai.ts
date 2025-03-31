import { GameState, Card, GameAction } from '../types/card';

export class AI {
    public getAction(gameState: GameState): GameAction | null {
        const aiPlayer = gameState.players[1];
        const playerBoard = gameState.players[0].board;
        const aiBoard = aiPlayer.board;

        // Try to play cards
        const playableCards = aiPlayer.hand
            .filter(card => card.cost <= aiPlayer.mana)
            .sort((a, b) => b.cost - a.cost); // Play highest cost cards first

        if (playableCards.length > 0) {
            return {
                type: 'playCard',
                cardId: playableCards[0].id,
                playerId: 1,
            };
        }

        // Try to attack
        for (const attacker of aiBoard) {
            // If there are enemy minions, attack them
            if (playerBoard.length > 0) {
                const target = this.findBestTarget(attacker, playerBoard);
                if (target) {
                    return {
                        type: 'attack',
                        attackerId: attacker.id,
                        defenderId: target.id,
                        playerId: 1,
                    };
                }
            }
            // Otherwise, attack the hero
            else {
                return {
                    type: 'attack',
                    attackerId: attacker.id,
                    defenderId: gameState.players[0].hero.id,
                    playerId: 1,
                };
            }
        }

        // If we can't do anything else, use hero power
        if (aiPlayer.mana >= aiPlayer.heroPower.cost) {
            return {
                type: 'useHeroPower',
                playerId: 1,
            };
        }

        // End turn if we can't do anything
        return {
            type: 'endTurn',
            playerId: 1,
        };
    }

    private findBestTarget(attacker: Card, targets: Card[]): Card | null {
        // Simple target selection: prioritize killing minions
        const killableTargets = targets.filter(target =>
            target.health && attacker.attack && target.health <= attacker.attack
        );

        if (killableTargets.length > 0) {
            // Among killable targets, choose the one with highest attack
            return killableTargets.reduce((best, current) =>
                (current.attack || 0) > (best.attack || 0) ? current : best
            );
        }

        // If no killable targets, attack the highest attack minion
        return targets.reduce((best, current) =>
            (current.attack || 0) > (best.attack || 0) ? current : best
        );
    }
}