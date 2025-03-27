import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A90E2', // Cool blue
      light: '#6BA5E5',
      dark: '#2C5A8F',
    },
    secondary: {
      main: '#9B59B6', // Purple
      light: '#B07CC6',
      dark: '#7B3A8F',
    },
    background: {
      default: '#1A1A2E', // Dark navy
      paper: '#16213E', // Slightly lighter navy
    },
    text: {
      primary: '#E6E6E6',
      secondary: '#B3B3B3',
    },
  },
  typography: {
    fontFamily: '"Press Start 2P", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: '#FF0000',
      textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
    },
    h2: {
      color: '#2A75BB', // Pokemon Blue
      textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          border: '2px solid #FFD700',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
        <ReactQueryDevtools initialIsOpen />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
