import { createContext, use, useState, useEffect, ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme, type ThemeMode } from '../theme/theme';
import ParticlesBackground from '../components/ParticlesBackground';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'mooc-theme-mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'fancy') return stored;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    if (mode === 'fancy') {
      document.body.style.backgroundColor = 'transparent';
    } else {
      document.body.style.backgroundColor = '';
    }
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    document.documentElement.setAttribute('data-theme', newMode);
    document.body.style.backgroundColor = newMode === 'fancy' ? 'transparent' : '';
  };

  // Circular rotation: light -> dark -> fancy -> light
  const toggleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'fancy'];
    const nextIndex = (order.indexOf(mode) + 1) % order.length;
    setMode(order[nextIndex]);
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {/* Particles només es renderitzen al DOM en mode fancy */}
        {mode === 'fancy' && <ParticlesBackground />}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
}
