import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Tab,
    Tabs,
    Tooltip,
    InputAdornment,
    Menu,
    MenuItem,
    Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CatchingPokemonIcon from '@mui/icons-material/CatchingPokemon';
import { TYPE_EFFECTIVENESS } from '../data/typeChart';
import type { HeldItemId } from '../data/items';
import { HELD_ITEMS, HELD_ITEM_IDS } from '../data/items';
import type { Move } from '../data/moves';
import type { Pokemon, Team } from '../types/pokemon';
import type { PlayerProfile } from '../utils/progression';
import { availableHeldItems, getMonProgress, registerMonProgress } from '../utils/progression';
import { IV_STATS, MAX_IV_TOTAL, ivTotal, natureLabel } from '../data/natures';
import MoveManagerDialog from './MoveManagerDialog';

interface Props {
    pokemons: Pokemon[];
    getTypeColor: (type: string) => string;
    teams: Team[];
    onTeamsChange: (teams: Team[]) => void;
    profile: PlayerProfile;
    updateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

const MAX_TEAM_SIZE = 6;

interface TeamAnalysis {
    coverage: {
        superEffective: string[];
        notVeryEffective: string[];
        noEffect: string[];
    };
    weaknesses: {
        [key: string]: number;
    };
    suggestions: Pokemon[];
}

const TeamBuilder: React.FC<Props> = ({ pokemons, getTypeColor, teams, onTeamsChange, profile, updateProfile }) => {
    const [pokemonSearch, setPokemonSearch] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
    const [teamAnalysis, setTeamAnalysis] = useState<{ [key: string]: TeamAnalysis }>({});
    const [suggestionsAnchorEl, setSuggestionsAnchorEl] = useState<null | HTMLElement>(null);
    const [activeSuggestionTeam, setActiveSuggestionTeam] = useState<string | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    // Drag source: an available Pokémon, or a Box entry (boxIndex set)
    const [draggedPokemon, setDraggedPokemon] = useState<{ pokemon: Pokemon; boxIndex?: number } | null>(null);
    const [rightTab, setRightTab] = useState(0);
    const [boxMenu, setBoxMenu] = useState<{ anchor: HTMLElement; boxIndex: number } | null>(null);
    const [releaseIndex, setReleaseIndex] = useState<number | null>(null);
    const [movesFor, setMovesFor] = useState<Pokemon | null>(null);

    // Filter available Pokémon
    const filteredPokemons = React.useMemo(() => {
        return pokemons.filter(pokemon => {
            const matchesSearch = pokemon.name.toLowerCase().includes(pokemonSearch.toLowerCase());
            const matchesType = selectedTypeFilter === 'all' || pokemon.types.includes(selectedTypeFilter);
            return matchesSearch && matchesType;
        });
    }, [pokemons, pokemonSearch, selectedTypeFilter]);

    // Analyze team coverage and weaknesses
    const analyzeTeam = (team: Team): TeamAnalysis => {
        const coverage = {
            superEffective: [] as string[],
            notVeryEffective: [] as string[],
            noEffect: [] as string[],
        };
        const weaknesses: { [key: string]: number } = {};

        // Analyze coverage based on team's types
        team.pokemon.forEach(pokemon => {
            pokemon.types.forEach(type => {
                const typeData = TYPE_EFFECTIVENESS[type];
                coverage.superEffective.push(...typeData.superEffective);
                coverage.notVeryEffective.push(...typeData.notVeryEffective);
                coverage.noEffect.push(...typeData.noEffect);
            });
        });

        // Calculate team weaknesses
        Object.entries(TYPE_EFFECTIVENESS).forEach(([type, effectiveness]) => {
            let weaknessCount = 0;
            team.pokemon.forEach(pokemon => {
                pokemon.types.forEach(pokemonType => {
                    if (effectiveness.superEffective.includes(pokemonType)) {
                        weaknessCount++;
                    }
                });
            });
            if (weaknessCount > 0) {
                weaknesses[type] = weaknessCount;
            }
        });

        // Find suggested Pokémon to cover weaknesses
        const suggestions = pokemons.filter(pokemon => {
            if (team.pokemon.some(p => p.id === pokemon.id)) return false;

            let coverageScore = 0;
            pokemon.types.forEach(type => {
                Object.keys(weaknesses).forEach(weakness => {
                    if (TYPE_EFFECTIVENESS[type].superEffective.includes(weakness)) {
                        coverageScore++;
                    }
                });
            });
            return coverageScore > 0;
        }).sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            a.types.forEach(type => {
                Object.keys(weaknesses).forEach(weakness => {
                    if (TYPE_EFFECTIVENESS[type].superEffective.includes(weakness)) scoreA++;
                });
            });
            b.types.forEach(type => {
                Object.keys(weaknesses).forEach(weakness => {
                    if (TYPE_EFFECTIVENESS[type].superEffective.includes(weakness)) scoreB++;
                });
            });
            return scoreB - scoreA;
        }).slice(0, 5);

        return {
            coverage: {
                superEffective: Array.from(new Set(coverage.superEffective)),
                notVeryEffective: Array.from(new Set(coverage.notVeryEffective)),
                noEffect: Array.from(new Set(coverage.noEffect)),
            },
            weaknesses,
            suggestions,
        };
    };

    // Update analysis when teams change
    useEffect(() => {
        const newAnalysis: { [key: string]: TeamAnalysis } = {};
        teams.forEach(team => {
            if (team.pokemon.length > 0) {
                newAnalysis[team.id] = analyzeTeam(team);
            }
        });
        setTeamAnalysis(newAnalysis);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teams]);

    const handleCreateTeam = () => {
        if (newTeamName.trim()) {
            const newTeam: Team = {
                id: crypto.randomUUID(),
                name: newTeamName.trim(),
                pokemon: [],
            };
            onTeamsChange([...teams, newTeam]);
            setNewTeamName('');
            setIsTeamDialogOpen(false);
        }
    };

    const handleEditTeam = (team: Team) => {
        setEditingTeam(team);
        setNewTeamName(team.name);
        setIsTeamDialogOpen(true);
    };

    const handleUpdateTeam = () => {
        if (editingTeam && newTeamName.trim()) {
            const updatedTeams = teams.map(team =>
                team.id === editingTeam.id
                    ? { ...team, name: newTeamName.trim() }
                    : team
            );
            onTeamsChange(updatedTeams);
            setEditingTeam(null);
            setNewTeamName('');
            setIsTeamDialogOpen(false);
        }
    };

    const handleDeleteTeam = (teamId: string) => {
        onTeamsChange(teams.filter(team => team.id !== teamId));
    };

    const handleAddPokemon = (team: Team, pokemon: Pokemon) => {
        if (team.pokemon.length >= MAX_TEAM_SIZE) return;
        if (team.pokemon.some(p => p.id === pokemon.id)) return;

        const updatedTeams = teams.map(t =>
            t.id === team.id
                ? { ...t, pokemon: [...t.pokemon, pokemon] }
                : t
        );
        onTeamsChange(updatedTeams);
    };

    const handleRemovePokemon = (team: Team, pokemonId: number) => {
        const updatedTeams = teams.map(t =>
            t.id === team.id
                ? { ...t, pokemon: t.pokemon.filter(p => p.id !== pokemonId) }
                : t
        );
        onTeamsChange(updatedTeams);
    };

    const canJoinTeam = (team: Team, pokemonId: number) =>
        team.pokemon.length < MAX_TEAM_SIZE && !team.pokemon.some(p => p.id === pokemonId);

    // Move a Box entry into a team: add to the team, record progress
    // (level/shiny/elite), then remove the entry from the box.
    const handleAddFromBox = (team: Team, boxIndex: number) => {
        const entry = profile.box[boxIndex];
        if (!entry || !canJoinTeam(team, entry.pokemon.id)) return;
        handleAddPokemon(team, entry.pokemon);
        updateProfile(prev => ({
            ...registerMonProgress(prev, {
                id: entry.pokemon.id,
                level: entry.level,
                shiny: entry.shiny,
                elite: entry.elite,
            }),
            box: prev.box.filter((_, i) => i !== boxIndex),
        }));
    };

    const handleReleaseFromBox = (boxIndex: number) => {
        updateProfile(prev => ({ ...prev, box: prev.box.filter((_, i) => i !== boxIndex) }));
        setReleaseIndex(null);
    };

    const handleSaveCustomMoves = (pokemonId: number, moves: Move[] | null) => {
        updateProfile(prev => {
            const existing = prev.mons[pokemonId] ?? { xp: 0, level: 50 };
            return {
                ...prev,
                mons: {
                    ...prev.mons,
                    [pokemonId]: { ...existing, customMoves: moves ?? undefined },
                },
            };
        });
    };

    // Equip/unequip a held item on a species ('' clears it)
    const handleEquipHeldItem = (pokemonId: number, itemId: HeldItemId | '') => {
        updateProfile(prev => {
            const existing = prev.mons[pokemonId] ?? { xp: 0, level: 50 };
            return {
                ...prev,
                mons: {
                    ...prev.mons,
                    [pokemonId]: { ...existing, heldItem: itemId === '' ? undefined : itemId },
                },
            };
        });
    };

    // Held items the player owns at all (for the equip dropdown)
    const ownedHeldItems = HELD_ITEM_IDS.filter(id => (profile.heldItems[id] ?? 0) > 0);

    const handleDragStart = (pokemon: Pokemon, boxIndex?: number) => {
        setDraggedPokemon({ pokemon, boxIndex });
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
    };

    const handleDrop = (team: Team) => {
        if (!draggedPokemon) return;
        if (draggedPokemon.boxIndex !== undefined) {
            handleAddFromBox(team, draggedPokemon.boxIndex);
        } else {
            handleAddPokemon(team, draggedPokemon.pokemon);
        }
        setDraggedPokemon(null);
    };

    const handleQuickAdd = (pokemon: Pokemon) => {
        const target = teams.find(
            t => t.pokemon.length < MAX_TEAM_SIZE && !t.pokemon.some(p => p.id === pokemon.id)
        );
        if (target) {
            handleAddPokemon(target, pokemon);
        }
    };

    const handleExportTeams = () => {
        const teamsData = JSON.stringify(teams);
        const blob = new Blob([teamsData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokemon-teams.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportTeams = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedTeams = JSON.parse(e.target?.result as string);
                    onTeamsChange(importedTeams);
                } catch (error) {
                    console.error('Error importing teams:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Team Builder
                </Typography>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditingTeam(null);
                            setNewTeamName('');
                            setIsTeamDialogOpen(true);
                        }}
                    >
                        Create Team
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportTeams}
                    >
                        Export Teams
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<FileUploadIcon />}
                        component="label"
                    >
                        Import Teams
                        <input
                            type="file"
                            hidden
                            accept=".json"
                            onChange={handleImportTeams}
                        />
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={3}>
                        {teams.map(team => (
                            <Grid size={12} key={team.id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                    }}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(team)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                                {team.name}
                                            </Typography>
                                            <Box>
                                                <Tooltip title="Suggested Pokémon">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            setActiveSuggestionTeam(team.id);
                                                            setSuggestionsAnchorEl(e.currentTarget);
                                                        }}
                                                    >
                                                        <TipsAndUpdatesIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Rename team">
                                                    <IconButton size="small" onClick={() => handleEditTeam(team)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete team">
                                                    <IconButton size="small" onClick={() => handleDeleteTeam(team.id)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {team.pokemon.length} / {MAX_TEAM_SIZE} Pokémon
                                        </Typography>

                                        <Grid container spacing={1}>
                                            {team.pokemon.map(pokemon => {
                                                const progress = getMonProgress(profile, pokemon.id);
                                                return (
                                                <Grid size={{ xs: 4, sm: 2 }} key={pokemon.id}>
                                                    <Card
                                                        sx={{
                                                            position: 'relative',
                                                            '&:hover .remove-pokemon': {
                                                                opacity: 1,
                                                            },
                                                        }}
                                                    >
                                                        <IconButton
                                                            className="remove-pokemon"
                                                            size="small"
                                                            onClick={() => handleRemovePokemon(team, pokemon.id)}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                right: 0,
                                                                opacity: 0,
                                                                transition: 'opacity 0.2s',
                                                                zIndex: 1,
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                        <Chip
                                                            label={`Lv ${progress.level}`}
                                                            size="small"
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                left: 4,
                                                                height: 18,
                                                                fontSize: '0.6rem',
                                                                fontWeight: 700,
                                                                bgcolor: 'rgba(0,0,0,0.55)',
                                                                color: '#fff',
                                                            }}
                                                        />
                                                        <CardMedia
                                                            component="img"
                                                            image={pokemon.image}
                                                            alt={pokemon.name}
                                                            sx={{
                                                                height: 96,
                                                                objectFit: 'contain',
                                                                p: 1,
                                                            }}
                                                        />
                                                        <Box sx={{ p: 1 }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    textAlign: 'center',
                                                                    display: 'block',
                                                                    textTransform: 'capitalize',
                                                                }}
                                                            >
                                                                {progress.shiny ? '✨ ' : ''}{pokemon.name}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                {progress.elite && (
                                                                    <Chip
                                                                        label="ELITE"
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: '#ffd700',
                                                                            color: '#1a1a2e',
                                                                            fontSize: '0.6rem',
                                                                            height: 20,
                                                                            fontWeight: 700,
                                                                        }}
                                                                    />
                                                                )}
                                                                {pokemon.types.map(type => (
                                                                    <Chip
                                                                        key={type}
                                                                        label={type}
                                                                        size="small"
                                                                        sx={{
                                                                            backgroundColor: getTypeColor(type),
                                                                            color: 'white',
                                                                            fontSize: '0.6rem',
                                                                            height: 20,
                                                                            textTransform: 'capitalize',
                                                                        }}
                                                                    />
                                                                ))}
                                                                {progress.nature && (
                                                                    <Tooltip
                                                                        title={
                                                                            progress.ivs
                                                                                ? `IVs ${ivTotal(progress.ivs)}/${MAX_IV_TOTAL} · ${IV_STATS.map(
                                                                                    s => `${{ hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' }[s]} ${progress.ivs![s]}`
                                                                                ).join(' · ')}`
                                                                                : ''
                                                                        }
                                                                    >
                                                                        <Chip
                                                                            label={natureLabel(progress.nature)}
                                                                            size="small"
                                                                            sx={{
                                                                                fontSize: '0.6rem',
                                                                                height: 20,
                                                                                bgcolor: 'rgba(79, 142, 247, 0.18)',
                                                                                border: '1px solid rgba(79, 142, 247, 0.4)',
                                                                            }}
                                                                        />
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                            <Button
                                                                fullWidth
                                                                size="small"
                                                                variant="text"
                                                                onClick={() => setMovesFor(pokemon)}
                                                                sx={{ mt: 0.5, py: 0, fontSize: '0.65rem', minHeight: 0 }}
                                                            >
                                                                Moves{progress.customMoves?.length ? ' ★' : ''}
                                                            </Button>
                                                            {(ownedHeldItems.length > 0 || progress.heldItem) && (
                                                                <TextField
                                                                    select
                                                                    fullWidth
                                                                    size="small"
                                                                    variant="standard"
                                                                    value={progress.heldItem ?? ''}
                                                                    onChange={e => handleEquipHeldItem(pokemon.id, e.target.value as HeldItemId | '')}
                                                                    sx={{ mt: 0.5, '& .MuiInputBase-root': { fontSize: '0.65rem' } }}
                                                                    slotProps={{ select: { displayEmpty: true } }}
                                                                >
                                                                    <MenuItem value="">
                                                                        <em>No held item</em>
                                                                    </MenuItem>
                                                                    {HELD_ITEM_IDS.filter(
                                                                        id => id === progress.heldItem || availableHeldItems(profile, id) > 0
                                                                    ).map(id => (
                                                                        <MenuItem key={id} value={id}>
                                                                            {HELD_ITEMS[id].name}
                                                                            {id !== progress.heldItem ? ` (${availableHeldItems(profile, id)})` : ''}
                                                                        </MenuItem>
                                                                    ))}
                                                                </TextField>
                                                            )}
                                                        </Box>
                                                    </Card>
                                                </Grid>
                                                );
                                            })}
                                            {Array.from({ length: MAX_TEAM_SIZE - team.pokemon.length }).map((_, index) => (
                                                <Grid size={{ xs: 4, sm: 2 }} key={`empty-${index}`}>
                                                    <Card
                                                        sx={{
                                                            height: '100%',
                                                            minHeight: 140,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 0.5,
                                                            border: '1px dashed',
                                                            borderColor: 'divider',
                                                            backgroundColor: 'transparent',
                                                            boxShadow: 'none',
                                                        }}
                                                    >
                                                        <AddIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                                        <Typography variant="caption" color="text.disabled">
                                                            Empty slot
                                                        </Typography>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>

                                        {team.pokemon.length > 0 && teamAnalysis[team.id] && (
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    pt: 1.5,
                                                    borderTop: '1px solid',
                                                    borderColor: 'divider',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: 'error.main', fontWeight: 700, minWidth: 72 }}
                                                    >
                                                        Weak to
                                                    </Typography>
                                                    {Object.entries(teamAnalysis[team.id].weaknesses)
                                                        .sort(([, a], [, b]) => b - a)
                                                        .map(([type, count]) => (
                                                            <Tooltip key={type} title={`${count} Pokémon weak to ${type}`}>
                                                                <Chip
                                                                    label={`${type} ×${count}`}
                                                                    size="small"
                                                                    sx={{
                                                                        backgroundColor: getTypeColor(type),
                                                                        color: 'white',
                                                                        textTransform: 'capitalize',
                                                                        height: 20,
                                                                        fontSize: '0.65rem',
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        ))}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: 'success.main', fontWeight: 700, minWidth: 72 }}
                                                    >
                                                        Coverage
                                                    </Typography>
                                                    {teamAnalysis[team.id].coverage.superEffective.map(type => (
                                                        <Chip
                                                            key={type}
                                                            label={type}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getTypeColor(type),
                                                                color: 'white',
                                                                textTransform: 'capitalize',
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Tabs
                            value={rightTab}
                            onChange={(_, v: number) => setRightTab(v)}
                            sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
                        >
                            <Tab label="Available" />
                            <Tab
                                label={`Box (${profile.box.length})`}
                                icon={<CatchingPokemonIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                            />
                        </Tabs>
                        {rightTab === 0 && (
                        <>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search Pokémon..."
                                value={pokemonSearch}
                                onChange={(e) => setPokemonSearch(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Filter by Type"
                                value={selectedTypeFilter}
                                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Types</MenuItem>
                                {Object.keys(TYPE_EFFECTIVENESS).map(type => (
                                    <MenuItem key={type} value={type}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    backgroundColor: getTypeColor(type),
                                                }}
                                            />
                                            <Typography sx={{ textTransform: 'capitalize' }}>
                                                {type}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                            <Grid container spacing={1}>
                                {filteredPokemons.map(pokemon => (
                                    <Grid size={{ xs: 4, sm: 3, md: 4 }} key={pokemon.id}>
                                        <Card
                                            draggable
                                            onDragStart={() => handleDragStart(pokemon)}
                                            sx={{
                                                position: 'relative',
                                                cursor: 'grab',
                                                transition: 'border-color 0.2s',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                },
                                                '&:hover .quick-add': {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            <Tooltip title="Add to team">
                                                <IconButton
                                                    className="quick-add"
                                                    size="small"
                                                    onClick={() => handleQuickAdd(pokemon)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 2,
                                                        right: 2,
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                        zIndex: 1,
                                                        backgroundColor: 'rgba(79, 142, 247, 0.25)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(79, 142, 247, 0.45)',
                                                        },
                                                    }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <CardMedia
                                                component="img"
                                                image={pokemon.image}
                                                alt={pokemon.name}
                                                sx={{
                                                    height: 64,
                                                    objectFit: 'contain',
                                                    p: 0.5,
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                            <Box sx={{ px: 0.5, pb: 0.75 }}>
                                                <Typography
                                                    variant="caption"
                                                    noWrap
                                                    sx={{
                                                        textAlign: 'center',
                                                        display: 'block',
                                                        textTransform: 'capitalize',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {pokemon.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center', mt: 0.25 }}>
                                                    {pokemon.types.map(type => (
                                                        <Tooltip key={type} title={type} placement="top">
                                                            <Box
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: getTypeColor(type),
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                        </>
                        )}
                        {rightTab === 1 && (
                            <Box sx={{ maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
                                {profile.box.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
                                        Your Box is empty. Win battles to recruit wild Pokémon,
                                        then choose “Send to Box” to store them here.
                                    </Typography>
                                ) : (
                                    <Grid container spacing={1}>
                                        {profile.box.map((entry, boxIndex) => (
                                            <Grid size={{ xs: 6, sm: 4, md: 6 }} key={`box-${boxIndex}-${entry.pokemon.id}`}>
                                                <Card
                                                    draggable
                                                    onDragStart={() => handleDragStart(entry.pokemon, boxIndex)}
                                                    sx={{
                                                        position: 'relative',
                                                        cursor: 'grab',
                                                        border: entry.elite
                                                            ? '1px solid rgba(255, 215, 0, 0.5)'
                                                            : '1px solid transparent',
                                                    }}
                                                >
                                                    <CardMedia
                                                        component="img"
                                                        image={entry.pokemon.image}
                                                        alt={entry.pokemon.name}
                                                        sx={{ height: 72, objectFit: 'contain', p: 0.5, imageRendering: 'pixelated' }}
                                                    />
                                                    <Box sx={{ px: 1, pb: 1 }}>
                                                        <Typography
                                                            variant="caption"
                                                            noWrap
                                                            sx={{ display: 'block', textAlign: 'center', textTransform: 'capitalize', fontWeight: 600 }}
                                                        >
                                                            {entry.shiny ? '✨ ' : ''}{entry.pokemon.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap', my: 0.5 }}>
                                                            <Chip label={`Lv ${entry.level}`} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                                                            {entry.elite && (
                                                                <Chip label="ELITE" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#ffd700', color: '#1a1a2e' }} />
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ fontSize: '0.65rem', px: 1, py: 0, minWidth: 0 }}
                                                                disabled={teams.length === 0}
                                                                onClick={e => setBoxMenu({ anchor: e.currentTarget, boxIndex })}
                                                            >
                                                                Add to team
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                sx={{ fontSize: '0.65rem', px: 1, py: 0, minWidth: 0 }}
                                                                onClick={() => setReleaseIndex(boxIndex)}
                                                            >
                                                                Release
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Box → team picker */}
            <Menu
                anchorEl={boxMenu?.anchor ?? null}
                open={Boolean(boxMenu)}
                onClose={() => setBoxMenu(null)}
            >
                {boxMenu !== null && teams.map(team => {
                    const entry = profile.box[boxMenu.boxIndex];
                    const joinable = entry !== undefined && canJoinTeam(team, entry.pokemon.id);
                    return (
                        <MenuItem
                            key={team.id}
                            disabled={!joinable}
                            onClick={() => {
                                handleAddFromBox(team, boxMenu.boxIndex);
                                setBoxMenu(null);
                            }}
                        >
                            {team.name} ({team.pokemon.length}/{MAX_TEAM_SIZE})
                        </MenuItem>
                    );
                })}
            </Menu>

            {/* Moveset manager */}
            {movesFor && (
                <MoveManagerDialog
                    open
                    pokemon={movesFor}
                    currentCustom={getMonProgress(profile, movesFor.id).customMoves}
                    onSave={moves => handleSaveCustomMoves(movesFor.id, moves)}
                    onClose={() => setMovesFor(null)}
                    getTypeColor={getTypeColor}
                />
            )}

            {/* Release confirmation */}
            <Dialog open={releaseIndex !== null} onClose={() => setReleaseIndex(null)}>
                <DialogTitle>Release Pokémon?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {releaseIndex !== null && profile.box[releaseIndex]
                            ? `${profile.box[releaseIndex].pokemon.name.charAt(0).toUpperCase()}${profile.box[releaseIndex].pokemon.name.slice(1)} will be released back into the wild. This cannot be undone.`
                            : ''}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReleaseIndex(null)}>Keep</Button>
                    <Button color="error" variant="contained" onClick={() => releaseIndex !== null && handleReleaseFromBox(releaseIndex)}>
                        Release
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Team Suggestions Menu */}
            <Menu
                anchorEl={suggestionsAnchorEl}
                open={Boolean(suggestionsAnchorEl)}
                onClose={() => {
                    setSuggestionsAnchorEl(null);
                    setActiveSuggestionTeam(null);
                }}
            >
                <DialogTitle>Suggested Pokémon</DialogTitle>
                {activeSuggestionTeam && teamAnalysis[activeSuggestionTeam]?.suggestions.map(pokemon => (
                    <MenuItem
                        key={pokemon.id}
                        onClick={() => {
                            const team = teams.find(t => t.id === activeSuggestionTeam);
                            if (team) {
                                handleAddPokemon(team, pokemon);
                            }
                            setSuggestionsAnchorEl(null);
                            setActiveSuggestionTeam(null);
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CardMedia
                                component="img"
                                image={pokemon.image}
                                alt={pokemon.name}
                                sx={{ width: 40, height: 40, objectFit: 'contain' }}
                            />
                            <Typography sx={{ textTransform: 'capitalize' }}>
                                {pokemon.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                                {pokemon.types.map(type => (
                                    <Chip
                                        key={type}
                                        label={type}
                                        size="small"
                                        sx={{
                                            backgroundColor: getTypeColor(type),
                                            color: 'white',
                                            fontSize: '0.6rem',
                                            height: 20,
                                            textTransform: 'capitalize',
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </MenuItem>
                ))}
            </Menu>

            <Dialog
                open={isTeamDialogOpen}
                onClose={() => {
                    setIsTeamDialogOpen(false);
                    setEditingTeam(null);
                    setNewTeamName('');
                }}
            >
                <DialogTitle>
                    {editingTeam ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Team Name"
                        fullWidth
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setIsTeamDialogOpen(false);
                        setEditingTeam(null);
                        setNewTeamName('');
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                        variant="contained"
                        startIcon={<SaveIcon />}
                    >
                        {editingTeam ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamBuilder;