import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface BattleLogEntry {
    id: number;
    message: string;
    type: 'normal' | 'critical' | 'death' | 'victory';
    timestamp: number;
}

interface BattleLogProps {
    logs: Array<BattleLogEntry | null>;
}

const TYPE_COLORS: Record<BattleLogEntry['type'], string> = {
    normal: '#cbd5e1',
    critical: '#fbbf24',
    death: '#f87171',
    victory: '#34d399',
};

const BattleLog: React.FC<BattleLogProps> = ({ logs }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [logs]);

    return (
        <Box
            ref={containerRef}
            sx={{
                height: '100%',
                minHeight: 160,
                overflowY: 'auto',
                backgroundColor: 'rgba(8, 12, 24, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 2,
                px: 1.5,
                py: 1,
            }}
        >
            {logs.map(log =>
                log ? (
                    <Typography
                        key={log.id}
                        variant="body2"
                        sx={{
                            color: TYPE_COLORS[log.type],
                            fontWeight: log.type === 'normal' ? 400 : 700,
                            fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
                            fontSize: '0.78rem',
                            lineHeight: 1.6,
                            py: 0.2,
                        }}
                    >
                        {log.message}
                    </Typography>
                ) : null
            )}
        </Box>
    );
};

export default BattleLog;
