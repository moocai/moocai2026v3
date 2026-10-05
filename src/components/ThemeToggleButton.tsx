import { Button, Stack, useMediaQuery, useTheme } from '@mui/material';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useThemeMode } from '../hooks/useTheme';

const themes = [
  { mode: 'light' as const, icon: <Sun size={16} /> },
  { mode: 'dark' as const, icon: <Moon size={16} /> },
  { mode: 'fancy' as const, icon: <Sparkles size={16} /> },
];

export function ThemeToggleButton() {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const cycleTheme = () => {
    const idx = themes.findIndex(t => t.mode === mode);
    const next = themes[(idx + 1) % themes.length];
    setMode(next.mode);
  };

  if (isMobile) {
    const current = themes.find(t => t.mode === mode) || themes[0];
    return (
      <Button onClick={cycleTheme} sx={{ minWidth: '36px', px: 1, fontSize: '0.7rem', fontWeight: 900, borderRadius: '10px', color: '#fff', bgcolor: 'primary.main' }}>
        {current.icon}
      </Button>
    );
  }

  return (
    <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: '12px', p: 0.3, border: '2px solid #8400ff' }}>
      {themes.map((t) => (
        <Button
          key={t.mode}
          onClick={() => setMode(t.mode)}
          sx={{
            minWidth: '36px',
            px: 1,
            fontSize: '0.7rem',
            fontWeight: 900,
            borderRadius: '10px',
            color: mode === t.mode ? '#fff' : 'text.secondary',
            bgcolor: mode === t.mode ? 'primary.main' : 'transparent',
          }}
        >
          {t.icon}
        </Button>
      ))}
    </Stack>
  );
}
