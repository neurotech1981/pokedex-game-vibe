import { Pokemon, BattleState } from '../types/pokemon';
import { Ability, AbilityTrigger } from '../types/abilities';
import { addFloatingInfo } from './effects';

export const activateAbility = (
    pokemon: Pokemon | null,
    trigger: AbilityTrigger,
    battleState: BattleState,
    setBattleState: React.Dispatch<React.SetStateAction<BattleState>>,
    addBattleLogEntry: (message: string, type: 'normal' | 'critical' | 'death' | 'victory') => void
) => {
    if (!pokemon || !pokemon.activeAbility) return;

    const ability = pokemon.activeAbility;
    if (ability.trigger !== trigger) return;

    // Check if ability should activate based on chance
    if (ability.effect.chance && Math.random() > ability.effect.chance) return;

    // Create battle log entry
    const logEntry = {
        id: Date.now(),
        message: `${pokemon.name}'s ${ability.name} activated!`,
        type: 'normal' as const,
        timestamp: Date.now()
    };

    // Apply ability effect
    switch (ability.effect.type) {
        case 'boost':
            setBattleState(prev => ({
                ...prev,
                battleLog: [logEntry, ...prev.battleLog],
                activeAbilities: {
                    ...prev.activeAbilities,
                    [pokemon.id]: {
                        ability,
                        isActive: true
                    }
                }
            }));
            // Add visual feedback
            addFloatingInfo(pokemon.id, `${ability.name} activated!`, '#4CAF50', 'effectiveness');
            break;

        case 'heal':
            setBattleState(prev => {
                const currentHealth = prev.team1Health[pokemon.id] || prev.team2Health[pokemon.id] || 0;
                const newHealth = Math.min(100, currentHealth + ability.effect.value);
                const healthKey = prev.team1Health[pokemon.id] !== undefined ? 'team1Health' : 'team2Health';

                return {
                    ...prev,
                    battleLog: [logEntry, ...prev.battleLog],
                    [healthKey]: {
                        ...prev[healthKey],
                        [pokemon.id]: newHealth
                    }
                };
            });
            // Add visual feedback
            addFloatingInfo(pokemon.id, `+${ability.effect.value} HP`, '#4CAF50', 'effectiveness');
            break;

        case 'status':
            setBattleState(prev => ({
                ...prev,
                battleLog: [logEntry, ...prev.battleLog],
                statusEffects: {
                    ...prev.statusEffects,
                    [pokemon.id]: {
                        type: ability.effect.statusType || 'paralysis',
                        turns: ability.effect.duration || 3
                    }
                }
            }));
            // Add visual feedback
            addFloatingInfo(pokemon.id, `${ability.effect.statusType || 'paralysis'} applied!`, '#FFA726', 'status');
            break;

        case 'damage':
            setBattleState(prev => {
                const targetId = ability.target === 'self' ? pokemon.id :
                               prev.currentTurn === 1 ? prev.team2Pokemon?.id : prev.team1Pokemon?.id;
                if (!targetId) return prev;

                const healthKey = prev.team1Health[targetId] !== undefined ? 'team1Health' : 'team2Health';
                const currentHealth = prev[healthKey][targetId];
                const damage = ability.effect.value;
                const newHealth = Math.max(0, currentHealth - damage);

                return {
                    ...prev,
                    battleLog: [logEntry, ...prev.battleLog],
                    [healthKey]: {
                        ...prev[healthKey],
                        [targetId]: newHealth
                    }
                };
            });
            // Add visual feedback
            addFloatingInfo(pokemon.id, `-${ability.effect.value} HP`, '#f44336', 'damage');
            break;
    }

    // Reset ability activation after animation
    setTimeout(() => {
        setBattleState(prev => ({
            ...prev,
            activeAbilities: {
                ...prev.activeAbilities,
                [pokemon.id]: {
                    ability,
                    isActive: false
                }
            }
        }));
    }, ability.animation?.duration || 1000);
};