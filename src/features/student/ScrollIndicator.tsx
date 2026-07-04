import {Box, Typography} from '@mui/material';
import {motion} from 'framer-motion';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {useTranslation} from 'react-i18next';

export function ScrollIndicator() {
  const { t } = useTranslation();

  return (
    <Box sx={{display: { xs: 'flex', md: 'none' }, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 11,width: '100%',my: 4}}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '20px', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Box key={`left-${i}`} component={motion.div} animate={{ opacity: [0, 1, 0], y: [0, 5, 10] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }} sx={{mt: i === 0 ? -2 : -3, display: 'flex', color: 'text.primary'}}>
            <KeyboardArrowDownIcon sx={{ fontSize: '1.2rem' }} />
          </Box>
        ))}
      </Box>
      <Typography sx={{fontSize: '0.6rem',fontWeight: 900, letterSpacing: '0.25em',color: 'text.primary', textTransform: 'uppercase', mx: 1}}>{t('dashboard.leaderboard')}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '20px', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Box key={`right-${i}`} component={motion.div} animate={{ opacity: [0, 1, 0], y: [0, 5, 10] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}sx={{mt: i === 0 ? -2 : -3,display: 'flex', color: 'text.primary'}}>
            <KeyboardArrowDownIcon sx={{ fontSize: '1.2rem' }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
