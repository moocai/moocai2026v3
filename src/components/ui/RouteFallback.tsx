import { Box, Container, Skeleton, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function RouteFallback() {
  const { t } = useTranslation();

  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
      sx={{ width: '100%', px: { xs: 2, md: 8 }, py: { xs: 2, md: 4 } }}
    >
      <Container maxWidth="lg" disableGutters>
        <Skeleton variant="text" width="45%" height={44} sx={{ mb: 3, borderRadius: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ flex: 1, borderRadius: 3 }} />
          ))}
        </Stack>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
      </Container>
    </Box>
  );
}
