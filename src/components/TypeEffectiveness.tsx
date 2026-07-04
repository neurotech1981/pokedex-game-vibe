import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { TYPE_EFFECTIVENESS } from '../data/typeChart';

interface Props {
    selectedTypes: string[];
    onTypeClick: (type: string) => void;
    getTypeColor: (type: string) => string;
}

const TypeEffectiveness: React.FC<Props> = ({ selectedTypes, onTypeClick, getTypeColor }) => {
    const calculateEffectiveness = () => {
        if (selectedTypes.length === 0) return null;

        const weakTo: string[] = [];
        const resistantTo: string[] = [];
        const immuneTo: string[] = [];

        Object.entries(TYPE_EFFECTIVENESS).forEach(([type, effectiveness]) => {
            let multiplier = 1;

            selectedTypes.forEach(selectedType => {
                if (effectiveness.superEffective.includes(selectedType)) {
                    multiplier *= 2;
                }
                if (effectiveness.notVeryEffective.includes(selectedType)) {
                    multiplier *= 0.5;
                }
                if (effectiveness.noEffect.includes(selectedType)) {
                    multiplier = 0;
                }
            });

            if (multiplier > 1) {
                weakTo.push(type);
            } else if (multiplier === 0) {
                immuneTo.push(type);
            } else if (multiplier < 1) {
                resistantTo.push(type);
            }
        });

        return { weakTo, resistantTo, immuneTo };
    };

    const allTypes = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ];

    const effectiveness = calculateEffectiveness();

    return (
        <Box>
            {/* Type Selection Grid */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Select Pokémon Type(s)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose up to two types to see their combined effectiveness
                </Typography>
                <Grid container spacing={1}>
                    {allTypes.map((type) => (
                        <Grid key={type}>
                            <Chip
                                label={type}
                                onClick={() => onTypeClick(type)}
                                sx={{
                                    backgroundColor: selectedTypes.includes(type)
                                        ? getTypeColor(type)
                                        : 'action.disabledBackground',
                                    color: selectedTypes.includes(type) ? 'white' : 'text.primary',
                                    textTransform: 'capitalize',
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: selectedTypes.includes(type)
                                            ? getTypeColor(type)
                                            : 'action.hover',
                                        opacity: 0.9,
                                    },
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Selected Types Display */}
            {selectedTypes.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Selected Types
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {selectedTypes.map(type => (
                            <Chip
                                key={type}
                                label={type}
                                onDelete={() => onTypeClick(type)}
                                sx={{
                                    backgroundColor: getTypeColor(type),
                                    color: 'white',
                                    textTransform: 'capitalize',
                                    fontWeight: 'bold',
                                }}
                            />
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Effectiveness Results */}
            {effectiveness && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Type Effectiveness
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Effectiveness</TableCell>
                                    <TableCell>Types</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>
                                        <Typography variant="subtitle2" color="error">
                                            Weak to (2x)
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {effectiveness.weakTo.map(type => (
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
                                            {effectiveness.weakTo.length === 0 && (
                                                <Typography variant="body2" color="text.secondary">
                                                    None
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>
                                        <Typography variant="subtitle2" color="success.main">
                                            Resistant to (0.5x)
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {effectiveness.resistantTo.map(type => (
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
                                            {effectiveness.resistantTo.length === 0 && (
                                                <Typography variant="body2" color="text.secondary">
                                                    None
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>
                                        <Typography variant="subtitle2">
                                            Immune to (0x)
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {effectiveness.immuneTo.map(type => (
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
                                            {effectiveness.immuneTo.length === 0 && (
                                                <Typography variant="body2" color="text.secondary">
                                                    None
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default TypeEffectiveness;