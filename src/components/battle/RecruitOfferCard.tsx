import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material';
import CatchingPokemonIcon from '@mui/icons-material/CatchingPokemon';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { Team } from '../../types/pokemon';
import type { RecruitOffer } from '../../utils/recruitment';
import { getBattleSprites } from '../../utils/spriteSources';

interface RecruitOfferCardProps {
    offer: RecruitOffer;
    teams: Team[];
    onAddToTeam: (teamId: string) => void;
    onSendToBox: () => void;
    onDecline: () => void;
}

const RecruitOfferCard: React.FC<RecruitOfferCardProps> = ({ offer, teams, onAddToTeam, onSendToBox, onDecline }) => {
    const joinableTeams = teams.filter(t => t.pokemon.length > 0 && t.pokemon.length < 6);
    const [teamId, setTeamId] = useState<string>(joinableTeams[0]?.id ?? '');
    const sprites = getBattleSprites(offer.pokemon.id, offer.shiny);

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            sx={{
                p: 2,
                mb: 2,
                background: offer.legendary
                    ? 'rgba(126, 87, 194, 0.18)'
                    : offer.elite
                        ? 'rgba(255, 215, 0, 0.1)'
                        : 'rgba(79, 142, 247, 0.1)',
                border: offer.legendary
                    ? '1px solid rgba(179, 136, 255, 0.5)'
                    : offer.elite
                        ? '1px solid rgba(255, 215, 0, 0.5)'
                        : '1px solid rgba(79, 142, 247, 0.35)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <img
                    src={sprites.animFront}
                    alt={offer.pokemon.name}
                    onError={e => { (e.target as HTMLImageElement).src = offer.pokemon.image; }}
                    style={{ width: 64, height: 64, objectFit: 'contain' }}
                />
                <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>
                            {offer.pokemon.name}
                        </Typography>
                        <Chip label={`Lv ${offer.level}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                        {offer.legendary && (
                            <Chip label="LEGENDARY" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#7e57c2', color: '#fff', fontWeight: 700 }} />
                        )}
                        {offer.elite && (
                            <Chip label="✨ ELITE" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#ffd700', color: '#1a1a2e', fontWeight: 700 }} />
                        )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {offer.legendary
                            ? 'A legendary Pokémon was impressed by your victory and wants to join!'
                            : offer.elite
                                ? 'An exceptionally strong wild Pokémon wants to join your ranks!'
                                : 'A wild Pokémon was impressed and wants to join you!'}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {joinableTeams.length > 0 && (
                    <>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Team</InputLabel>
                            <Select value={teamId} label="Team" onChange={e => setTeamId(e.target.value)}>
                                {joinableTeams.map(t => (
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.name} ({t.pokemon.length}/6)
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CatchingPokemonIcon />}
                            disabled={!teamId}
                            onClick={() => onAddToTeam(teamId)}
                        >
                            Recruit
                        </Button>
                    </>
                )}
                <Button variant="outlined" size="small" startIcon={<Inventory2Icon />} onClick={onSendToBox} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                    Send to Box
                </Button>
                <Button size="small" onClick={onDecline} sx={{ color: '#94a3b8' }}>
                    Decline
                </Button>
            </Box>
        </Paper>
    );
};

export default RecruitOfferCard;
