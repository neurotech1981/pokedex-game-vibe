import type { WeatherType } from '../../utils/battleEngine';
import type { BackgroundId } from '../../data/battleBackgrounds';
import { backgroundUrl } from '../../data/battleBackgrounds';

/** Shared battle-UI constants and helpers. */

/**
 * Backdrop-image recipe for game-mode surfaces: a bundled battle background
 * behind a dark vertical gradient so text keeps contrast. `isolation:
 * isolate` keeps children (dialogs/alerts) above the ::before layer.
 */
export const backdropSx = (id: BackgroundId) => ({
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        backgroundImage: `linear-gradient(180deg, rgba(11,15,26,0.72) 0%, rgba(11,15,26,0.9) 70%, #0e1424 100%), url(${backgroundUrl(id)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
} as const);

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const STATUS_LABELS: Record<string, string> = {
    paralysis: 'PAR',
    sleep: 'SLP',
    poison: 'PSN',
    burn: 'BRN',
    freeze: 'FRZ',
    confusion: 'CNF',
};

export const STATUS_COLORS: Record<string, string> = {
    paralysis: '#ffc107',
    sleep: '#9e9e9e',
    poison: '#9c27b0',
    burn: '#f44336',
    freeze: '#2196f3',
    confusion: '#7e57c2',
};

export const WEATHER_LABELS: Record<WeatherType, string> = {
    none: 'Clear',
    rain: 'Rain',
    sunny: 'Sunny',
    sandstorm: 'Sandstorm',
    hail: 'Hail',
};

export const STAT_ABBR: Record<string, string> = { attack: 'ATK', defense: 'DEF', speed: 'SPE' };

export const hpColor = (pct: number) => (pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ffa726' : '#f44336');
