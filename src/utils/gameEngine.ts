import { GameState, GameAction, Card, Player } from '../types/card';

export class GameEngine {
    private state: GameState;

    constructor(initialState: GameState) {
        this.state = { ...initialState };

        // Draw initial hands
        for (let i = 0; i < 3; i++) {
            this.drawCard(0);
            this.drawCard(1);
        }
    }

    public getState(): GameState {
        return { ...this.state };
    }

    private drawCard(playerId: number): void {
        const player = this.state.players[playerId];
        if (player.deck.length > 0) {
            const drawnCard = player.deck.pop();
            if (drawnCard) {
                player.hand.push(drawnCard);
                this.state.battleLog.push(`${player.name} drew ${drawnCard.name}`);
            }
        } else {
            // Fatigue damage
            const fatigueDamage = this.state.currentTurn;
            player.health -= fatigueDamage;
            this.state.battleLog.push(`${player.name} took ${fatigueDamage} fatigue damage`);
        }
    }

    public handleAction(action: GameAction): void {
        switch (action.type) {
            case 'playCard':
                this.handlePlayCard(action);
                break;
            case 'attack':
                this.handleAttack(action);
                break;
            case 'useHeroPower':
                this.handleHeroPower(action);
                break;
            case 'endTurn':
                this.handleEndTurn(action);
                break;
            case 'concede':
                this.handleConcede(action);
                break;
        }
    }

    private handlePlayCard(action: { type: 'playCard'; cardId: string; playerId: number }): void {
        const player = this.state.players[action.playerId];
        const card = player.hand.find(c => c.id === action.cardId);

        if (!card || player.mana < card.cost) {
            return;
        }

        // Remove card from hand and update mana
        player.hand = player.hand.filter(c => c.id !== action.cardId);
        player.mana -= card.cost;

        // Add card to board
        player.board.push(card);

        // Handle battlecry effects
        if (card.type === 'minion') {
            card.effects
                .filter(effect => effect.type === 'battlecry')
                .forEach(effect => this.applyEffect(effect, card));
        }

        this.state.lastPlayedCard = card;
        this.state.battleLog.push(`${player.name} played ${card.name}`);
    }

    private handleAttack(action: { type: 'attack'; attackerId: string; defenderId: string; playerId: number }): void {
        const player = this.state.players[action.playerId];
        const attacker = player.board.find(c => c.id === action.attackerId);
        const defender = this.state.players[1 - action.playerId].board.find(c => c.id === action.defenderId);

        if (!attacker || !defender || !attacker.health || !defender.health || !attacker.attack) {
            return;
        }

        // Apply damage
        defender.health -= attacker.attack;
        attacker.health -= defender.attack || 0;

        // Handle deathrattles
        if (defender.health <= 0) {
            defender.effects
                .filter(effect => effect.type === 'deathrattle')
                .forEach(effect => this.applyEffect(effect, defender));
            this.state.players[1 - action.playerId].board = this.state.players[1 - action.playerId].board
                .filter(c => c.id !== defender.id);
        }

        if (attacker.health <= 0) {
            attacker.effects
                .filter(effect => effect.type === 'deathrattle')
                .forEach(effect => this.applyEffect(effect, attacker));
            player.board = player.board.filter(c => c.id !== attacker.id);
        }

        this.state.battleLog.push(`${attacker.name} attacked ${defender.name}`);
    }

    private handleHeroPower(action: GameAction): void {
        const player = this.state.players[action.playerId];
        const heroPower = player.heroPower;

        if (player.mana < heroPower.cost) {
            return;
        }

        player.mana -= heroPower.cost;
        heroPower.effects.forEach(effect => this.applyEffect(effect, heroPower));

        this.state.battleLog.push(`${player.name} used ${heroPower.name}`);
    }

    private handleEndTurn(action: GameAction): void {
        const currentPlayer = this.state.players[action.playerId];
        const nextPlayer = this.state.players[1 - action.playerId];

        // Update mana
        currentPlayer.maxMana = Math.min(10, currentPlayer.maxMana + 1);
        currentPlayer.mana = currentPlayer.maxMana;

        // Draw card for next player
        this.drawCard(1 - action.playerId);

        // Check for game over
        if (currentPlayer.health <= 0) {
            this.state.gameOver = true;
            this.state.battleLog.push(`${currentPlayer.name} has been defeated!`);
            return;
        }

        // Switch turns
        this.state.currentPlayer = 1 - action.playerId;
        this.state.currentTurn++;
    }

    private handleConcede(action: GameAction): void {
        this.state.gameOver = true;
        this.state.battleLog.push(`${this.state.players[action.playerId].name} has conceded!`);
    }

    private applyEffect(effect: Card['effects'][0], source: Card): void {
        switch (effect.type) {
            case 'battlecry':
                // Handle battlecry effects
                break;
            case 'deathrattle':
                // Handle deathrattle effects
                break;
            case 'aura':
                // Handle aura effects
                break;
            case 'trigger':
                // Handle trigger effects
                break;
        }
    }
}