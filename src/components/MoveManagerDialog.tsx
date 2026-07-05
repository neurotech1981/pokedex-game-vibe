import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import type { Pokemon } from '../types/pokemon';
import type { Move } from '../data/moves';
import { getDamageClass } from '../data/moves';
import type { LearnsetEntry } from '../utils/movesets';
import { getFullLearnset, getMovesetForPokemon } from '../utils/movesets';

interface MoveManagerDialogProps {
    open: boolean;
    pokemon: Pokemon;
    /** The saved custom moveset, if any. */
    currentCustom: Move[] | undefined;
    /** null = reset to auto. */
    onSave: (moves: Move[] | null) => void;
    onClose: () => void;
    getTypeColor: (type: string) => string;
}

const CLASS_LABEL = { physical: 'PHYS', special: 'SPEC', status: 'STAT' } as const;
const MAX_MOVES = 4;

const MoveManagerDialog: React.FC<MoveManagerDialogProps> = ({
    open,
    pokemon,
    currentCustom,
    onSave,
    onClose,
    getTypeColor,
}) => {
    const [learnset, setLearnset] = useState<LearnsetEntry[] | null>(null);
    const [autoMoves, setAutoMoves] = useState<Move[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadNonce, setLoadNonce] = useState(0);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setError(null);
        setLearnset(null);
        Promise.all([getFullLearnset(pokemon), getMovesetForPokemon(pokemon)])
            .then(([entries, auto]) => {
                if (cancelled) return;
                setLearnset(entries);
                setAutoMoves(auto);
                setSelected((currentCustom?.length ? currentCustom : auto).map(m => m.name));
            })
            .catch(() => {
                if (!cancelled) setError('Couldn’t load the learnset from PokeAPI — check your connection.');
            });
        return () => {
            cancelled = true;
        };
    }, [open, pokemon, currentCustom, loadNonce]);

    const toggle = (name: string) => {
        setSelected(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : prev.length < MAX_MOVES
                    ? [...prev, name]
                    : prev
        );
    };

    const handleSave = () => {
        if (!learnset) return;
        const byName = new Map(learnset.map(e => [e.move.name, e.move]));
        autoMoves?.forEach(m => byName.has(m.name) || byName.set(m.name, m));
        const moves = selected.map(n => byName.get(n)).filter((m): m is Move => Boolean(m));
        if (moves.length === 0) return;
        onSave(moves);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ textTransform: 'capitalize' }}>
                {pokemon.name} — Moves
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    Pick up to {MAX_MOVES} moves from the level-up learnset
                    {currentCustom?.length ? ' (custom set active)' : ' (auto set active)'}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {error ? (
                    <Alert
                        severity="warning"
                        action={<Button size="small" onClick={() => setLoadNonce(n => n + 1)}>Retry</Button>}
                    >
                        {error}
                    </Alert>
                ) : !learnset ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : (
                    <List dense disablePadding>
                        {learnset.map(entry => {
                            const move = entry.move;
                            const checked = selected.includes(move.name);
                            const damageClass = getDamageClass(move);
                            return (
                                <ListItemButton
                                    key={move.name}
                                    onClick={() => toggle(move.name)}
                                    disabled={!checked && selected.length >= MAX_MOVES}
                                    sx={{ borderRadius: 1, mb: 0.25, gap: 1 }}
                                >
                                    <Checkbox edge="start" checked={checked} size="small" disableRipple tabIndex={-1} />
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{move.name}</Typography>
                                            <Chip label={move.type} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: getTypeColor(move.type), color: '#fff', textTransform: 'capitalize' }} />
                                            <Chip label={CLASS_LABEL[damageClass]} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                            {(move.priority ?? 0) > 0 && <Chip label={`+${move.priority}`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#4fc3f7', color: '#000' }} />}
                                            {move.multiHit && <Chip label={`${move.multiHit.min}–${move.multiHit.max}×`} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                            {move.flinchChance && <Chip label="flinch" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#ffb74d', color: '#000' }} />}
                                            {move.debuff && <Chip label={`-${move.debuff.stat.slice(0, 3).toUpperCase()}`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#e57373', color: '#fff' }} />}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Lv {entry.level} · Pwr {move.power > 0 ? move.power : '—'} · Acc {Math.round(move.accuracy * 100)}%
                                        </Typography>
                                    </Box>
                                    <Chip icon={<BoltIcon sx={{ fontSize: 12 }} />} label={move.energyCost} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Typography variant="caption" sx={{ flexGrow: 1, pl: 1, color: 'text.secondary' }}>
                    {selected.length}/{MAX_MOVES} selected
                </Typography>
                <Button onClick={() => { onSave(null); onClose(); }} disabled={!learnset}>
                    Reset to Auto
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={!learnset || selected.length === 0}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MoveManagerDialog;
