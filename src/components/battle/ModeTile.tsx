import React from 'react';
import { Box, Paper, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import type { BackgroundId } from '../../data/battleBackgrounds';
import { surface } from '../../theme';
import { backdropSx } from './battleUi';

interface ModeTileProps {
    backdropId: BackgroundId;
    /** Hex accent — drives the title color and hover border/glow. */
    accent: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    /** Live progress chip(s), pinned to the title row's right edge. */
    stat?: React.ReactNode;
    /** Extra inputs (e.g. the Safari biome select), rendered above the action. */
    controls?: React.ReactNode;
    /** The CTA button — handlers stay with the caller. */
    action: React.ReactNode;
    /** Span the full grid width (flagship modes). */
    wide?: boolean;
    /** Entrance stagger in seconds. */
    delay?: number;
}

/**
 * A game-menu tile: themed battle backdrop, accent title, live stat,
 * one CTA. Purely presentational — all behavior arrives via props.
 */
const ModeTile: React.FC<ModeTileProps> = ({
    backdropId,
    accent,
    icon,
    title,
    description,
    stat,
    controls,
    action,
    wide = false,
    delay = 0,
}) => (
    <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24, delay }}
        sx={{
            ...backdropSx(backdropId),
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: 190,
            gridColumn: wide ? { xs: 'auto', md: '1 / -1' } : { xs: 'auto', md: 'span 2' },
            border: `1px solid ${surface.border}`,
            transition: 'transform .15s, border-color .15s, box-shadow .15s',
            '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: alpha(accent, 0.6),
                boxShadow: `0 6px 24px ${alpha(accent, 0.25)}`,
            },
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
            {icon}
            <Typography variant="h6" sx={{ fontWeight: 800, color: accent, flexGrow: 1, lineHeight: 1.3 }}>
                {title}
            </Typography>
            {stat}
        </Box>
        <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
            {description}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {controls}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {action}
        </Box>
    </Paper>
);

export default ModeTile;
