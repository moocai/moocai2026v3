import { Button, Stack } from '@mui/material';
import { useI18n } from '../hooks/useI18n';

const languages = [{code: 'ca', label: 'CA'},{code: 'es', label: 'ES'},{code: 'en', label: 'EN'}];

export function LanguageSwitcher() {
  // El mateix idioma (i la mateixa manera de triar-lo) que el selector del perfil
  const { language: currentLang, setLanguage } = useI18n();

  return (
    <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: '12px', p: 0.3, border: '2px solid #8400ff' }}>
      {languages.map((lang) => (
        <Button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          sx={{
            minWidth: '36px',
            px: 1,
            py: 1,
            lineHeight: 1,
            fontSize: '0.7rem',
            fontWeight: 900,
            borderRadius: '10px',
            color: currentLang === lang.code ? '#fff' : 'text.secondary',
            bgcolor: currentLang === lang.code ? 'primary.main' : 'transparent',
          }}
        >
          {lang.label}
        </Button>
      ))}
    </Stack>
  );
}
