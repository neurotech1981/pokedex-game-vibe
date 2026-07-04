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
} from '@mui/material';
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
import { getBattleSprites } from '../../utils/spriteSources';

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
}

const RecordsCard: React.FC<{ records: PlayerRecords }> = ({ records }) => (
    <Paper sx={{ p: 2, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Trainer Record
        </Typography>
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
    </Paper>
);

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
}) => {
    const selectableTeams = useMemo(() => teams.filter(t => t.pokemon.length > 0), [teams]);
    const team1 = selectableTeams.find(t => t.id === team1Id);
    const team2 = team2Id === RANDOM_ID ? randomTeam2 ?? undefined : selectableTeams.find(t => t.id === team2Id);

    const renderPreview = (team: Team | undefined, showLevels: boolean) => (
        <Box sx={{ display: 'flex', gap: 1, mt: 2, minHeight: 64, alignItems: 'center', flexWrap: 'wrap' }}>
            {team ? (
                team.pokemon.slice(0, 6).map(p => (
                    <Box key={p.id} sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <img
                                src={getBattleSprites(p.id).artwork}
                                alt={p.name}
                                onError={e => { (e.target as HTMLImageElement).src = p.image; }}
                                style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                            />
                        </Box>
                        {showLevels && (
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                Lv {getMonProgress(profile, p.id).level}
                            </Typography>
                        )}
                    </Box>
                ))
            ) : (
                <Typography variant="caption" color="text.secondary">
                    Select a team to preview
                </Typography>
            )}
        </Box>
    );

    return (
        <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                <SportsMmaIcon fontSize="large" color="primary" /> Battle Simulator
            </Typography>
            {selectableTeams.length < 1 ? (
                <Typography color="text.secondary">
                    Create at least one team with Pokémon in the Team Builder to start a battle.
                </Typography>
            ) : (
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <RecordsCard records={profile.records} />
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                        <Paper sx={{ p: 2.5, flex: 1, minWidth: 280 }}>
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
                            {renderPreview(team1, true)}
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
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    backgroundImage: 'linear-gradient(135deg, #4f8ef7 0%, #8b7cf7 100%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                VS
                            </Typography>
                        </Box>
                        <Paper sx={{ p: 2.5, flex: 1, minWidth: 280 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main' }}>
                                    {opponentKind === 'ai' ? 'Opponent (AI)' : 'Opponent (Player 2)'}
                                </Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={opponentKind}
                                    onChange={(_, v: 'ai' | 'human' | null) => v && onOpponentKindChange(v)}
                                    sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, fontSize: '0.7rem' } }}
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
                            {renderPreview(team2, opponentKind === 'human')}
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
                    <Button
                        variant="contained"
                        size="large"
                        disabled={starting || !team1Id || !team2Id || (team2Id === RANDOM_ID && !randomTeam2)}
                        onClick={onStartBattle}
                        startIcon={starting ? <CircularProgress size={18} color="inherit" /> : <SportsMmaIcon />}
                        sx={{ alignSelf: 'center', px: 6 }}
                    >
                        {starting ? 'Preparing…' : 'Start Battle'}
                    </Button>
                    {children}
                </Stack>
            )}
        </Box>
    );
};

export default BattleSetup;
