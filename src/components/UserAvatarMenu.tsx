import { useNavigate } from 'react-router-dom';
import { Avatar, Box, useTheme } from '@mui/material';

interface Props {
  studentName: string;
}

export function UserAvatarMenu({ studentName }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Avatar
        onClick={() => navigate('/profile')}
        sx={{
          bgcolor: 'primary.main',
          fontWeight: 900,
          fontSize: '1rem',
          width: 40,
          height: 40,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'divider',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        {studentName.charAt(0)}
      </Avatar>
    </Box>
  );
}
