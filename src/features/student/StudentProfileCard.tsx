import {Box, Typography, Card, Avatar, LinearProgress, IconButton, useTheme} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import {useTranslation} from 'react-i18next';

interface Props {
  student: { id: string; name: string };
  totalPoints: number;
  actionLoading: boolean;
  onLogout: () => void;
}

export function StudentProfileCard({ student, totalPoints, actionLoading, onLogout }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hoverBg = theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'action.hover';

  return (
    <Card sx={{ p: { xs: 2, md: 4 }, borderRadius: { xs: 2, md: 1 }, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : 'white', position: 'relative', border: '1px solid', borderColor: 'primary.main' + '33', minWidth: 0, maxWidth: '280px', width: '100%', mt: { xs: '20px', md: '30px !important' }}}>
      {actionLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} color="secondary" />}
      <Avatar sx={{ width: { xs: 40, md: 80 }, height: { xs: 40, md: 80 }, mx: 'auto', mb: 1, bgcolor: 'primary.main', fontWeight: 900, fontSize: { xs: '1rem', md: '2rem' } }}>{student.name.charAt(0)}</Avatar>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, minWidth: 0, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 0, wordBreak: 'break-word', fontSize: { xs: '0.85rem', md: '1.25rem' } }}>{student.name}</Typography>
        <IconButton size="small" onClick={onLogout} sx={{ color: 'red', '&:hover': { color: 'error.main', bgcolor: hoverBg }, flexShrink: 0 }}>
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ mt: { xs: 1, md: 3 }, p: 1, bgcolor: hoverBg, borderRadius: '1rem' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: { xs: '1rem', md: '1rem' } }}>
            {totalPoints} {t('dashboard.points')}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
