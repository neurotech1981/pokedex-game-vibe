import { createTheme, alpha } from '@mui/material/styles';

export const surface = {
  base: '#0b0f1a',
  raised: '#131a2b',
  overlay: '#1a2338',
  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(148, 163, 184, 0.28)',
};

export const accent = {
  blue: '#4f8ef7',
  violet: '#8b7cf7',
  gradient: 'linear-gradient(135deg, #4f8ef7 0%, #8b7cf7 100%)',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: accent.blue },
    secondary: { main: accent.violet },
    error: { main: '#f87171' },
    warning: { main: '#fbbf24' },
    success: { main: '#34d399' },
    info: { main: '#38bdf8' },
    background: {
      default: surface.base,
      paper: surface.raised,
    },
    divider: surface.border,
    text: {
      primary: '#e7ecf5',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: 'Montserrat, Poppins, Roboto, Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { fontSize: '0.95rem' },
    body2: { fontSize: '0.85rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: surface.base,
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79, 142, 247, 0.13), transparent), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(139, 124, 247, 0.08), transparent)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(148, 163, 184, 0.25)',
          borderRadius: 4,
          '&:hover': {
            background: 'rgba(148, 163, 184, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${surface.border}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha(surface.base, 0.82),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${surface.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        },
        containedPrimary: {
          background: accent.gradient,
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #619af8 0%, #9a8df8 100%)',
            boxShadow: `0 4px 16px ${alpha(accent.blue, 0.35)}`,
          },
          '&.Mui-disabled': {
            background: 'rgba(148, 163, 184, 0.12)',
          },
        },
        outlined: {
          borderColor: surface.borderStrong,
          '&:hover': {
            borderColor: accent.blue,
            backgroundColor: alpha(accent.blue, 0.08),
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          background: accent.gradient,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          minHeight: 44,
          '&.Mui-selected': {
            color: '#fff',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: surface.borderStrong,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: surface.overlay,
          border: `1px solid ${surface.borderStrong}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: surface.overlay,
          border: `1px solid ${surface.borderStrong}`,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(148, 163, 184, 0.15)',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${surface.border}`,
        },
      },
    },
  },
});

export default theme;
