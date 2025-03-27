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

interface Pokemon {
    id: number;
    name: string;
    image: string;
    types: string[];
    height: number;
    weight: number;
    stats: {
        base_stat: number;
        stat: {
            name: string;
        };
    }[];
    abilities: {
        ability: {
            name: string;
        };
    }[];
}

interface Team {
    id: string;
    name: string;
    pokemon: Pokemon[];
}

interface Props {
    pokemons: Pokemon[];
    getTypeColor: (type: string) => string;
    teams: Team[];
    onTeamsChange: (teams: Team[]) => void;
}

const MAX_TEAM_SIZE = 6;

// Type effectiveness data
interface TypeEffectiveness {
    [key: string]: {
        superEffective: string[];
        notVeryEffective: string[];
        noEffect: string[];
    };
}

const TYPE_EFFECTIVENESS: TypeEffectiveness = {
    normal: {
        superEffective: [],
        notVeryEffective: ['rock', 'steel'],
        noEffect: ['ghost'],
    },
    fire: {
        superEffective: ['grass', 'ice', 'bug', 'steel'],
        notVeryEffective: ['fire', 'water', 'rock', 'dragon'],
        noEffect: [],
    },
    water: {
        superEffective: ['fire', 'ground', 'rock'],
        notVeryEffective: ['water', 'grass', 'dragon'],
        noEffect: [],
    },
    electric: {
        superEffective: ['water', 'flying'],
        notVeryEffective: ['electric', 'grass', 'dragon'],
        noEffect: ['ground'],
    },
    grass: {
        superEffective: ['water', 'ground', 'rock'],
        notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
        noEffect: [],
    },
    ice: {
        superEffective: ['grass', 'ground', 'flying', 'dragon'],
        notVeryEffective: ['fire', 'water', 'ice', 'steel'],
        noEffect: [],
    },
    fighting: {
        superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'],
        notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
        noEffect: ['ghost'],
    },
    poison: {
        superEffective: ['grass', 'fairy'],
        notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],
        noEffect: ['steel'],
    },
    ground: {
        superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'],
        notVeryEffective: ['grass', 'bug'],
        noEffect: ['flying'],
    },
    flying: {
        superEffective: ['grass', 'fighting', 'bug'],
        notVeryEffective: ['electric', 'rock', 'steel'],
        noEffect: [],
    },
    psychic: {
        superEffective: ['fighting', 'poison'],
        notVeryEffective: ['psychic', 'steel'],
        noEffect: ['dark'],
    },
    bug: {
        superEffective: ['grass', 'psychic', 'dark'],
        notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
        noEffect: [],
    },
    rock: {
        superEffective: ['fire', 'ice', 'flying', 'bug'],
        notVeryEffective: ['fighting', 'ground', 'steel'],
        noEffect: [],
    },
    ghost: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['dark'],
        noEffect: ['normal'],
    },
    dragon: {
        superEffective: ['dragon'],
        notVeryEffective: ['steel'],
        noEffect: ['fairy'],
    },
    dark: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['fighting', 'dark', 'fairy'],
        noEffect: [],
    },
    steel: {
        superEffective: ['ice', 'rock', 'fairy'],
        notVeryEffective: ['fire', 'water', 'electric', 'steel'],
        noEffect: [],
    },
    fairy: {
        superEffective: ['fighting', 'dragon', 'dark'],
        notVeryEffective: ['fire', 'poison', 'steel'],
        noEffect: [],
    },
};

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

const TeamBuilder: React.FC<Props> = ({ pokemons, getTypeColor, teams, onTeamsChange }) => {
    const [pokemonSearch, setPokemonSearch] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
    const [teamAnalysis, setTeamAnalysis] = useState<{ [key: string]: TeamAnalysis }>({});
    const [suggestionsAnchorEl, setSuggestionsAnchorEl] = useState<null | HTMLElement>(null);
    const [activeSuggestionTeam, setActiveSuggestionTeam] = useState<string | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [draggedPokemon, setDraggedPokemon] = useState<Pokemon | null>(null);

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

    const handleDragStart = (pokemon: Pokemon) => {
        setDraggedPokemon(pokemon);
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
    };

    const handleDrop = (team: Team) => {
        if (draggedPokemon) {
            handleAddPokemon(team, draggedPokemon);
            setDraggedPokemon(null);
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                    Team Builder
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
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
                <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                        {teams.map(team => (
                            <Grid item xs={12} key={team.id}>
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
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        setActiveSuggestionTeam(team.id);
                                                        setSuggestionsAnchorEl(e.currentTarget);
                                                    }}
                                                >
                                                    <TipsAndUpdatesIcon />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleEditTeam(team)}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteTeam(team.id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {team.pokemon.length} / {MAX_TEAM_SIZE} Pokémon
                                        </Typography>

                                        <Grid container spacing={1}>
                                            {team.pokemon.map(pokemon => (
                                                <Grid item xs={4} sm={2} key={pokemon.id}>
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
                                                                {pokemon.name}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                                                    </Card>
                                                </Grid>
                                            ))}
                                            {Array.from({ length: MAX_TEAM_SIZE - team.pokemon.length }).map((_, index) => (
                                                <Grid item xs={4} sm={2} key={`empty-${index}`}>
                                                    <Card
                                                        sx={{
                                                            height: '100%',
                                                            minHeight: 140,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: 'action.hover',
                                                        }}
                                                    >
                                                        <Typography color="text.secondary">
                                                            Empty
                                                        </Typography>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>

                                        {team.pokemon.length > 0 && teamAnalysis[team.id] && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Team Analysis:
                                                </Typography>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="body2" color="error">
                                                        Weaknesses:
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {Object.entries(teamAnalysis[team.id].weaknesses).map(([type, count]) => (
                                                            <Tooltip key={type} title={`${count} Pokémon weak to ${type}`}>
                                                                <Chip
                                                                    label={`${type} (${count})`}
                                                                    size="small"
                                                                    sx={{
                                                                        backgroundColor: getTypeColor(type),
                                                                        color: 'white',
                                                                        textTransform: 'capitalize',
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        ))}
                                                    </Box>
                                                </Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="body2" color="success.main">
                                                        Coverage:
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {teamAnalysis[team.id].coverage.superEffective.map(type => (
                                                            <Chip
                                                                key={type}
                                                                label={type}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: getTypeColor(type),
                                                                    color: 'white',
                                                                    textTransform: 'capitalize',
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Available Pokémon
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search Pokémon..."
                                value={pokemonSearch}
                                onChange={(e) => setPokemonSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
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
                                    <Grid item xs={4} sm={3} md={6} key={pokemon.id}>
                                        <Card
                                            draggable
                                            onDragStart={() => handleDragStart(pokemon)}
                                            sx={{
                                                cursor: 'grab',
                                                '&:hover': {
                                                    transform: 'scale(1.05)',
                                                    transition: 'transform 0.2s',
                                                },
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={pokemon.image}
                                                alt={pokemon.name}
                                                sx={{
                                                    height: 80,
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
                                                    {pokemon.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

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