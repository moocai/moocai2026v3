import {useState, type MouseEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {motion} from 'framer-motion';
import {Box, Card, TextField, Button, Avatar, Stack, IconButton, Typography, useTheme} from '@mui/material';
import {Lock, Trash2, X, Check} from 'lucide-react';
import {Student} from './types';

export function StudentCard({ student, onLogin, onDelete, error }: { 
  student: Student, onLogin: (s: Student, code: string) => void, onDelete: (id: string, pin: string) => boolean, error: boolean 
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [pin, setPin] = useState("");
  const [deletePin, setDeletePin] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = (e: MouseEvent) => {
    e.stopPropagation();
    if (onDelete(student.id, deletePin)) {
      setIsDeleting(false);
    } else {
      alert(t('auth.incorrect_pin'));
      setDeletePin("");
    }
  };

  return (
    <motion.div style={{ position: 'relative' }} whileHover={{ y: -5 }} animate={error ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
      <Box sx={{ position: 'absolute', top: 1.5, right: 1.5, zIndex: 10 }}>
        {!isDeleting ? (
          <IconButton onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }} size="small" sx={{ bgcolor: 'transparent !important', '&:hover': { bgcolor: 'transparent !important' }, '&:hover svg': { color: 'error.main' } }}>
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}><Trash2 size={14} /></Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, mt:2, ml:-5 }}><Trash2 size={18} /></Box>
          </IconButton>
        ) : (
          <Stack direction="row" spacing={1} sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: '8px', border: '1px solid', borderColor: 'error.main', alignItems: 'center' }}>
            <TextField size="small" placeholder="PIN" type="password" value={deletePin} autoFocus onChange={(e) => setDeletePin(e.target.value)} slotProps={{ htmlInput: { maxLength: 4, style: { color: 'text.primary', fontSize: '12px', width: '40px', padding: '4px', textAlign: 'center' } } }} />
            <IconButton onClick={handleConfirmDelete} size="small" sx={{ color: 'success.main' }}><Check size={16} /></IconButton>
            <IconButton onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }} size="small" sx={{ color: 'text.secondary' }}><X size={16} /></IconButton>
          </Stack>
        )}
      </Box>

      <Card sx={{ p: { xs: 1, md: 2.5}, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: {md: 3}, border: '2px solid', borderColor: error ? 'error.main' : (theme.palette.mode === 'dark' ? '#fff' : '#000'), minWidth: 0, height: '100%', '&:hover': { borderColor: 'primary.main' } }}>
        <Avatar sx={{ width: { xs: 30, md: 60 }, height: { xs: 30, md: 60 }, bgcolor: 'primary.main', fontSize: { xs: '1rem', md: '2rem' }, fontWeight: 900, borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>{student.name.charAt(0)}</Avatar>
        <Typography variant="h6" sx={{ fontWeight: 900, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{student.name}</Typography>
        <Stack spacing={1} sx={{ width: '100%' , mt:2}}>
          <TextField fullWidth type="password" placeholder={t('dashboard.pin_label')} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onLogin(student, pin)} autoComplete="off"/>
          <Button variant="contained" fullWidth size="large" onClick={() => onLogin(student, pin)} startIcon={<Lock size={18} />}>{t('auth.login')}</Button>
        </Stack>
      </Card>
    </motion.div>
  );
}
