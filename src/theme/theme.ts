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
            secondary: { main: '#ec4899' },
            background: { default: '#111827', paper: ' #1f2937' },
          }
        : mode === 'fancy'
          ? {
              primary: { main: '#8400ff' },
              secondary: { main: '#ec4899' },
              background: { default: '#141414', paper: '#141414' },
              text: { primary: '#e4e4e4', secondary: '#e4e4e4' },
            }
          : {
              primary: { main: '#8400ff' },
              secondary: { main: '#ec4899' },
              background: { default: 'white', paper: 'white' },
            }),
    },
    typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
    },
  });
}
