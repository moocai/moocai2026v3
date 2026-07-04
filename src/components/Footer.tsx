import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Link as MuiLink, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTranslation } from 'react-i18next'; 
const logo = '/img/logo.webp';

interface FooterLinkProps {children: ReactNode;to?: string;href?: string;}

function FooterLink({ children, to, href }: FooterLinkProps) {const styles = { color: 'text.primary', fontWeight: 600, fontSize: { xs: '0.9rem', md: '1rem' }, textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'inline-block', '&:hover': { color: 'primary.main', transform: 'translateX(6px)' } };
  if (to) return <RouterLink to={to} style={{ textDecoration: 'none' }}><Box component="span" sx={styles}>{children}</Box></RouterLink>;
  return <MuiLink href={href} target="_blank" rel="noopener noreferrer" sx={styles}>{children}</MuiLink>;
}

export function Footer() {
  const { t } = useTranslation();
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" sx={{position: 'relative', overflow: 'hidden', pt: {xs: 6, md: 10}, pb: 5}}>
      <motion.div>
        <Box sx={{position: 'absolute',width: { xs: '300px', md: '1000px' }, height: '300px'}}/>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1}}>
          <Grid container spacing={{ xs: 4, md: 10}}>
            
            {/* Logo & Tagline */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ textAlign: { xs: 'center', md: 'left' }}}>
             <RouterLink to="/" style={{ textDecoration: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, gap: 2, mb: 3 }}>
                  <Box component="img" src={logo} alt="RocketFooter" width={438} height={190} sx={{ height: { xs: 22, md: 50 }, width: 'auto', transform: { xs: 'rotate(-90deg)', md: 'none' }, transition: 'transform 0.5s', filter: 'drop-shadow(0 0 12px ' + theme.palette.primary.main + '80)' }} />
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-1px', fontSize: { xs: '1.4rem', md: '1.75rem' } }}>MOOC</Typography>
                    <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: '-1px', fontSize: { xs: '1.4rem', md: '1.75rem' }, ml: 0.5 }}>2026</Typography>
                  </Box>
                </Box>
              </RouterLink>
              <Typography variant="body1" component="p" sx={{ color: 'text.primary', lineHeight: 1.6, maxWidth: {xs: '300px', md: '380px' }, mx: { xs: 'auto', md: 'unset' }, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>{t('footer.brand_tagline')}</Typography>
            </Grid>

            {/* Links Explora */}
            <Grid size={{ xs: 6, md: 2 }} sx={{ textAlign: { xs: 'center', md: 'center' }}}>
              <Typography variant="subtitle2" component="p" sx={{ color: 'text.primary', fontWeight: 800, mb: 3,mt:1, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.7rem'}}>{t('footer.explore')}</Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5}}>
                <li><FooterLink to="/dashboards/student">{t('Accedir')}</FooterLink></li>
              </Box>
            </Grid>


            {/* Links Comunitat */}
            <Grid size={{ xs: 6, md: 2 }} sx={{ textAlign: { xs: 'center', md: 'center' } }}>
              <Typography variant="subtitle2" component="p" sx={{ color: 'text.primary', fontWeight: 800, mb: 3,mt:1, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.7rem' }}>{t('footer.community')}</Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none', display: 'flex', flexDirection: 'column'}}>
                <li><FooterLink to='#'>{t('footer.telegram')}</FooterLink></li>
              </Box>
            </Grid>

            {/* Social Connect */}
            <Grid size={{ xs: 12, md: 2 }} sx={{ textAlign: { xs: 'center', md: 'center' } }}>
              <Typography variant="subtitle2" component="p" sx={{ color: 'text.primary', fontWeight: 800, mb: 3,mt:1, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.7rem' }}>{t('footer.connect')}</Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'center' } }}>
                {['TL'].map((social) => (
                  <Box key={social} component="a" href="#" sx={{ width: { xs: 42, md: 50 }, height: { xs: 42, md: 50 }, borderRadius: '12px', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? 'white' : 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.primary', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 800, transition: '0.4s', '&:hover': { borderColor: 'primary.main', color: 'primary.main', transform: 'translateY(-5px)' } }}>
                    {social}
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>

          {/* Bottom Bar */}
          <Box sx={{ mt: { xs: 6, md: 4 }, pt: 4,borderTop: '3px solid #8400ff', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'center', alignItems: 'center', gap: { xs: 2, md: 4 }}}>
            <Typography sx={{ color: 'text.primary', fontSize: { xs: '0.7rem', md: '0.8rem' }, fontWeight: 600 }}>
              © {currentYear} {t('footer.copyright')} ©
            </Typography>
          </Box>
        </Container>
      </motion.div>
    </Box>
  );
}