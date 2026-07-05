import React from 'react';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    IconButton,
    Paper,
    Toolbar,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { motion } from 'framer-motion';
import type { JourneyNode, JourneyTrainer } from '../../data/journey';
import {
    JOURNEY_NODES,
    isNodeComplete,
    journeyNodeIndex,
    nextGymIdAt,
    nextJourneyNode,
    nextTrainerAt,
} from '../../data/journey';
import { getBiome } from '../../utils/safari';
import { getLeagueStage } from '../../data/league';
import type { PlayerProfile } from '../../utils/progression';
import { getBattleSprites } from '../../utils/spriteSources';

const STARTERS = [
    { id: 1, name: 'Bulbasaur', type: 'grass', blurb: 'Calm and dependable.' },
    { id: 4, name: 'Charmander', type: 'fire', blurb: 'Fiery and bold.' },
    { id: 7, name: 'Squirtle', type: 'water', blurb: 'Cool under pressure.' },
    { id: 25, name: 'Pikachu', type: 'electric', blurb: 'The icon. Refuses the ball.' },
];

interface JourneyMapProps {
    open: boolean;
    onClose: () => void;
    profile: PlayerProfile;
    starting: boolean;
    /** Starter chosen on first launch — parent registers it + builds the team. */
    onPickStarter: (starterId: number) => void;
    onWildEncounter: (node: JourneyNode) => void;
    onTrainerBattle: (node: JourneyNode, trainer: JourneyTrainer) => void;
    onGymChallenge: (stageId: string) => void;
    onTravel: (toNodeId: string) => void;
}

const JourneyMap: React.FC<JourneyMapProps> = ({
    open,
    onClose,
    profile,
    starting,
    onPickStarter,
    onWildEncounter,
    onTrainerBattle,
    onGymChallenge,
    onTravel,
}) => {
    const { journey, league } = profile;
    const positionIdx = journeyNodeIndex(journey.position);

    return (
        <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { background: '#0b1026' } }}>
            <AppBar position="sticky" sx={{ background: 'rgba(13, 20, 40, 0.95)' }}>
                <Toolbar variant="dense">
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
                        🗺️ Kanto Journey
                    </Typography>
                    <Chip
                        size="small"
                        label={`${JOURNEY_NODES.filter(n => isNodeComplete(n, journey, league)).length}/${JOURNEY_NODES.length} cleared`}
                        sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700 }}
                    />
                    <IconButton edge="end" onClick={onClose} sx={{ color: '#fff' }} aria-label="close journey">
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {!journey.started ? (
                // ---------- Starter pick ----------
                <Box sx={{ p: 3, maxWidth: 520, mx: 'auto', textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 2 }}>
                        Welcome to Kanto!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                        Professor Oak: "Every great journey begins with a partner.
                        Choose carefully — this Pokémon will walk every route with you."
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {STARTERS.map(s => (
                            <Paper
                                key={s.id}
                                component="button"
                                disabled={starting}
                                onClick={() => onPickStarter(s.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 1.5,
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    textAlign: 'left',
                                    width: '100%',
                                    '&:hover': { borderColor: '#4f8ef7', transform: 'translateY(-1px)' },
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Avatar src={getBattleSprites(s.id).artwork} sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.06)' }} />
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{s.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.blurb}</Typography>
                                </Box>
                                <Chip label={s.type} size="small" sx={{ textTransform: 'uppercase', fontWeight: 700 }} />
                            </Paper>
                        ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        Your starter joins at level 5 as its own “Journey Team”. Wild friends you catch can join it later.
                    </Typography>
                </Box>
            ) : (
                // ---------- Vertical metro map ----------
                <Box sx={{ p: 2, maxWidth: 560, mx: 'auto', width: '100%' }}>
                    {JOURNEY_NODES.map((node, idx) => {
                        const cleared = isNodeComplete(node, journey, league);
                        const isCurrent = idx === positionIdx;
                        const locked = idx > positionIdx;
                        const trainerNext = nextTrainerAt(node, journey);
                        const gymNext = nextGymIdAt(node, league);
                        const gymStage = gymNext ? getLeagueStage(gymNext) : undefined;
                        const nextNode = nextJourneyNode(node.id);
                        const biome = node.biomeId ? getBiome(node.biomeId) : undefined;

                        return (
                            <Box key={node.id} sx={{ display: 'flex', gap: 1.5, opacity: locked ? 0.42 : 1 }}>
                                {/* Rail */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44 }}>
                                    <motion.div animate={isCurrent ? { scale: [1, 1.12, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}>
                                        <Avatar
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                fontSize: 20,
                                                bgcolor: cleared ? 'rgba(102, 187, 106, 0.25)' : isCurrent ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.08)',
                                                border: isCurrent ? '2px solid #ffd700' : cleared ? '2px solid #66bb6a' : '2px solid rgba(255,255,255,0.15)',
                                            }}
                                        >
                                            {node.emoji}
                                        </Avatar>
                                    </motion.div>
                                    {idx < JOURNEY_NODES.length - 1 && (
                                        <Box sx={{ width: 3, flexGrow: 1, minHeight: 18, bgcolor: idx < positionIdx ? '#66bb6a' : 'rgba(255,255,255,0.12)', borderRadius: 2 }} />
                                    )}
                                </Box>

                                {/* Node body */}
                                <Box sx={{ pb: 2, flexGrow: 1, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            {node.name}
                                        </Typography>
                                        {cleared && <CheckCircleIcon sx={{ color: '#66bb6a', fontSize: 18 }} />}
                                        {locked && <LockIcon sx={{ color: 'text.disabled', fontSize: 16 }} />}
                                        <Typography variant="caption" color="text.secondary">
                                            Lv {node.levelFloor}+
                                        </Typography>
                                    </Box>

                                    {isCurrent && (
                                        <Paper sx={{ p: 1.5, mt: 1, border: '1px solid rgba(255, 215, 0, 0.35)' }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                                {node.description}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {trainerNext && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={starting}
                                                        onClick={() => onTrainerBattle(node, trainerNext)}
                                                        sx={{ justifyContent: 'flex-start', fontWeight: 700 }}
                                                    >
                                                        ⚔️ Battle {trainerNext.title} {trainerNext.name}
                                                        &nbsp;
                                                        <Typography component="span" variant="caption" sx={{ opacity: 0.8 }}>
                                                            ({node.trainers.filter(t => journey.clearedTrainers.includes(t.id)).length}/{node.trainers.length} beaten)
                                                        </Typography>
                                                    </Button>
                                                )}
                                                {gymStage && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={starting || trainerNext !== null}
                                                        onClick={() => onGymChallenge(gymStage.id)}
                                                        sx={{ justifyContent: 'flex-start', fontWeight: 700, bgcolor: '#ffd700', color: '#1a1a2e', '&:hover': { bgcolor: '#e6c200' } }}
                                                    >
                                                        {gymStage.kind === 'gym' ? '🏟️' : '🏆'} Challenge {gymStage.name} — {gymStage.title}
                                                        {trainerNext !== null && ' (beat the locals first)'}
                                                    </Button>
                                                )}
                                                {biome && (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        disabled={starting}
                                                        onClick={() => onWildEncounter(node)}
                                                        sx={{ justifyContent: 'flex-start', fontWeight: 700 }}
                                                    >
                                                        🌿 Wild encounter — {biome.emoji} {biome.name}
                                                    </Button>
                                                )}
                                                {cleared && nextNode && (
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        size="small"
                                                        disabled={starting}
                                                        onClick={() => onTravel(nextNode.id)}
                                                        sx={{ justifyContent: 'flex-start', fontWeight: 700 }}
                                                    >
                                                        🧭 Travel to {nextNode.name}
                                                    </Button>
                                                )}
                                                {cleared && !nextNode && (
                                                    <Typography variant="body2" sx={{ color: '#ffd700', fontWeight: 700 }}>
                                                        🏆 The Journey is complete. You are the Champion of Kanto!
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Paper>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Dialog>
    );
};

export default JourneyMap;
