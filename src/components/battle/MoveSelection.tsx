import React from 'react';
import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import type { Move } from '../../data/moves';
import { STRUGGLE } from '../../data/moves';
import type { BattleMon } from '../../utils/battleEngine';
import { canAffordMove } from '../../utils/battleEngine';

interface MoveSelectionProps {
    mon: BattleMon;
    onSelectMove: (move: Move) => void;
    disabled?: boolean;
    getTypeColor: (type: string) => string;
}

const getMoveDescription = (move: Move): string => {
    let description = move.power > 0
        ? `A ${move.type}-type attack with ${move.power > 80 ? 'high' : move.power > 40 ? 'medium' : 'low'} power.`
        : `A ${move.type}-type support move.`;
    if (move.statusEffect) {
        description += ` ${Math.round(move.statusEffect.chance * 100)}% chance to inflict ${move.statusEffect.type}.`;
    }
    if (move.specialEffect) {
        const effectText = {
            heal: `Restores up to ${move.specialEffect.value}% of max HP.`,
            boost: 'Boosts your attack power.',
            weather: 'Changes the weather.',
            terrain: 'Changes the battle terrain.',
        }[move.specialEffect.type];
        description += ` ${effectText}`;
    }
    if (move.comboMove) {
        description += ` ${Math.round(move.comboMove.chance * 100)}% chance to follow up with ${move.comboMove.name}.`;
    }
    if (move.multiHit) {
        description += move.multiHit.min === move.multiHit.max
            ? ` Hits ${move.multiHit.min} times.`
            : ` Hits ${move.multiHit.min}–${move.multiHit.max} times.`;
    }
    if (move.flinchChance) {
        description += ` ${Math.round(move.flinchChance * 100)}% chance to make the target flinch.`;
    }
    if (move.debuff) {
        description += ` ${Math.round(move.debuff.chance * 100)}% chance to lower the target's ${move.debuff.stat} by ${move.debuff.stages}.`;
    }
    if ((move.priority ?? 0) > 0) {
        description += ' Priority: strikes fast — you act first next round.';
    }
    return description;
};

const MoveSelection: React.FC<MoveSelectionProps> = ({ mon, onSelectMove, disabled = false, getTypeColor }) => {
    const moves = mon.moves;
    const anyAffordable = moves.some(move => canAffordMove(mon, move));

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1,
                height: '100%',
                alignContent: 'stretch',
            }}
        >
            {moves.map(move => {
                const affordable = canAffordMove(mon, move);
                const color = getTypeColor(move.type);
                return (
                    <Tooltip
                        key={move.name}
                        arrow
                        placement="top"
                        title={
                            <React.Fragment>
                                <Typography variant="subtitle2" color="inherit">{move.name}</Typography>
                                <Typography variant="body2">{getMoveDescription(move)}</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    Power {move.power > 0 ? move.power : '—'} · Accuracy {Math.round(move.accuracy * 100)}% · Energy {move.energyCost}
                                </Typography>
                                {!affordable && (
                                    <Typography variant="body2" sx={{ mt: 0.5, color: '#ff8a80' }}>
                                        Not enough energy!
                                    </Typography>
                                )}
                            </React.Fragment>
                        }
                    >
                        <span style={{ display: 'flex' }}>
                            <Button
                                fullWidth
                                onClick={() => onSelectMove(move)}
                                disabled={disabled || !affordable}
                                sx={{
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    gap: 0.5,
                                    p: 1.25,
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: `${color}88`,
                                    background: `linear-gradient(135deg, ${color}30 0%, rgba(19, 26, 43, 0.9) 70%)`,
                                    color: '#fff',
                                    opacity: disabled || !affordable ? 0.45 : 1,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: color,
                                        background: `linear-gradient(135deg, ${color}4d 0%, rgba(19, 26, 43, 0.95) 70%)`,
                                        transform: 'translateY(-1px)',
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.55)',
                                        borderColor: `${color}55`,
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize', lineHeight: 1.2 }}>
                                        {move.name}
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Chip
                                        icon={<BoltIcon sx={{ fontSize: '0.8rem !important' }} />}
                                        label={move.energyCost}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            backgroundColor: affordable ? 'rgba(255, 213, 79, 0.2)' : 'rgba(244, 67, 54, 0.3)',
                                            color: affordable ? '#ffd54f' : '#ff8a80',
                                        }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={move.type}
                                        size="small"
                                        sx={{
                                            height: 16,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            backgroundColor: color,
                                            color: '#fff',
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Pwr {move.power > 0 ? move.power : '—'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Acc {Math.round(move.accuracy * 100)}%
                                    </Typography>
                                </Box>
                            </Button>
                        </span>
                    </Tooltip>
                );
            })}
            {!anyAffordable && (
                <Button
                    onClick={() => onSelectMove(STRUGGLE)}
                    disabled={disabled}
                    variant="outlined"
                    color="warning"
                    sx={{ gridColumn: '1 / -1' }}
                >
                    Struggle (no energy left)
                </Button>
            )}
        </Box>
    );
};

export default MoveSelection;
