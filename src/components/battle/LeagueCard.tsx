import React, { useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { LeagueStage } from '../../data/league';
import {
    GYM_STAGES,
    HOENN_GYM_STAGES,
    JOHTO_GYM_STAGES,
    LEAGUE_STAGES,
    REMATCH_LEVEL_BONUS,
    nextLeagueStage,
    trainerPortraitUrl,
} from '../../data/league';
import type { LeagueProgress } from '../../utils/progression';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material';
import { surface } from '../../theme';
import { backdropSx } from './battleUi';

interface LeagueCardProps {
    league: LeagueProgress;
    /** Level the next stage will be fought at (computed from the selected team). */
    stageLevel: (stage: LeagueStage) => number;
    starting: boolean;
    /** No team selected yet. */
    disabled: boolean;
    error: string | null;
    onChallenge: (stage: LeagueStage, rematch?: boolean) => void;
}

const LeagueCard: React.FC<LeagueCardProps> = ({ league, stageLevel, starting, disabled, error, onChallenge }) => {
    const [ladderOpen, setLadderOpen] = useState(false);
    const next = nextLeagueStage(league.defeated);

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.2 }}
            sx={{
                ...backdropSx('elite4drake'),
                p: 2.5,
                gridColumn: { xs: 'auto', md: '1 / -1' },
                border: `1px solid ${surface.border}`,
                transition: 'transform .15s, border-color .15s, box-shadow .15s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: alpha('#ffd700', 0.5),
                    boxShadow: `0 6px 24px ${alpha('#ffd700', 0.18)}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <EmojiEventsIcon sx={{ fontSize: 36, color: '#ffd700' }} />
                <Box sx={{ flexGrow: 1, minWidth: 240 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffd700' }}>
                        Pokémon League
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Defeat the 8 Kanto Gym Leaders, conquer the Elite Four, and take the
                        Champion's throne. Won badges are yours forever.
                    </Typography>
                </Box>
                <Button variant="text" size="small" onClick={() => setLadderOpen(true)}>
                    View ladder
                </Button>
            </Box>

            {/* Badge case */}
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                {GYM_STAGES.map(stage => {
                    const earned = league.defeated.includes(stage.id);
                    return (
                        <Tooltip key={stage.id} title={`${stage.badge!.name} — ${stage.name}`}>
                            <Chip
                                label={`${stage.badge!.emoji} ${stage.badge!.name.replace(' Badge', '')}`}
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    bgcolor: earned ? stage.badge!.color : 'rgba(255,255,255,0.06)',
                                    color: earned ? '#1a1a2e' : 'text.disabled',
                                    opacity: earned ? 1 : 0.55,
                                }}
                            />
                        </Tooltip>
                    );
                })}
                {league.champion && (
                    <Chip
                        label="🏆 CHAMPION"
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: '#ffd700', color: '#1a1a2e' }}
                    />
                )}
            </Box>

            {/* Johto badge case (post-game) */}
            {league.champion && (
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                    {JOHTO_GYM_STAGES.map(stage => {
                        const earned = league.defeated.includes(stage.id);
                        return (
                            <Tooltip key={stage.id} title={`${stage.badge!.name} — ${stage.name} (Johto)`}>
                                <Chip
                                    label={`${stage.badge!.emoji} ${stage.badge!.name.replace(' Badge', '')}`}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: earned ? stage.badge!.color : 'rgba(255,255,255,0.06)',
                                        color: earned ? '#1a1a2e' : 'text.disabled',
                                        opacity: earned ? 1 : 0.55,
                                    }}
                                />
                            </Tooltip>
                        );
                    })}
                    {league.champion2 && (
                        <Chip label="🔴 RED DEFEATED" size="small" sx={{ fontWeight: 700, bgcolor: '#ef5350', color: '#fff' }} />
                    )}
                </Box>
            )}

            {/* Hoenn badge case (unlocks after Red) */}
            {league.champion2 && (
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                    {HOENN_GYM_STAGES.map(stage => {
                        const earned = league.defeated.includes(stage.id);
                        return (
                            <Tooltip key={stage.id} title={`${stage.badge!.name} — ${stage.name} (Hoenn)`}>
                                <Chip
                                    label={`${stage.badge!.emoji} ${stage.badge!.name.replace(' Badge', '')}`}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: earned ? stage.badge!.color : 'rgba(255,255,255,0.06)',
                                        color: earned ? '#1a1a2e' : 'text.disabled',
                                        opacity: earned ? 1 : 0.55,
                                    }}
                                />
                            </Tooltip>
                        );
                    })}
                    {league.champion3 && (
                        <Chip label="💎 STEVEN DEFEATED" size="small" sx={{ fontWeight: 700, bgcolor: '#80cbc4', color: '#1a1a2e' }} />
                    )}
                </Box>
            )}

            {error && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                    {error}
                </Alert>
            )}

            {next ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                    <Avatar
                        src={trainerPortraitUrl(next.portrait)}
                        alt={next.name}
                        variant="rounded"
                        sx={{ width: 48, height: 48, imageRendering: 'pixelated', bgcolor: 'rgba(255,255,255,0.06)' }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 180 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Next: {next.name} — {next.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {next.team.length} Pokémon · around Lv {stageLevel(next)} · {next.typeTheme}-type specialist
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: '#ffd700', color: '#1a1a2e', fontWeight: 700, '&:hover': { bgcolor: '#e6c200' } }}
                        disabled={starting || disabled}
                        onClick={() => onChallenge(next)}
                    >
                        {starting ? 'Preparing…' : `Challenge ${next.name}`}
                    </Button>
                </Box>
            ) : (
                <Typography variant="body2" sx={{ mt: 2, color: '#ffd700', fontWeight: 700 }}>
                    The League is conquered. You are the Champion!
                </Typography>
            )}

            {/* Post-game: Round 2 gym rematches */}
            {league.champion && (
                <Box sx={{ mt: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Round 2 — the Gym Leaders want revenge
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        +{REMATCH_LEVEL_BONUS} levels · ×2.5 XP · rematch any time
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
                        {GYM_STAGES.map(stage => {
                            const beaten = league.defeatedRematches.includes(stage.id);
                            return (
                                <Tooltip key={stage.id} title={`${stage.name} — around Lv ${stageLevel(stage) + REMATCH_LEVEL_BONUS}${beaten ? ' · defeated' : ''}`}>
                                    <span>
                                        <Chip
                                            avatar={<Avatar src={trainerPortraitUrl(stage.portrait)} sx={{ imageRendering: 'pixelated' }} />}
                                            label={`${stage.badge!.emoji} ${stage.name}${beaten ? ' ✓' : ''}`}
                                            size="small"
                                            clickable
                                            disabled={starting || disabled}
                                            onClick={() => onChallenge(stage, true)}
                                            sx={{
                                                fontWeight: 700,
                                                bgcolor: beaten ? 'rgba(102, 187, 106, 0.18)' : 'rgba(255,255,255,0.08)',
                                                color: beaten ? '#66bb6a' : 'text.primary',
                                            }}
                                        />
                                    </span>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Full ladder */}
            <Dialog open={ladderOpen} onClose={() => setLadderOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Kanto League Ladder</DialogTitle>
                <DialogContent dividers>
                    <List dense disablePadding>
                        {LEAGUE_STAGES.map(stage => {
                            const beaten = league.defeated.includes(stage.id);
                            const isNext = next?.id === stage.id;
                            return (
                                <ListItem
                                    key={stage.id}
                                    sx={{
                                        gap: 1.5,
                                        borderRadius: 1,
                                        mb: 0.25,
                                        bgcolor: isNext ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                                        opacity: beaten || isNext ? 1 : 0.45,
                                    }}
                                >
                                    <Avatar
                                        src={trainerPortraitUrl(stage.portrait)}
                                        variant="rounded"
                                        sx={{ width: 36, height: 36, imageRendering: 'pixelated', bgcolor: 'rgba(255,255,255,0.06)' }}
                                    />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {stage.name}
                                            {stage.badge ? ` · ${stage.badge.emoji}` : stage.kind === 'champion' ? ' · 🏆' : ' · ⭐'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stage.title} · {stage.typeTheme}
                                        </Typography>
                                    </Box>
                                    {beaten ? (
                                        <CheckCircleIcon sx={{ color: '#66bb6a', fontSize: 20 }} />
                                    ) : isNext ? (
                                        <Chip label="NEXT" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#ffd700', color: '#1a1a2e', fontWeight: 700 }} />
                                    ) : (
                                        <LockIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                                    )}
                                </ListItem>
                            );
                        })}
                    </List>
                </DialogContent>
            </Dialog>
        </Paper>
    );
};

export default LeagueCard;
