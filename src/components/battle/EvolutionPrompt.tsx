import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getBattleSprites } from '../../utils/spriteSources';

export interface PendingEvolution {
    fromId: number;
    fromName: string;
    fromImage: string;
    toId: number;
    toName: string;
    level: number;
}

interface EvolutionPromptProps {
    evolution: PendingEvolution;
    onEvolve: () => Promise<void>;
    onDecline: () => void;
}

const EvolutionPrompt: React.FC<EvolutionPromptProps> = ({ evolution, onEvolve, onDecline }) => {
    const [evolving, setEvolving] = useState(false);
    const [revealed, setRevealed] = useState(false);

    const handleEvolve = async () => {
        setEvolving(true);
        setRevealed(true);
        await onEvolve();
    };

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            sx={{
                p: 2,
                mb: 2,
                background: 'rgba(102, 187, 106, 0.1)',
                border: '1px solid rgba(102, 187, 106, 0.4)',
                textAlign: 'center',
            }}
        >
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                <AutoAwesomeIcon sx={{ fontSize: 18, color: '#ffd700', mr: 0.5, verticalAlign: 'text-bottom' }} />
                What? <Box component="span" sx={{ textTransform: 'capitalize' }}>{evolution.fromName}</Box> is ready to evolve!
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1 }}>
                <AnimatePresence mode="wait">
                    {!revealed ? (
                        <motion.img
                            key="from"
                            src={getBattleSprites(evolution.fromId).artwork}
                            onError={e => { (e.target as HTMLImageElement).src = evolution.fromImage; }}
                            alt={evolution.fromName}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.4, filter: 'brightness(4)' }}
                            transition={{ duration: 0.5 }}
                            style={{ width: 84, height: 84, objectFit: 'contain' }}
                        />
                    ) : (
                        <motion.img
                            key="to"
                            src={getBattleSprites(evolution.toId).artwork}
                            alt={evolution.toName}
                            initial={{ opacity: 0, scale: 1.4, filter: 'brightness(4)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
                            transition={{ duration: 0.7 }}
                            style={{ width: 84, height: 84, objectFit: 'contain' }}
                        />
                    )}
                </AnimatePresence>
                <Typography variant="h5" sx={{ color: '#94a3b8' }}>→</Typography>
                <Typography variant="subtitle1" sx={{ color: '#66bb6a', fontWeight: 700, textTransform: 'capitalize', minWidth: 90 }}>
                    {evolution.toName}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    color="success"
                    size="small"
                    disabled={evolving}
                    startIcon={evolving ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={handleEvolve}
                >
                    {evolving ? 'Evolving…' : 'Evolve!'}
                </Button>
                <Button size="small" disabled={evolving} onClick={onDecline} sx={{ color: '#94a3b8' }}>
                    Not now
                </Button>
            </Box>
        </Paper>
    );
};

export default EvolutionPrompt;
