import { Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

const languages = [{code: 'ca', label: 'CA'},{code: 'es', label: 'ES'},{code: 'en', label: 'EN'}];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.split('-')[0] || 'ca') as string;

  return (
    <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: '12px', p: 0.3, border: '2px solid #8400ff' }}>
      {languages.map((lang) => (
        <Button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
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
