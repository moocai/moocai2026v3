import { useTheme } from '@mui/material';

// Colors de les sèries "programació" i "tests" a tots els gràfics (tauler i estadístiques),
// validats (separació per daltonisme i contrast) sobre el fons de les targetes en clar i en
// fosc: programació = el color principal del tema, tests = verd blavós.
export const TESTS_COLOR = '#0d9488';

export function useSeriesColors() {
  const theme = useTheme();
  return { coding: theme.palette.primary.main, tests: TESTS_COLOR };
}
