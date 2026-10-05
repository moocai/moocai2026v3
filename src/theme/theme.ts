import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'fancy';

export function getTheme(mode: ThemeMode): Theme {
  const isFancy = mode === 'fancy';

  return createTheme({
    palette: {
      mode: isFancy ? 'dark' : mode,
      ...(mode === 'dark'
        ? {
            primary: { main: '#9f5fff' },
            secondary: { main: '#ec4899' },
            background: { default: '#111827', paper: '#1f2937' },
            text: { primary: '#f1f5f9', secondary: '#cbd5e1' },
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
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
          ...(mode === 'dark'
            ? {
                contained: {
                  backgroundColor: '#9f5fff',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#b380ff' },
                  '&:active': { backgroundColor: '#8400ff' },
                },
                outlined: {
                  borderColor: '#9f5fff',
                  color: '#c9a8ff',
                  '&:hover': { borderColor: '#b380ff', backgroundColor: 'rgba(159,95,255,0.08)' },
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
                  borderColor: '#9f5fff',
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
                  '&.MuiAlert-standardInfo': { backgroundColor: 'rgba(159,95,255,0.12)', color: '#c9a8ff' },
                  '&.MuiAlert-standardInfo .MuiAlert-icon': { color: '#9f5fff' },
                },
              }
            : {}),
        },
      },
    },
  });
}
