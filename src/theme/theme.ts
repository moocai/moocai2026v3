import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'fancy';

export function getTheme(mode: ThemeMode): Theme {
  const isFancy = mode === 'fancy';

  return createTheme({
    palette: {
      mode: isFancy ? 'dark' : mode,
      ...(mode === 'dark'
        ? {
            primary: { main: '#8400ff' },
            secondary: { main: '#f472b6' },
            error: { main: '#ff8a80' },
            background: { default: '#111827', paper: '#1f2937' },
            text: { primary: '#f1f5f9', secondary: '#cbd5e1' },
          }
        : mode === 'fancy'
          ? {
              primary: { main: '#8400ff' },
              secondary: { main: '#f472b6' },
              error: { main: '#ff8a80' },
              background: { default: '#141414', paper: '#141414' },
              text: { primary: '#e4e4e4', secondary: '#e4e4e4' },
            }
          : {
              primary: { main: '#8400ff' },
              secondary: { main: '#ec4899' },
              // Hex, no 'white': alpha() de MUI no accepta noms de color i peta la pàgina
              background: { default: '#ffffff', paper: '#ffffff' },
            }),
    },
    typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
          ...(mode === 'dark' || mode === 'fancy'
            ? {
                contained: {
                  backgroundColor: mode === 'dark' ? '#7c3aed' : '#8400ff',
                  color: '#fff',
                  '&:hover': { backgroundColor: mode === 'dark' ? '#6d28d9' : '#7200db' },
                  '&:active': { backgroundColor: mode === 'dark' ? '#5b21b6' : '#5c00b3' },
                },
                outlined: {
                  borderColor: '#b18cff',
                  color: '#c9a8ff',
                  '&:hover': { borderColor: '#c9a8ff', backgroundColor: 'rgba(177,140,255,0.08)' },
                },
              }
            : {}),
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiChip: {
        styleOverrides: {
          ...(mode === 'dark'
            ? {
                outlined: {
                  borderColor: '#b18cff',
                  color: '#c9a8ff',
                },
              }
            : {}),
        },
      },
      MuiAlert: {
        styleOverrides: {
          ...(mode === 'dark'
            ? {
                root: {
                  '&.MuiAlert-standardInfo': { backgroundColor: 'rgba(177,140,255,0.12)', color: '#c9a8ff' },
                  '&.MuiAlert-standardInfo .MuiAlert-icon': { color: '#b18cff' },
                },
              }
            : {}),
        },
      },
    },
  });
}
