import React, { useState } from 'react';
import { Avatar, Box, Button, Chip, Grid, IconButton, LinearProgress, Paper, Tooltip, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import type { BattleReplay } from '../utils/replay';
import { deleteReplay, loadReplays } from '../utils/replay';
import { applyFullSave, buildFullSave, parseFullSave } from '../utils/saveData';
import type { PlayerProfile } from '../utils/progression';
import { KANTO_DEX_SIZE, JOHTO_DEX_MAX, dexCompletion } from '../utils/progression';
import { ACHIEVEMENTS } from '../utils/achievements';
import { GYM_STAGES, JOHTO_GYM_STAGES } from '../data/league';
import { BALLS, BALL_IDS } from '../data/items';
import { getBattleSprites } from '../utils/spriteSources';

interface TrainerCardProps {
    profile: PlayerProfile;
    /** Play a saved battle recording (switches to the Battle tab). */
    onWatchReplay: (replay: BattleReplay) => void;
}

const StatBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
);

/** Read-only trainer profile: records, badges, achievements and the Box. */
const DexRow: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => (
    <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">{count}/{total}{count >= total ? ' · complete! 🏅' : ''}</Typography>
        </Box>
        <LinearProgress
            variant="determinate"
            value={Math.min(100, (count / total) * 100)}
            sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
        />
    </Box>
);

const TrainerCard: React.FC<TrainerCardProps> = ({ profile, onWatchReplay }) => {
    const { records, league, box, achievements } = profile;
    const knownMons = Object.keys(profile.mons).length;
    const winRate = records.totalBattles > 0 ? Math.round((records.wins / records.totalBattles) * 100) : 0;
    const dex = dexCompletion(profile.dex);
    const [replays, setReplays] = useState<BattleReplay[]>(loadReplays);
    const [importError, setImportError] = useState<string | null>(null);
    const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseFullSave> | null>(null);

    const handleExportSave = () => {
        const blob = new Blob([JSON.stringify(buildFullSave(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokedex-save-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // allow re-picking the same file
        if (!file) return;
        setImportError(null);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                setPendingImport(parseFullSave(String(reader.result)));
            } catch (err) {
                setImportError(err instanceof Error ? err.message : 'Could not read that file.');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        if (!pendingImport) return;
        applyFullSave(pendingImport);
        // Full reload so every consumer (profile hook, teams, replays) rehydrates
        window.location.reload();
    };

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
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip
                        size="small"
                        label={`🪙 ${profile.coins.toLocaleString()} PokéCoins`}
                        sx={{ bgcolor: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', fontWeight: 700 }}
                    />
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

            {/* Pokédex completion */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Pokédex · {dex.kantoCaught}/{KANTO_DEX_SIZE} Kanto caught
                </Typography>
                <DexRow label="Kanto — seen" count={dex.kantoSeen} total={KANTO_DEX_SIZE} color="#4f8ef7" />
                <DexRow label="Kanto — caught" count={dex.kantoCaught} total={KANTO_DEX_SIZE} color="#66bb6a" />
                {dex.hasJohto && (
                    <>
                        <DexRow label="Johto — seen" count={dex.johtoSeen} total={JOHTO_DEX_MAX - KANTO_DEX_SIZE} color="#4f8ef7" />
                        <DexRow label="Johto — caught" count={dex.johtoCaught} total={JOHTO_DEX_MAX - KANTO_DEX_SIZE} color="#66bb6a" />
                    </>
                )}
                <Typography variant="caption" color="text.secondary">
                    Seen = appeared in any of your battles · Caught = on your roster, in your Box, or caught in the wild.
                </Typography>
            </Paper>

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

            {/* Save data */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    💾 Save Data
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Your save lives in this browser only. Export a backup file now and then —
                    clearing browser data (or switching devices) is otherwise a hard reset.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="contained" size="small" startIcon={<FileDownloadIcon />} onClick={handleExportSave} sx={{ fontWeight: 700 }}>
                        Export save
                    </Button>
                    <Button variant="outlined" size="small" component="label" startIcon={<FileUploadIcon />} sx={{ fontWeight: 700 }}>
                        Import save
                        <input type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
                    </Button>
                </Box>
                {importError && (
                    <Typography variant="caption" sx={{ color: '#ef5350', display: 'block', mt: 1 }}>
                        {importError}
                    </Typography>
                )}
                {pendingImport && (
                    <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5, borderColor: 'rgba(239, 83, 80, 0.5)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                            Replace ALL current progress with the save from {new Date(pendingImport.exportedAt).toLocaleString()}?
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" color="error" onClick={handleConfirmImport} sx={{ fontWeight: 700 }}>
                                Yes, import and reload
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => setPendingImport(null)}>
                                Cancel
                            </Button>
                        </Box>
                    </Paper>
                )}
            </Paper>

            {/* Replays */}
            <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    ▶️ Battle Replays · {replays.length}
                </Typography>
                {replays.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Every battle you finish is recorded automatically — the last 20 stay here to rewatch.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {replays.map(replay => (
                            <Paper
                                key={replay.date}
                                variant="outlined"
                                sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                            >
                                <Chip
                                    size="small"
                                    label={replay.winner === 1 ? 'WIN' : replay.winner === 2 ? 'LOSS' : '—'}
                                    sx={{
                                        fontWeight: 700,
                                        minWidth: 52,
                                        bgcolor: replay.winner === 1 ? 'rgba(102, 187, 106, 0.25)' : 'rgba(239, 83, 80, 0.25)',
                                        color: replay.winner === 1 ? '#66bb6a' : '#ef5350',
                                    }}
                                />
                                <Box sx={{ flexGrow: 1, minWidth: 160 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{replay.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {replay.mode} · {new Date(replay.date).toLocaleString()} · {replay.steps.length} turns recorded
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => onWatchReplay(replay)}
                                    sx={{ fontWeight: 700 }}
                                >
                                    Watch
                                </Button>
                                <Tooltip title="Delete replay">
                                    <IconButton size="small" onClick={() => setReplays(deleteReplay(replay.date))}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Paper>
                        ))}
                    </Box>
                )}
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
