import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    CircularProgress,
    Container,
    Paper,
    LinearProgress,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Modal,
    Fade,
    Backdrop,
    Tabs,
    Tab,
    Chip,
    Divider,
    SpeedDial,
    SpeedDialIcon,
    SpeedDialAction,
    Snackbar,
    Alert,
    ToggleButton,
    IconButton
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import TypeEffectiveness from './TypeEffectiveness';
import TeamBuilder from './TeamBuilder';
import BattleSimulator from './BattleSimulator';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

interface PokemonStat {
    base_stat: number;
    stat: {
        name: string;
    };
}

interface PokemonAbility {
    ability: {
        name: string;
    };
}

interface Pokemon {
    id: number;
    name: string;
    image: string;
    types: string[];
    height: number;
    weight: number;
    stats: PokemonStat[];
    abilities: PokemonAbility[];
    is_legendary?: boolean;
    is_mythical?: boolean;
}

interface PokemonType {
    type: {
        name: string;
    };
}

interface PokemonDetails {
    id: number;
    name: string;
    sprites: {
        front_default: string;
    };
    types: PokemonType[];
    height: number;
    weight: number;
    stats: PokemonStat[];
    abilities: PokemonAbility[];
}

interface PokemonListResponse {
    results: Array<{
        name: string;
        url: string;
    }>;
}

interface EvolutionChain {
    evolves_to: EvolutionChain[];
    species: {
        name: string;
        url: string;
    };
    evolution_details?: Array<{
        trigger: {
            name: string;
        };
        min_level?: number;
        item?: {
            name: string;
        };
    }>;
    pokemon?: {
        name: string;
        sprites: {
            front_default: string;
        };
        types: Array<{
            type: {
                name: string;
            };
        }>;
    };
}

interface EvolutionResponse {
    chain: EvolutionChain;
}

interface PokemonForm {
    name: string;
    sprites: {
        front_default: string;
        front_shiny?: string;
    };
    types: Array<{
        type: {
            name: string;
        };
    }>;
}

type SortField = 'name' | 'height' | 'weight' | 'hp' | 'attack' | 'defense' | 'speed' | 'type';
type SortOrder = 'asc' | 'desc';

interface Team {
    id: string;
    name: string;
    pokemon: Pokemon[];
}

// Type effectiveness data
const TYPE_EFFECTIVENESS = {
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

// Add API functions
const fetchPokemonDetails = async (id: number) => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await response.json();
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const speciesData = await speciesResponse.json();

    return {
        id: data.id,
        name: data.name,
        image: data.sprites.front_default,
        types: data.types.map((type: any) => type.type.name),
        height: data.height / 10,
        weight: data.weight / 10,
        stats: data.stats,
        abilities: data.abilities,
        is_legendary: speciesData.is_legendary,
        is_mythical: speciesData.is_mythical,
    };
};

const fetchPokemonList = async ({ pageParam = 1 }) => {
    const limit = 20; // Reduced from 151 to 20 for better performance
    const offset = (pageParam - 1) * limit;
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    // Fetch basic details for each Pokemon
    const pokemonDetails = await Promise.all(
        data.results.map(async (pokemon: any) => {
            const id = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
            const detailsResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const details = await detailsResponse.json();

            // Only fetch species data for special Pokemon
            const isSpecial = id <= 151 || id >= 144; // First gen + legendaries
            let is_legendary = false;
            let is_mythical = false;

            if (isSpecial) {
                const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
                const speciesData = await speciesResponse.json();
                is_legendary = speciesData.is_legendary;
                is_mythical = speciesData.is_mythical;
            }

            return {
                id: details.id,
                name: details.name,
                image: details.sprites.front_default,
                types: details.types.map((type: any) => type.type.name),
                height: details.height / 10,
                weight: details.weight / 10,
                stats: details.stats,
                abilities: details.abilities,
                is_legendary,
                is_mythical,
            };
        })
    );

    return {
        pokemons: pokemonDetails,
        nextPage: data.next ? pageParam + 1 : undefined,
    };
};

const fetchSpecialPokemon = async () => {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const data = await response.json();

    const specialPokemon = await Promise.all(
        data.results.map(async (pokemon: any) => {
            const id = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
            const details = await fetchPokemonDetails(id);
            return details.is_legendary || details.is_mythical ? details : null;
        })
    );

    return specialPokemon.filter((p): p is Pokemon => p !== null);
};

const Pokemon: React.FC = () => {
    const [pokemons, setPokemons] = useState<Pokemon[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
    const [evolutionChain, setEvolutionChain] = useState<EvolutionChain | null>(null);
    const [pokemonForms, setPokemonForms] = useState<PokemonForm[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [compareList, setCompareList] = useState<Pokemon[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [selectedTypesForCalculator, setSelectedTypesForCalculator] = useState<string[]>([]);
    const observer = useRef<IntersectionObserver>();
    const POKEMONS_PER_PAGE = 151;
    const [mainTab, setMainTab] = useState(0);
    const [teams, setTeams] = useState<Team[]>(() => {
        const savedTeams = localStorage.getItem('pokemonTeams');
        return savedTeams ? JSON.parse(savedTeams) : [];
    });
    const [showLegendaries, setShowLegendaries] = useState(false);
    const [showMythicals, setShowMythicals] = useState(false);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
    const queryClient = useQueryClient();

    // Use React Query for Pokemon list with infinite scroll
    const {
        data: pokemonData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['pokemons', debouncedSearchTerm, selectedType],
        queryFn: fetchPokemonList,
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 1,
        maxPages: 10, // Limit the number of pages to prevent excessive data loading
    });

    // Use React Query for special Pokemon with longer cache time
    const { data: specialPokemon } = useQuery({
        queryKey: ['specialPokemon'],
        queryFn: fetchSpecialPokemon,
        enabled: showLegendaries || showMythicals,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    const lastPokemonRef = useCallback((node: HTMLDivElement) => {
        if (isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    const fetchPokemons = async (pageNum: number) => {
        try {
            const offset = (pageNum - 1) * POKEMONS_PER_PAGE;
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${POKEMONS_PER_PAGE}&offset=${offset}`);
            const data: PokemonListResponse = await response.json();

            if (data.results.length === 0) {
                setHasMore(false);
                return;
            }

            const pokemonDetails = await Promise.all(
                data.results.map(async (pokemon) => {
                    try {
                        const detailsResponse = await fetch(pokemon.url);
                        const details: PokemonDetails = await detailsResponse.json();

                        // Fetch species data to get legendary status
                        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${details.id}`);
                        const speciesData = await speciesResponse.json();

                        // Debug logging for legendary/mythical status
                        if (speciesData.is_legendary || speciesData.is_mythical) {
                            console.log(`Found special Pokemon: ${details.name}`, {
                                is_legendary: speciesData.is_legendary,
                                is_mythical: speciesData.is_mythical
                            });
                        }

                        return {
                            id: details.id,
                            name: details.name,
                            image: details.sprites.front_default,
                            types: details.types.map((type) => type.type.name),
                            height: details.height / 10,
                            weight: details.weight / 10,
                            stats: details.stats,
                            abilities: details.abilities,
                            is_legendary: speciesData.is_legendary,
                            is_mythical: speciesData.is_mythical,
                        };
                    } catch (error) {
                        console.error(`Error fetching Pokemon ${pokemon.name}:`, error);
                        return null;
                    }
                })
            );

            // Filter out any failed fetches
            const validPokemon = pokemonDetails.filter((p): p is NonNullable<typeof p> => p !== null);

            setPokemons(prev => {
                const existingPokemon = new Map(prev.map(p => [p.id, p]));
                validPokemon.forEach(pokemon => {
                    if (!existingPokemon.has(pokemon.id)) {
                        existingPokemon.set(pokemon.id, pokemon);
                    }
                });
                return Array.from(existingPokemon.values()).sort((a, b) => a.id - b.id);
            });

            // Debug logging for current Pokemon list
            console.log('Current Pokemon list:', pokemons.map(p => ({
                name: p.name,
                is_legendary: p.is_legendary,
                is_mythical: p.is_mythical
            })));
        } catch (err) {
            setError('Failed to fetch Pokemon data');
            console.error('Error fetching Pokemon:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPokemons(page);
    }, [page]);

    // Update the filteredPokemons memo
    const filteredPokemons = React.useMemo(() => {
        let filtered = pokemonData?.pages.flatMap(page => page.pokemons) || [];

        // Apply filters
        if (showFavoritesOnly) {
            filtered = filtered.filter(pokemon => favorites.has(pokemon.id));
        }

        if (debouncedSearchTerm) {
            filtered = filtered.filter(pokemon =>
                pokemon.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            );
        }

        // Update type filtering to handle multiple types
        if (selectedType !== 'all') {
            filtered = filtered.filter(pokemon =>
                pokemon.types.some((type: string) => type === selectedType)
            );
        }

        if (showLegendaries || showMythicals) {
            filtered = specialPokemon || [];
            if (showLegendaries) {
                filtered = filtered.filter(pokemon => pokemon.is_legendary);
            }
            if (showMythicals) {
                filtered = filtered.filter(pokemon => pokemon.is_mythical);
            }
        }

        // Apply sorting with improved type handling
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'height':
                    comparison = a.height - b.height;
                    break;
                case 'weight':
                    comparison = a.weight - b.weight;
                    break;
                case 'hp':
                    comparison = (a.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'hp')?.base_stat || 0) -
                                (b.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'hp')?.base_stat || 0);
                    break;
                case 'attack':
                    comparison = (a.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'attack')?.base_stat || 0) -
                                (b.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'attack')?.base_stat || 0);
                    break;
                case 'defense':
                    comparison = (a.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'defense')?.base_stat || 0) -
                                (b.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'defense')?.base_stat || 0);
                    break;
                case 'speed':
                    comparison = (a.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'speed')?.base_stat || 0) -
                                (b.stats.find((s: { stat: { name: string; }; }) => s.stat.name === 'speed')?.base_stat || 0);
                    break;
                case 'type':
                    // Sort by primary type first, then secondary type if available
                    const typeA = a.types[0];
                    const typeB = b.types[0];
                    comparison = typeA.localeCompare(typeB);
                    if (comparison === 0 && a.types[1] && b.types[1]) {
                        comparison = a.types[1].localeCompare(b.types[1]);
                    }
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [pokemonData, debouncedSearchTerm, selectedType, sortField, sortOrder, favorites, showFavoritesOnly, showLegendaries, showMythicals, specialPokemon]);

    // Get unique types for filter

    const fetchEvolutionChain = async (speciesUrl: string) => {
        try {
            const response = await fetch(speciesUrl);
            const speciesData = await response.json();

            if (!speciesData.evolution_chain?.url) {
                console.log('No evolution chain found for this Pokemon');
                setEvolutionChain(null);
                return;
            }

            const evolutionResponse = await fetch(speciesData.evolution_chain.url);
            const evolutionData: EvolutionResponse = await evolutionResponse.json();

            // Fetch additional details for each Pokemon in the chain
            const fetchPokemonDetails = async (chain: EvolutionChain) => {
                try {
                    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${chain.species.name}`);
                    const data = await response.json();
                    return {
                        ...chain,
                        pokemon: {
                            name: data.name,
                            sprites: data.sprites,
                            types: data.types,
                        }
                    };
                } catch (error) {
                    console.error('Error fetching Pokemon details:', error);
                    return chain;
                }
            };

            const processChain = async (chain: EvolutionChain): Promise<EvolutionChain> => {
                const details = await fetchPokemonDetails(chain);
                const evolvesTo = await Promise.all(chain.evolves_to.map(processChain));
                return { ...details, evolves_to: evolvesTo };
            };

            const processedChain = await processChain(evolutionData.chain);
            setEvolutionChain(processedChain);
        } catch (error) {
            console.error('Error fetching evolution chain:', error);
            setEvolutionChain(null);
        }
    };

    const fetchPokemonForms = async (pokemonId: number) => {
        try {
            // First get the species data
            const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
            const speciesData = await speciesResponse.json();

            // Get all varieties
            const varieties = speciesData.varieties || [];

            // Fetch details for each variety
            const formDetails = await Promise.all(
                varieties.map(async (variety: any) => {
                    try {
                        const response = await fetch(variety.pokemon.url);
                        const data = await response.json();
                        return {
                            name: data.name,
                            sprites: {
                                front_default: data.sprites.front_default,
                                front_shiny: data.sprites.front_shiny,
                                back_default: data.sprites.back_default,
                                back_shiny: data.sprites.back_shiny,
                            },
                            types: data.types,
                            stats: data.stats,
                            is_default: variety.is_default,
                        };
                    } catch (error) {
                        console.error('Error fetching form details:', error);
                        return null;
                    }
                })
            );

            // Filter out any failed fetches and sort to put default form first
            const validForms = formDetails
                .filter((form): form is NonNullable<typeof form> => form !== null)
                .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

            setPokemonForms(validForms);
        } catch (error) {
            console.error('Error fetching Pokemon forms:', error);
            setPokemonForms([]);
        }
    };

    const handlePokemonClick = async (pokemon: Pokemon) => {
        setSelectedPokemon(pokemon);
        setActiveTab(0);
        // Fetch species URL to get evolution chain
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`);
        const speciesData = await speciesResponse.json();
        await fetchEvolutionChain(speciesData.evolution_chain.url);
        await fetchPokemonForms(pokemon.id);
    };

    const renderEvolutionChain = (chain: EvolutionChain, parentKey: string = '') => {
        const currentKey = `${parentKey}-${chain.species.name}`;

        return (
            <Box key={currentKey} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CardMedia
                        component="img"
                        image={chain.pokemon?.sprites.front_default}
                        alt={chain.species.name}
                        sx={{ width: 80, height: 80, objectFit: 'contain' }}
                    />
                    <Box>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {chain.species.name}
                        </Typography>
                        {chain.evolution_details && chain.evolution_details.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                {chain.evolution_details.map((detail, _index) => {
                                    const trigger = detail.trigger.name.replace('-', ' ');
                                    const level = detail.min_level ? ` at level ${detail.min_level}` : '';
                                    const item = detail.item ? ` using ${detail.item.name.replace('-', ' ')}` : '';
                                    return `${trigger}${level}${item}`;
                                }).join(' or ')}
                            </Typography>
                        )}
                        {chain.pokemon?.types && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                {chain.pokemon.types.map((type: any) => (
                                    <Chip
                                        key={type.type.name}
                                        label={type.type.name}
                                        size="small"
                                        sx={{
                                            backgroundColor: getTypeColor(type.type.name),
                                            color: 'white',
                                            textTransform: 'capitalize',
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>
                </Box>
                {chain.evolves_to.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ color: 'text.secondary' }}>→</Typography>
                        {chain.evolves_to.map((evolution, index) => (
                            <React.Fragment key={`${currentKey}-${index}`}>
                                {index > 0 && <Typography sx={{ color: 'text.secondary' }}>→</Typography>}
                                {renderEvolutionChain(evolution, currentKey)}
                            </React.Fragment>
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    const ModalContent = React.forwardRef<HTMLDivElement>((_, ref) => {
        if (!selectedPokemon) return null;

        return (
            <Box
                ref={ref}
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: '80%', md: '70%' },
                    maxHeight: '90vh',
                    bgcolor: 'background.paper',
                    borderRadius: '20px',
                    boxShadow: 24,
                    p: 4,
                    overflow: 'auto',
                }}
            >
                <IconButton
                    onClick={() => setSelectedPokemon(null)}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary' }
                    }}
                >
                    <ClearIcon />
                </IconButton>

                <Tabs
                    value={activeTab}
                    onChange={(_: any, newValue: React.SetStateAction<number>) => setActiveTab(newValue)}
                    sx={{ mb: 3 }}
                >
                    <Tab label="Details" />
                    <Tab label="Evolution" />
                    <Tab label="Forms" />
                </Tabs>

                {activeTab === 0 && (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                            <CardMedia
                                component="img"
                                image={selectedPokemon.image}
                                alt={selectedPokemon.name}
                                sx={{
                                    width: 200,
                                    height: 200,
                                    objectFit: 'contain',
                                    background: 'linear-gradient(180deg, rgba(74, 144, 226, 0.1) 0%, rgba(155, 89, 182, 0.1) 100%)',
                                    borderRadius: '10px',
                                }}
                            />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h4" gutterBottom sx={{ textTransform: 'capitalize' }}>
                                    {selectedPokemon.name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    {selectedPokemon.types.map((type) => (
                                        <Chip
                                            key={type}
                                            label={type}
                                            sx={{
                                                backgroundColor: getTypeColor(type),
                                                color: 'white',
                                                textTransform: 'capitalize',
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Typography variant="body1" gutterBottom>
                                    Height: {selectedPokemon.height}m
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Weight: {selectedPokemon.weight}kg
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Abilities: {selectedPokemon.abilities.map(a => a.ability.name).join(', ')}
                                </Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Base Stats
                        </Typography>
                        {selectedPokemon.stats.map((stat) => (
                            <Box key={stat.stat.name} sx={{ mb: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                        {stat.stat.name.replace('-', ' ')}:
                                    </Typography>
                                    <Typography variant="body2">
                                        {stat.base_stat}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stat.base_stat / 255) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: getTypeColor(selectedPokemon.types[0]),
                                        },
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Evolution Chain
                        </Typography>
                        {evolutionChain ? (
                            <Box sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider'
                            }}>
                                {renderEvolutionChain(evolutionChain)}
                            </Box>
                        ) : (
                            <Typography color="text.secondary">
                                This Pokémon does not evolve.
                            </Typography>
                        )}
                    </Box>
                )}

                {activeTab === 2 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Forms
                        </Typography>
                        {pokemonForms.length > 0 ? (
                            <Grid container spacing={2}>
                                {pokemonForms.map((form) => (
                                    <Grid item xs={6} sm={4} md={3} key={`${selectedPokemon?.id}-${form.name}`}>
                                        <Card sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'transform 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.05)'
                                            }
                                        }}>
                                            <CardMedia
                                                component="img"
                                                image={form.sprites.front_default}
                                                alt={form.name}
                                                sx={{
                                                    height: 150,
                                                    objectFit: 'contain',
                                                    p: 2,
                                                    bgcolor: 'background.default'
                                                }}
                                            />
                                            <CardContent sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle1" align="center" gutterBottom>
                                                    {form.name.split('-').map(word =>
                                                        word.charAt(0).toUpperCase() + word.slice(1)
                                                    ).join(' ')}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
                                                    {form.types.map((type: any) => (
                                                        <Chip
                                                            key={type.type.name}
                                                            label={type.type.name}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getTypeColor(type.type.name),
                                                                color: 'white',
                                                                textTransform: 'capitalize',
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                                {form.sprites.front_shiny && (
                                                    <Box sx={{
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        gap: 1,
                                                        mt: 1
                                                    }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Shiny:
                                                        </Typography>
                                                        <CardMedia
                                                            component="img"
                                                            image={form.sprites.front_shiny}
                                                            alt={`${form.name} shiny`}
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                objectFit: 'contain'
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Typography color="text.secondary">
                                This Pokémon has no alternate forms.
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        );
    });

    // Load favorites from localStorage on mount
    useEffect(() => {
        const savedFavorites = localStorage.getItem('pokemonFavorites');
        if (savedFavorites) {
            setFavorites(new Set(JSON.parse(savedFavorites)));
        }
    }, []);

    // Save favorites to localStorage when updated
    useEffect(() => {
        localStorage.setItem('pokemonFavorites', JSON.stringify(Array.from(favorites)));
    }, [favorites]);

    // Save teams to localStorage when updated
    useEffect(() => {
        localStorage.setItem('pokemonTeams', JSON.stringify(teams));
    }, [teams]);

    const toggleFavorite = (pokemonId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        const newFavorites = new Set(favorites);
        if (newFavorites.has(pokemonId)) {
            newFavorites.delete(pokemonId);
            setSnackbarMessage('Removed from favorites');
        } else {
            newFavorites.add(pokemonId);
            setSnackbarMessage('Added to favorites');
        }
        setFavorites(newFavorites);
        setSnackbarOpen(true);
    };

    const toggleCompareMode = () => {
        setIsCompareMode(!isCompareMode);
        setCompareList([]);
    };

    const handlePokemonSelect = (pokemon: Pokemon) => {
        if (isCompareMode) {
            if (compareList.find(p => p.id === pokemon.id)) {
                setCompareList(compareList.filter(p => p.id !== pokemon.id));
            } else if (compareList.length < 2) {
                setCompareList([...compareList, pokemon]);
            } else {
                setSnackbarMessage('Can only compare two Pokemon at a time');
                setSnackbarOpen(true);
            }
        } else {
            handlePokemonClick(pokemon);
        }
    };

    const ComparisonModal = () => {
        if (compareList.length !== 2) return null;

        return (
            <Box sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
                p: 2,
                zIndex: 1000,
            }}>
                <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                    {compareList.map((pokemon) => (
                        <Box key={pokemon.id} sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <CardMedia
                                    component="img"
                                    image={pokemon.image}
                                    alt={pokemon.name}
                                    sx={{ width: 100, height: 100, objectFit: 'contain' }}
                                />
                                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                    {pokemon.name}
                                </Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                {pokemon.types.map((type) => (
                                    <Chip
                                        key={type}
                                        label={type}
                                        sx={{
                                            m: 0.5,
                                            backgroundColor: getTypeColor(type),
                                            color: 'white',
                                        }}
                                    />
                                ))}
                            </Box>
                            {pokemon.stats.map((stat) => (
                                <Box key={stat.stat.name} sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                            {stat.stat.name.replace('-', ' ')}
                                        </Typography>
                                        <Typography variant="body2">
                                            {stat.base_stat}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(stat.base_stat / 255) * 100}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: getTypeColor(pokemon.types[0]),
                                            },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
                <IconButton
                    onClick={() => setCompareList([])}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <ClearIcon />
                </IconButton>
            </Box>
        );
    };

    const handleTypeClick = (type: string) => {
        setSelectedTypesForCalculator(prev => {
            if (prev.includes(type)) {
                return prev.filter(t => t !== type);
            }
            if (prev.length >= 2) {
                return [prev[1], type];
            }
            return [...prev, type];
        });
    };

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography color="error" variant="h6">{error}</Typography>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4, pb: compareList.length === 2 ? 40 : 4 }}>
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    mb: 4,
                    background: 'linear-gradient(45deg, #4A90E2 30%, #9B59B6 90%)',
                    borderRadius: '20px',
                }}
            >
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    align="center"
                    sx={{
                        color: 'white',
                        textShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
                        mb: 2,
                    }}
                >
                    Pokémon Collection
                </Typography>
                <Typography
                    variant="h6"
                    align="center"
                    sx={{
                        color: 'white',
                        opacity: 0.9,
                    }}
                >
                    Discover and learn about different Pokémon
                </Typography>
            </Paper>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={mainTab}
                    onChange={(_: any, newValue: React.SetStateAction<number>) => setMainTab(newValue)}
                    variant="fullWidth"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            py: 2,
                        },
                    }}
                >
                    <Tab label="Pokédex" />
                    <Tab label="Team Builder" />
                    <Tab label="Type Calculator" />
                    <Tab label="Battle Simulator" />
                </Tabs>
            </Paper>

            {mainTab === 0 && (
                <>
                    {/* Search and Filter Controls */}
                    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                        <Box sx={{
                            display: 'flex',
                            gap: 2,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            width: '100%',
                            '& .MuiFormControl-root': {
                                flex: 1,
                                minWidth: { xs: '100%', sm: 120 },
                                maxWidth: { sm: 200 }
                            },
                            '& .MuiTextField-root': {
                                flex: 2,
                                minWidth: { xs: '100%', sm: 200 }
                            }
                        }}>
                            <TextField
                                label="Search Pokémon"
                                variant="outlined"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="small"
                            />
                            <FormControl size="small">
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    label="Type"
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    {Array.from(new Set(pokemonData?.pages.flatMap(page =>
                                        page.pokemons.flatMap(p => p.types)
                                    ) || [])).sort().map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small">
                                <InputLabel>Sort By</InputLabel>
                                <Select
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value as SortField)}
                                    label="Sort By"
                                >
                                    <MenuItem value="name">Name</MenuItem>
                                    <MenuItem value="type">Type</MenuItem>
                                    <MenuItem value="height">Height</MenuItem>
                                    <MenuItem value="weight">Weight</MenuItem>
                                    <MenuItem value="hp">HP</MenuItem>
                                    <MenuItem value="attack">Attack</MenuItem>
                                    <MenuItem value="defense">Defense</MenuItem>
                                    <MenuItem value="speed">Speed</MenuItem>
                                </Select>
                            </FormControl>
                            <IconButton
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                color="primary"
                                size="small"
                            >
                                {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                            </IconButton>
                            <ToggleButton
                                value="favorites"
                                selected={showFavoritesOnly}
                                onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
                                color="primary"
                                size="small"
                                sx={{
                                    borderRadius: 1,
                                    minWidth: { xs: '100%', sm: 'auto' },
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                <FavoriteIcon sx={{ mr: 1 }} />
                                Favorites Only
                            </ToggleButton>
                            <ToggleButton
                                value="legendary"
                                selected={showLegendaries}
                                onChange={() => setShowLegendaries(!showLegendaries)}
                                color="primary"
                                size="small"
                                sx={{
                                    borderRadius: 1,
                                    minWidth: { xs: '100%', sm: 'auto' },
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                Legendary
                            </ToggleButton>
                            <ToggleButton
                                value="mythical"
                                selected={showMythicals}
                                onChange={() => setShowMythicals(!showMythicals)}
                                color="primary"
                                size="small"
                                sx={{
                                    borderRadius: 1,
                                    minWidth: { xs: '100%', sm: 'auto' },
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                Mythical
                            </ToggleButton>
                        </Box>
                        {showFavoritesOnly && filteredPokemons.length === 0 && (
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                No favorite Pokémon yet. Click the heart icon on a Pokémon card to add it to your favorites!
                            </Typography>
                        )}
                    </Box>

                    {/* Pokemon Grid */}
                    <Grid container spacing={3}>
                        {filteredPokemons.map((pokemon, index) => (
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                lg={3}
                                key={`pokemon-${pokemon.id}-${index}`}
                                ref={index === filteredPokemons.length - 1 ? lastPokemonRef : undefined}
                            >
                                <Card
                                    onClick={() => handlePokemonSelect(pokemon)}
                                    sx={{
                                        position: 'relative',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease-in-out',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'translateY(-8px) scale(1.02)',
                                            boxShadow: '0 12px 24px rgba(74, 144, 226, 0.2)',
                                        },
                                        background: 'rgba(22, 33, 62, 0.8)',
                                        backdropFilter: 'blur(10px)',
                                        border: compareList.find(p => p.id === pokemon.id)
                                            ? '2px solid #4A90E2'
                                            : '1px solid rgba(74, 144, 226, 0.2)',
                                    }}
                                >
                                    <IconButton
                                        onClick={(e: React.MouseEvent<Element, MouseEvent>) => toggleFavorite(pokemon.id, e)}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 2,
                                        }}
                                    >
                                        {favorites.has(pokemon.id) ? (
                                            <FavoriteIcon color="error" />
                                        ) : (
                                            <FavoriteBorderIcon />
                                        )}
                                    </IconButton>
                                    <CardMedia
                                        component="img"
                                        height="200"
                                        image={pokemon.image}
                                        alt={pokemon.name}
                                        sx={{
                                            objectFit: 'contain',
                                            p: 2,
                                            background: 'linear-gradient(180deg, rgba(74, 144, 226, 0.1) 0%, rgba(155, 89, 182, 0.1) 100%)',
                                        }}
                                    />
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography
                                            gutterBottom
                                            variant="h5"
                                            component="h2"
                                            sx={{
                                                textTransform: 'capitalize',
                                                color: 'primary.main',
                                                fontWeight: 'bold',
                                                textAlign: 'center',
                                                textShadow: '0 0 5px rgba(74, 144, 226, 0.3)',
                                            }}
                                        >
                                            {pokemon.name}
                                        </Typography>
                                        <Box
                                            display="flex"
                                            gap={1}
                                            justifyContent="center"
                                            flexWrap="wrap"
                                            sx={{ mb: 2 }}
                                        >
                                            {pokemon.types.map((type: string) => (
                                                <Typography
                                                    key={type}
                                                    variant="body2"
                                                    onClick={(e: { stopPropagation: () => void; }) => {
                                                        e.stopPropagation();
                                                        handleTypeClick(type);
                                                    }}
                                                    sx={{
                                                        backgroundColor: getTypeColor(type),
                                                        color: 'white',
                                                        px: 2,
                                                        py: 0.5,
                                                        borderRadius: '12px',
                                                        textTransform: 'capitalize',
                                                        fontWeight: 'bold',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                        cursor: 'pointer',
                                                        '&:hover': {
                                                            opacity: 0.9,
                                                            transform: 'scale(1.05)',
                                                        },
                                                        transition: 'all 0.2s ease-in-out',
                                                    }}
                                                >
                                                    {type}
                                                </Typography>
                                            ))}
                                        </Box>

                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Height: {pokemon.height}m | Weight: {pokemon.weight}kg
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Abilities: {pokemon.abilities.map((a: { ability: { name: any; }; }) => a.ability.name).join(', ')}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Base Stats:
                                            </Typography>
                                            {pokemon.stats.map((stat: { stat: { name: string; }; base_stat: number; }) => (
                                                <Box key={stat.stat.name} sx={{ mb: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                            {stat.stat.name.replace('-', ' ')}:
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {stat.base_stat}
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={(stat.base_stat / 255) * 100}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                backgroundColor: getTypeColor(pokemon.types[0]),
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {mainTab === 1 && (
                <TeamBuilder
                    pokemons={pokemons}
                    getTypeColor={getTypeColor}
                    teams={teams}
                    onTeamsChange={setTeams}
                />
            )}

            {mainTab === 2 && (
                <TypeEffectiveness
                    selectedTypes={selectedTypesForCalculator}
                    onTypeClick={handleTypeClick}
                    getTypeColor={getTypeColor}
                />
            )}

            {mainTab === 3 && (
                <BattleSimulator
                    teams={teams}
                    getTypeColor={getTypeColor}
                    typeEffectiveness={TYPE_EFFECTIVENESS}
                />
            )}

            <Modal
                open={!!selectedPokemon}
                onClose={() => setSelectedPokemon(null)}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{
                    backdrop: {
                        timeout: 500,
                    },
                }}
            >
                <Box>
                    <Fade in={!!selectedPokemon}>
                        <ModalContent />
                    </Fade>
                </Box>
            </Modal>

            <SpeedDial
                ariaLabel="Pokemon actions"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                icon={<SpeedDialIcon />}
            >
                <SpeedDialAction
                    icon={<CompareArrowsIcon />}
                    tooltipTitle={isCompareMode ? "Exit Compare" : "Compare Pokemon"}
                    onClick={toggleCompareMode}
                    sx={{
                        bgcolor: isCompareMode ? 'primary.main' : 'background.paper',
                        color: isCompareMode ? 'white' : 'inherit',
                    }}
                />
            </SpeedDial>

            <ComparisonModal />

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={2000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {isLoading && (
                <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                    <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
            )}
            {isFetchingNextPage && (
                <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                    <CircularProgress size={24} sx={{ color: 'primary.main' }} />
                </Box>
            )}
            {isError && (
                <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                    <Typography color="error">
                        Error loading Pokemon data. Please try again later.
                    </Typography>
                </Box>
            )}
        </Container>
    );
};

// Helper function to get type colors
const getTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
        normal: '#A8A878',
        fire: '#F08030',
        water: '#6890F0',
        electric: '#F8D030',
        grass: '#78C850',
        ice: '#98D8D8',
        fighting: '#C03028',
        poison: '#A040A0',
        ground: '#E0C068',
        flying: '#A890F0',
        psychic: '#F85888',
        bug: '#A8B820',
        rock: '#B8A038',
        ghost: '#705898',
        dragon: '#7038F8',
        dark: '#705848',
        steel: '#B8B8D0',
        fairy: '#EE99AC',
    };
    return colors[type] || '#777777';
};

export default Pokemon;