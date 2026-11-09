import { Button, Stack, useMediaQuery, useTheme } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../hooks/useTheme';

const themes = [
  { mode: 'light' as const, icon: <Sun size={16} /> },
  { mode: 'dark' as const, icon: <Moon size={16} /> },
  { mode: 'fancy' as const, icon: <Sparkles size={16} /> },
];

export function ThemeToggleButton() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const cycleTheme = () => {
    const idx = themes.findIndex((option) => option.mode === mode);
    const next = themes[(idx + 1) % themes.length];
    setMode(next.mode);
  };

  if (isMobile) {
    const current = themes.find((option) => option.mode === mode) || themes[0];
    const label = `${t('theme.change')}: ${t(`theme.${current.mode}`)}`;
    return (
      <Button 
        onClick={cycleTheme} 
        aria-label={label} 
        title={label} 
        sx={{ minWidth: '36px', px: 1, fontSize: '0.7rem', fontWeight: 900, borderRadius: '10px', color: 'primary.contrastText', bgcolor: 'primary.main' }}
      >
        {current.icon}
        <span style={visuallyHidden}>{label}</span>
      </Button>
    );
  }

  return (
    <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: '12px', p: 0.3, border: '2px solid #8400ff' }}>
      {themes.map((option) => {
        const optionLabel = t(`theme.${option.mode}`);
        return (
          <Button
            key={option.mode}
            onClick={() => setMode(option.mode)}
            aria-label={optionLabel}
            title={optionLabel}
            aria-pressed={mode === option.mode}
            sx={{
              minWidth: '36px',
              px: 1,
              fontSize: '0.7rem',
              fontWeight: 900,
              borderRadius: '10px',
              color: mode === option.mode ? 'primary.contrastText' : 'text.secondary',
              bgcolor: mode === option.mode ? 'primary.main' : 'transparent',
            }}
          >
            {option.icon}
            <span style={visuallyHidden}>{optionLabel}</span>
          </Button>
        );
      })}
    </Stack>
  );
}