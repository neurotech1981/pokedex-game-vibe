import React from 'react';
import { Avatar, Box, Chip, Grid, Paper, Tooltip, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { PlayerProfile } from '../utils/progression';
import { ACHIEVEMENTS } from '../utils/achievements';
import { GYM_STAGES, JOHTO_GYM_STAGES } from '../data/league';
import { BALLS, BALL_IDS } from '../data/items';
import { getBattleSprites } from '../utils/spriteSources';

interface TrainerCardProps {
    profile: PlayerProfile;
}

const StatBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
);

/** Read-only trainer profile: records, badges, achievements and the Box. */
const TrainerCard: React.FC<TrainerCardProps> = ({ profile }) => {
    const { records, league, box, achievements } = profile;
    const knownMons = Object.keys(profile.mons).length;
    const winRate = records.totalBattles > 0 ? Math.round((records.wins / records.totalBattles) * 100) : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1000, mx: 'auto' }}>
            {/* Header */}
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                <EmojiEventsIcon sx={{ fontSize: 56, color: league.champion ? '#ffd700' : 'text.disabled' }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        Trainer Card {league.champion && '· 🏆 CHAMPION'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {records.totalBattles} battles fought · {knownMons} Pokémon trained · {records.caught} caught in the wild
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {BALL_IDS.map(id => (
                        <Chip key={id} size="small" label={`${BALLS[id].name} ×${profile.balls[id] ?? 0}`} />
                    ))}
                </Box>
            </Paper>

            {/* Records */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Wins" value={records.wins} /></Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Losses" value={records.losses} /></Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Win rate" value={`${winRate}%`} /></Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Best streak" value={records.bestStreak} /></Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Gauntlet best" value={records.gauntletBestStage || '—'} /></Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}><StatBox label="Caught" value={records.caught} /></Grid>
            </Grid>

            {/* Badge case */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Badges {league.champion2 && '· 🔴 Red defeated — the true ending'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {[...GYM_STAGES, ...JOHTO_GYM_STAGES].map(stage => {
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
                </Box>
            </Paper>

            {/* Achievements */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Achievements · {achievements.length}/{ACHIEVEMENTS.length}
                </Typography>
                <Grid container spacing={1.5}>
                    {ACHIEVEMENTS.map(a => {
                        const earned = achievements.includes(a.id);
                        return (
                            <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        gap: 1.5,
                                        alignItems: 'center',
                                        opacity: earned ? 1 : 0.45,
                                        borderColor: earned ? 'rgba(255, 215, 0, 0.4)' : 'divider',
                                    }}
                                >
                                    <Typography sx={{ fontSize: 26, filter: earned ? 'none' : 'grayscale(1)' }}>{a.emoji}</Typography>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{a.description}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            </Paper>

            {/* Box */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Box · {box.length} Pokémon
                </Typography>
                {box.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Recruit or catch wild Pokémon to fill your Box — manage it in the Team Builder.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {box.map((entry, i) => (
                            <Tooltip key={`${entry.pokemon.id}-${i}`} title={`${entry.pokemon.name} · Lv ${entry.level}${entry.shiny ? ' · shiny' : ''}${entry.elite ? ' · elite' : ''}`}>
                                <Avatar
                                    src={getBattleSprites(entry.pokemon.id, entry.shiny).artwork}
                                    alt={entry.pokemon.name}
                                    variant="rounded"
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        border: entry.shiny ? '2px solid #ffd700' : entry.elite ? '2px solid #ab47bc' : 'none',
                                    }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default TrainerCard;
