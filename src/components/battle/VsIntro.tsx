import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, Box, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupsIcon from '@mui/icons-material/Groups';

export interface VsIntroPayload {
    leftLabel: string;
    /** Artwork URLs for the player's team row. */
    leftSprites: string[];
    rightLabel: string;
    rightSubLabel?: string;
    /** League trainer portrait URL; falls back to a mode icon. */
    rightPortrait?: string | null;
    rightKind: 'trainer' | 'ai' | 'human';
}

interface VsIntroProps {
    payload: VsIntroPayload;
    onDone: () => void;
}

const INTRO_MS = 2200;

/** Full-screen VS splash before the first move. Click to skip. */
const VsIntro: React.FC<VsIntroProps> = ({ payload, onDone }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, INTRO_MS);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <Box
            onClick={onDone}
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 40,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#0b1026',
            }}
        >
            {/* Player panel */}
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'polygon(0 0, 58% 0, 42% 100%, 0 100%)',
                    background: 'linear-gradient(135deg, #16308a 0%, #0d1b4d 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    paddingLeft: '6%',
                    gap: 12,
                }}
            >
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800 }}>
                    {payload.leftLabel}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {payload.leftSprites.slice(0, 6).map((src, i) => (
                        <motion.img
                            key={i}
                            src={src}
                            alt=""
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 + i * 0.08 }}
                            style={{ width: 64, height: 64, objectFit: 'contain' }}
                        />
                    ))}
                </Box>
            </motion.div>

            {/* Opponent panel */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 42% 100%)',
                    background: 'linear-gradient(315deg, #8a1626 0%, #4d0d1b 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingRight: '6%',
                    gap: 12,
                }}
            >
                {payload.rightPortrait ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }}
                    >
                        <Avatar
                            src={payload.rightPortrait}
                            variant="rounded"
                            sx={{ width: 96, height: 96, imageRendering: 'pixelated', bgcolor: 'rgba(255,255,255,0.08)' }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {payload.rightKind === 'human'
                            ? <GroupsIcon sx={{ fontSize: 84, color: 'rgba(255,255,255,0.85)' }} />
                            : <SmartToyIcon sx={{ fontSize: 84, color: 'rgba(255,255,255,0.85)' }} />}
                    </motion.div>
                )}
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, textAlign: 'right' }}>
                    {payload.rightLabel}
                </Typography>
                {payload.rightSubLabel && (
                    <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'right' }}>
                        {payload.rightSubLabel}
                    </Typography>
                )}
            </motion.div>

            {/* Flash + VS */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 0.35, duration: 0.35, times: [0, 0.4, 1] }}
                style={{ position: 'absolute', inset: 0, background: '#fff', pointerEvents: 'none' }}
            />
            <motion.div
                initial={{ scale: 3, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: -6 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 320, damping: 16 }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }}
            >
                <Typography
                    sx={{
                        fontSize: 96,
                        fontWeight: 900,
                        backgroundImage: 'linear-gradient(135deg, #ffd700 0%, #ff8a65 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        textShadow: 'none',
                        lineHeight: 1,
                    }}
                >
                    VS
                </Typography>
            </motion.div>

            <Typography
                variant="caption"
                sx={{ position: 'absolute', bottom: 12, right: 16, color: 'rgba(255,255,255,0.5)' }}
            >
                click to skip
            </Typography>
        </Box>
    );
};

export default VsIntro;
