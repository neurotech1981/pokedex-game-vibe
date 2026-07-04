import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import type { BattleMon, TeamId } from '../../utils/battleEngine';
import type { XpGain } from '../../utils/progression';
import type { HeldItemId, ItemId } from '../../data/items';
import { HELD_ITEMS, ITEMS } from '../../data/items';
import { playChime } from '../../utils/soundEffects';

export interface MonBattleStats {
    dealt: number;
    taken: number;
    kos: number;
}

interface PostBattlePanelProps {
    winner: TeamId;
    turnCount: number;
    /** The player's team, in party order. */
    teamMons: BattleMon[];
    stats: Record<string, MonBattleStats>;
    xpGains: XpGain[];
    drops: ItemId[];
    /** Rare held-item drops (bosses / streak milestones). */
    heldDrops?: HeldItemId[];
    streak: number;
    /** Omit to hide the rematch button (e.g. mid-gauntlet). */
    onRematch?: () => void;
    rematchLabel?: string;
    onExit: () => void;
    /** Gauntlet: advance to the next stage (only shown on victory). */
    onContinue?: () => void;
    /** Gauntlet: e.g. "Stage 4 cleared!" */
    stageLabel?: string;
    /** Extra content (recruit offers, evolution prompts). */
    children?: React.ReactNode;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PostBattlePanel: React.FC<PostBattlePanelProps> = ({
    winner,
    turnCount,
    teamMons,
    stats,
    xpGains,
    drops,
    heldDrops = [],
    streak,
    onRematch,
    rematchLabel = 'Rematch',
    onExit,
    onContinue,
    stageLabel,
    children,
}) => {
    const won = winner === 1;
    const anyLevelUp = xpGains.some(g => g.toLevel > g.fromLevel);
    useEffect(() => {
        if (anyLevelUp) playChime('levelUp');
    }, [anyLevelUp]);
    const dealtOf = (key: string) => stats[key]?.dealt ?? 0;
    const maxDealt = Math.max(1, ...teamMons.map(m => dealtOf(m.key)));
    const mvp = [...teamMons].sort((a, b) => dealtOf(b.key) - dealtOf(a.key))[0];
    const gainFor = (pokemonId: number) => xpGains.find(g => g.pokemonId === pokemonId);

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                display: 'flex',
                background: 'rgba(0,0,0,0.6)',
                p: { xs: 1, sm: 2 },
                overflowY: 'auto',
            }}
        >
            {/* margin:auto centers when the panel fits and allows scrolling
                from the top when it doesn't (flex centering would clip it) */}
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                style={{ margin: 'auto', maxWidth: '100%' }}
            >
                <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, width: 460, maxWidth: '100%', background: 'rgba(13, 20, 40, 0.95)', border: '1px solid rgba(148,163,184,0.25)' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, mb: 1 }}>
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
                        >
                            <EmojiEventsIcon sx={{ fontSize: 36, color: won ? '#ffd700' : '#f44336' }} />
                        </motion.div>
                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold' }}>
                            {stageLabel ?? (won ? 'Victory!' : 'Defeat...')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Battle lasted {turnCount} turn{turnCount === 1 ? '' : 's'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {mvp && dealtOf(mvp.key) > 0 && (
                                <Chip
                                    label={`MVP: ${capitalize(mvp.pokemon.name)} — ${dealtOf(mvp.key)} dmg, ${stats[mvp.key]?.kos ?? 0} KO`}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', fontWeight: 700 }}
                                />
                            )}
                            {won && streak > 1 && (
                                <Chip
                                    icon={<LocalFireDepartmentIcon sx={{ fontSize: 16 }} />}
                                    label={`${streak} win streak!`}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(255, 87, 34, 0.2)', color: '#ff8a65', fontWeight: 700, '& .MuiChip-icon': { color: '#ff8a65' } }}
                                />
                            )}
                        </Box>
                    </Box>

                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {teamMons.map((mon, monIndex) => {
                            const gain = gainFor(mon.pokemon.id);
                            const leveled = gain !== undefined && gain.toLevel > gain.fromLevel;
                            return (
                                <Box
                                    key={mon.key}
                                    component={motion.div}
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.25 + monIndex * 0.08 }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <img
                                            src={mon.pokemon.image}
                                            alt={mon.pokemon.name}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                objectFit: 'contain',
                                                filter: mon.currentHp <= 0 ? 'grayscale(1)' : 'none',
                                                opacity: mon.currentHp <= 0 ? 0.5 : 1,
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ color: '#fff', width: 84, fontSize: '0.7rem', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {mon.pokemon.name}
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }}>
                                            <Box sx={{ width: `${(dealtOf(mon.key) / maxDealt) * 100}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #4f8ef7, #8b7cf7)' }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 52, fontSize: '0.7rem', textAlign: 'right' }}>
                                            {dealtOf(mon.key)} dmg
                                        </Typography>
                                    </Box>
                                    {gain && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: '32px' }}>
                                            <Typography variant="caption" sx={{ color: '#66bb6a', minWidth: 48, fontSize: '0.7rem' }}>
                                                +{gain.amount} XP
                                            </Typography>
                                            <Box sx={{ flexGrow: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${gain.progressPct * 100}%` }}
                                                    transition={{ delay: 0.5 + monIndex * 0.08, duration: 0.7, ease: 'easeOut' }}
                                                    style={{ height: '100%', borderRadius: 2, background: '#66bb6a' }}
                                                />
                                            </Box>
                                            {leveled ? (
                                                <Chip
                                                    component={motion.div}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.9 + monIndex * 0.08 }}
                                                    label={`Lv ${gain.fromLevel} → ${gain.toLevel}!`}
                                                    size="small"
                                                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#ffd700', color: '#1a1a2e', fontWeight: 700 }}
                                                />
                                            ) : (
                                                <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 36, fontSize: '0.7rem', textAlign: 'right' }}>
                                                    Lv {gain.toLevel}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>

                    {(drops.length > 0 || heldDrops.length > 0) && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'center', flexWrap: 'wrap' }}
                        >
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Spoils:</Typography>
                            {drops.map((id, i) => (
                                <Chip
                                    key={`${id}-${i}`}
                                    label={ITEMS[id].name}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(79, 195, 247, 0.18)', color: '#4fc3f7', fontWeight: 700 }}
                                />
                            ))}
                            {heldDrops.map((id, i) => (
                                <Chip
                                    key={`held-${id}-${i}`}
                                    label={`${HELD_ITEMS[id].name} (held)`}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(255, 215, 0, 0.18)', color: '#ffd700', fontWeight: 700 }}
                                />
                            ))}
                        </Box>
                    )}

                    {children}

                    <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 0.5 }}>
                        {won && onContinue && (
                            <Button variant="contained" color="success" size="small" onClick={onContinue}>
                                Next Battle
                            </Button>
                        )}
                        {onRematch && (
                            <Button variant="contained" size="small" onClick={onRematch}>{rematchLabel}</Button>
                        )}
                        <Button variant="outlined" size="small" onClick={onExit} sx={{ color: '#fff', borderColor: '#fff' }}>Exit</Button>
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
};

export default PostBattlePanel;
