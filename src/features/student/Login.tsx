import {motion} from 'framer-motion';
import {Box, Typography, Card, TextField, Button, Stack, IconButton, useTheme} from '@mui/material';
import {UserPlus, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Student} from './types';
import {StudentCard} from './StudentCard';
import { type FormEvent } from 'react';

interface LoginProps {
  students: Student[];
  newRole: 'student' | 'teacher';
  onRoleChange: (role: 'student' | 'teacher') => void;
  showCreateForm: boolean;
  onShowCreateForm: (show: boolean) => void;
  newName: string;
  onNewNameChange: (name: string) => void;
  newEmail: string;
  onNewEmailChange: (email: string) => void;
  newPin: string;
  onNewPinChange: (pin: string) => void;
  onCreateStudent: (e: FormEvent) => void;
  onLogin: (student: Student, pin: string) => void;
  onDeleteStudent: (id: string, pin: string) => boolean;
  errorId: string | null;
}

export function Login({
  students,
  newRole,
  onRoleChange,
  showCreateForm,
  onShowCreateForm,
  newName,
  onNewNameChange,
  newEmail,
  onNewEmailChange,
  newPin,
  onNewPinChange,
  onCreateStudent,
  onLogin,
  onDeleteStudent,
  errorId,
}: LoginProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', mb: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{t('dashboard.title')}</Typography>
        <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '10px', p: 0.5, position: 'relative', width: '200px', height: '36px', cursor: 'pointer' }}>
          <Box sx={{ position: 'absolute', top: 3, bottom: 3, left: newRole === 'student' ? 3 : 'calc(50% + 1px)', width: 'calc(50% - 4px)', bgcolor: 'primary.main', borderRadius: '8px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
          <Button disableRipple onClick={() => onRoleChange('student')} sx={{ flex: 1, zIndex: 1, borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', color: newRole === 'student' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
          <Button disableRipple onClick={() => onRoleChange('teacher')} sx={{ flex: 1, zIndex: 1, borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', color: newRole === 'teacher' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
        </Box>
      </Stack>

      <Box sx={{flex: 1,overflowY: 'auto',overflowX: 'hidden',pb: 2,}}>
      <Box sx={{display: 'flex',flexDirection: { xs: 'column', md: 'row' },gap: { xs: 2, md: 4 },alignItems: 'flex-start',}}>

        <Box sx={{ width: { xs: '100%', md: '320px' }, flexShrink: 0, minWidth: 0 }}>
          {!showCreateForm ? (
            <Card onClick={() => onShowCreateForm(true)} sx={{p: { xs: 2, md: 4 },display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',borderRadius: { xs: 3, md: 3},border: '2px dashed', borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000',bgcolor: 'background.paper',height: '100%', minHeight: { xs: 160, md: 210 },cursor: 'pointer', transition: 'all 0.3s ease','&:hover': { borderColor: 'primary.main', '& *': { color: 'primary.main' } }}}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', border: '2px dashed', borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <UserPlus size={20} color={theme.palette.text.secondary} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 900, color: 'text.secondary' }}>
                {newRole === 'teacher' ? t('dashboard.create_teacher_title') : t('dashboard.create_user_title')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, textAlign: 'center' }}>
                {t('dashboard.click_to_login')}
              </Typography>
            </Card>
          ) : (
            <Card sx={{ p: { xs: 2, md: 5 }, borderRadius: { xs: 2, md: 1}, bgcolor: 'background.paper', border: '2px dashed', borderColor: 'primary.main' + '4D', height: 'fit-content' }}>
              <Stack spacing={{ xs: 2, md: 3 }} component="form" onSubmit={onCreateStudent}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <UserPlus size={18} color={theme.palette.primary.main} />
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{newRole === 'teacher' ? t('dashboard.create_teacher_title') : t('dashboard.create_user_title')}</Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => onShowCreateForm(false)} sx={{ color: 'text.secondary' }}><X size={18} /></IconButton>
                </Stack>

                <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '12px', p: 0.5, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, bottom: 4, left: newRole === 'student' ? 4 : 'calc(50% + 2px)', width: 'calc(50% - 6px)', bgcolor: 'primary.main', borderRadius: '10px', transition: 'left 0.25s ease' }} />
                  <Button type="button" disableRipple onClick={() => onRoleChange('student')} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', py: 0.75, fontWeight: 800, fontSize: '0.8rem', textTransform: 'none', color: newRole === 'student' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
                  <Button type="button" disableRipple onClick={() => onRoleChange('teacher')} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', py: 0.75, fontWeight: 800, fontSize: '0.8rem', textTransform: 'none', color: newRole === 'teacher' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
                </Box>

                <TextField fullWidth label={t('dashboard.name_label')} variant="filled" value={newName} onChange={e => onNewNameChange(e.target.value)} required sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } }} />
                <TextField fullWidth label={t('dashboard.email_label')} variant="filled" value={newEmail} onChange={e => onNewEmailChange(e.target.value)} required sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } }} />
                <TextField fullWidth label={t('dashboard.pin_label')} variant="filled" type="password" value={newPin} onChange={e => onNewPinChange(e.target.value)} required slotProps={{ htmlInput: { maxLength: 20 } }} sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } }} />

                <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  {newRole === 'teacher' ? 'Registrar Professor' : 'Registrar Estudiant'}
                </Button>
              </Stack>
            </Card>
          )}
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' }, width: '2px', height: '100%', minHeight: '500px', bgcolor: 'divider', borderRadius: 1, alignSelf: 'stretch' }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{display: 'grid',gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(200px, 1fr))' },gap: 3,alignItems: 'start',mt:2}}>
            {students.filter(s => newRole === 'teacher' ? s.role === 'teacher' : (s.role === 'student' || !s.role))
              .map(s => (<Box key={s.id} sx={{ minWidth: 0 }}><StudentCard student={s} onLogin={onLogin} onDelete={onDeleteStudent} error={errorId === s.id} /></Box>))}
          </Box>
        </Box>

      </Box>
      </Box>
    </motion.div>
  );
}
