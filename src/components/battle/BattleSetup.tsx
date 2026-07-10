import React, { useMemo } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import { motion } from 'framer-motion';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupsIcon from '@mui/icons-material/Groups';
import type { Pokemon, Team } from '../../types/pokemon';
import type { AIDifficulty, AIPersonality } from '../../utils/battleAI';
import type { PlayerRecords } from '../../utils/progression';
import { getMonProgress, type PlayerProfile } from '../../utils/progression';
import { getBattleSprites, localStaticSprite } from '../../utils/spriteSources';
import { surface } from '../../theme';
import { backdropSx } from './battleUi';

export const RANDOM_ID = '__random__';

interface BattleSetupProps {
    teams: Team[];
    pokemons: Pokemon[];
    profile: PlayerProfile;
    team1Id: string;
    team2Id: string;
    onTeam1Change: (id: string) => void;
    onTeam2Change: (id: string) => void;
    aiDifficulty: AIDifficulty;
    aiPersonality: AIPersonality;
    onDifficultyChange: (d: AIDifficulty) => void;
    onPersonalityChange: (p: AIPersonality) => void;
    randomTeam2: Team | null;
    onRandomOpponent: () => void;
    onStartBattle: () => void;
    /** True while movesets are being fetched — disables the start buttons. */
    starting?: boolean;
    /** Who controls team 2: the AI or a second player at the same keyboard. */
    opponentKind: 'ai' | 'human';
    onOpponentKindChange: (kind: 'ai' | 'human') => void;
    /** Extra mode cards / actions rendered below the standard controls. */
    children?: React.ReactNode;
    /** Rendered even when no teams exist yet (the Journey onboards new players). */
    journeyCard?: React.ReactNode;
}

/** Record chips, rendered inline in the header banner (no card shell). */
const RecordChips: React.FC<{ records: PlayerRecords }> = ({ records }) => (
    <>
        <Chip size="small" label={`${records.wins}W – ${records.losses}L`} sx={{ fontWeight: 700 }} />
        {records.currentStreak > 0 && (
            <Chip
                size="small"
                icon={<LocalFireDepartmentIcon sx={{ fontSize: 15 }} />}
                label={`${records.currentStreak} win streak`}
                sx={{ bgcolor: 'rgba(255, 87, 34, 0.15)', color: '#ff8a65', fontWeight: 700, '& .MuiChip-icon': { color: '#ff8a65' } }}
            />
        )}
        {records.bestStreak > 0 && (
            <Chip size="small" label={`Best streak: ${records.bestStreak}`} sx={{ fontWeight: 700 }} />
        )}
        {records.gauntletBestStage > 0 && (
            <Chip
                size="small"
                icon={<EmojiEventsIcon sx={{ fontSize: 15 }} />}
                label={`Gauntlet best: stage ${records.gauntletBestStage}`}
                sx={{ bgcolor: 'rgba(255, 215, 0, 0.12)', color: '#ffd700', fontWeight: 700, '& .MuiChip-icon': { color: '#ffd700' } }}
            />
        )}
    </>
);

/** Translucent glass panel used for the two team pickers inside the hero. */
const heroPanelSx = {
    p: 2.5,
    flex: 1,
    minWidth: 280,
    bgcolor: alpha('#0b0f1a', 0.55),
    backdropFilter: 'blur(4px)',
    border: `1px solid ${surface.border}`,
} as const;

const BattleSetup: React.FC<BattleSetupProps> = ({
    teams,
    pokemons,
    profile,
    team1Id,
    team2Id,
    onTeam1Change,
    onTeam2Change,
    aiDifficulty,
    aiPersonality,
    onDifficultyChange,
    onPersonalityChange,
    randomTeam2,
    onRandomOpponent,
    onStartBattle,
    starting = false,
    opponentKind,
    onOpponentKindChange,
    children,
    journeyCard,
}) => {
    const selectableTeams = useMemo(() => teams.filter(t => t.pokemon.length > 0), [teams]);
    const team1 = selectableTeams.find(t => t.id === team1Id);
    const team2 = team2Id === RANDOM_ID ? randomTeam2 ?? undefined : selectableTeams.find(t => t.id === team2Id);

    // One-shot artwork fallback. The guard must be data-driven: React's
    // synthetic onError keeps firing regardless of img.onerror, and
    // re-setting src to the same failing URL restarts the load — an
    // infinite request loop.
    const artworkFallback = (p: Pokemon) => (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.target as HTMLImageElement;
        if (img.dataset.fellBack) return;
        img.dataset.fellBack = '1';
        img.src = localStaticSprite(p.id, 'front') ?? p.image;
    };

    const monTile = (p: Pokemon, size: number, showLevel: boolean, accent?: string) => (
        <Box key={p.id} sx={{ textAlign: 'center' }}>
            <Box
                sx={{
                    width: size,
                    height: size,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: accent ? alpha(accent, 0.45) : 'divider',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src={getBattleSprites(p.id).artwork}
                    alt={p.name}
                    onError={artworkFallback(p)}
                    style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                />
            </Box>
            {showLevel && (
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                    Lv {getMonProgress(profile, p.id).level}
                </Typography>
            )}
        </Box>
    );

    // Match-up preview: the lead mon gets hero treatment, the bench sits beside it
    const renderPreview = (team: Team | undefined, showLevels: boolean, accent: string) => (
        <Box sx={{ display: 'flex', gap: 1, mt: 2, minHeight: 96, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {team && team.pokemon.length > 0 ? (
                <>
                    {monTile(team.pokemon[0], 88, showLevels, accent)}
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'flex-end', pb: showLevels ? 2 : 0 }}>
                        {team.pokemon.slice(1, 6).map(p => monTile(p, 44, false))}
                    </Box>
                </>
            ) : (
                <Typography variant="caption" color="text.secondary">
                    Select a team to preview
                </Typography>
            )}
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960, mx: 'auto' }}>
            {/* Header banner: title + live record strip */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2.5 }}
            >
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
                    <SportsMmaIcon fontSize="large" color="primary" /> Battle
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <RecordChips records={profile.records} />
                </Box>
            </Box>
            {selectableTeams.length < 1 ? (
                <Stack spacing={3}>
                    {journeyCard}
                    <Typography color="text.secondary">
                        Or create a team with Pokémon in the Team Builder to jump straight into a battle.
                    </Typography>
                </Stack>
            ) : (
                <Stack spacing={3}>
                    {/* Hero match-up builder */}
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.06 }}
                        sx={{ ...backdropSx('city'), p: { xs: 2, md: 3 }, border: `1px solid ${surface.border}` }}
                    >
                    <Typography
                        variant="overline"
                        sx={{ letterSpacing: '0.12em', color: 'primary.main', fontWeight: 800, display: 'block', mb: 1.5 }}
                    >
                        Next Match
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                        <Paper elevation={0} sx={heroPanelSx}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                Your Team
                            </Typography>
                            <FormControl fullWidth size="small">
                                <InputLabel>Your Team</InputLabel>
                                <Select value={team1Id} label="Your Team" onChange={e => onTeam1Change(e.target.value)}>
                                    {selectableTeams.map(team => (
                                        <MenuItem key={team.id} value={team.id}>
                                            {team.name} ({team.pokemon.length} Pokémon)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {renderPreview(team1, true, '#4f8ef7')}
                        </Paper>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                px: { xs: 0, md: 1 },
                                width: { xs: '100%', md: 'auto' },
                            }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    lineHeight: 1,
                                    backgroundImage: 'linear-gradient(135deg, #4f8ef7 0%, #8b7cf7 100%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                VS
                            </Typography>
                        </Box>
                        <Paper elevation={0} sx={heroPanelSx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main' }}>
                                    {opponentKind === 'ai' ? 'Opponent (AI)' : 'Opponent (Player 2)'}
                                </Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={opponentKind}
                                    onChange={(_, v: 'ai' | 'human' | null) => v && onOpponentKindChange(v)}
                                    sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1.5, fontSize: '0.75rem' } }}
                                >
                                    <ToggleButton value="ai">
                                        <SmartToyIcon sx={{ fontSize: 16, mr: 0.5 }} /> AI
                                    </ToggleButton>
                                    <ToggleButton value="human">
                                        <GroupsIcon sx={{ fontSize: 16, mr: 0.5 }} /> Hotseat
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Opponent Team</InputLabel>
                                    <Select value={team2Id} label="Opponent Team" onChange={e => onTeam2Change(e.target.value)}>
                                        {team2Id === RANDOM_ID && (
                                            <MenuItem value={RANDOM_ID}>Random Team</MenuItem>
                                        )}
                                        {selectableTeams.map(team => (
                                            <MenuItem key={team.id} value={team.id}>
                                                {team.name} ({team.pokemon.length} Pokémon)
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Tooltip title="Generate a random opponent team">
                                    <span>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={onRandomOpponent}
                                            disabled={pokemons.length === 0}
                                            startIcon={<ShuffleIcon />}
                                            sx={{ whiteSpace: 'nowrap', height: '100%' }}
                                        >
                                            Random
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>
                            {renderPreview(team2, opponentKind === 'human', '#f87171')}
                            {opponentKind === 'ai' ? (
                                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Difficulty</InputLabel>
                                        <Select value={aiDifficulty} label="Difficulty" onChange={e => onDifficultyChange(e.target.value as AIDifficulty)}>
                                            <MenuItem value="beginner">Beginner</MenuItem>
                                            <MenuItem value="intermediate">Intermediate</MenuItem>
                                            <MenuItem value="expert">Expert</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Personality</InputLabel>
                                        <Select value={aiPersonality} label="Personality" onChange={e => onPersonalityChange(e.target.value as AIPersonality)}>
                                            <MenuItem value="aggressive">Aggressive</MenuItem>
                                            <MenuItem value="defensive">Defensive</MenuItem>
                                            <MenuItem value="balanced">Balanced</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                                    Two players share this screen and take turns. Friendly match — no XP,
                                    items or recruits are at stake.
                                </Typography>
                            )}
                        </Paper>
                    </Box>
                    {/* Dominant CTA lives inside the hero */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
                        <Button
                            component={motion.button}
                            whileHover={{ scale: 1.02 }}
                            variant="contained"
                            size="large"
                            disabled={starting || !team1Id || !team2Id || (team2Id === RANDOM_ID && !randomTeam2)}
                            onClick={onStartBattle}
                            startIcon={starting ? <CircularProgress size={18} color="inherit" /> : <SportsMmaIcon />}
                            sx={{ px: { md: 8 }, py: 1.25, fontSize: '1.05rem', width: { xs: '100%', md: 'auto' } }}
                        >
                            {starting ? 'Preparing…' : 'Start Battle'}
                        </Button>
                    </Box>
                    </Paper>

                    {/* Game modes grid */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.12 }}
                    >
                        <Typography
                            variant="overline"
                            sx={{ letterSpacing: '0.12em', color: 'text.secondary', fontWeight: 800, display: 'block', mb: 1 }}
                        >
                            Game Modes
                        </Typography>
                        <Box
                            sx={{
                                // 6-col grid: wide tiles span the row, small tiles sit 3-across on md
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' },
                                alignItems: 'stretch',
                            }}
                        >
                            {journeyCard}
                            {children}
                        </Box>
                    </Box>
                </Stack>
            )}
        </Box>
    );
};

export default BattleSetup;
