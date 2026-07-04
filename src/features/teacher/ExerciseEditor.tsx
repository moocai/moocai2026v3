import { useState } from 'react';
import { Box, TextField, Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CodePreview } from './CodePreview';
import { useTranslation } from 'react-i18next';

interface ExerciseEditorProps {
  initialCode?: string;
  hint?: string;
  solution?: string;
  onCodeChange?: (code: string) => void;
}

export function ExerciseEditor({ initialCode = '', hint, solution, onCodeChange }: ExerciseEditorProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);

  const handleChange = (v: string) => {
    setCode(v);
    onCodeChange?.(v);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { lg: 'row' }, gap: 2, height: { lg: 500 } }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, bgcolor: '#2d2d2d', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f57' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#28c840' }} />
            <Typography variant="caption" sx={{ color: 'grey.500', ml: 2 }}>App.tsx</Typography>
          </Box>
          <TextField
            multiline
            fullWidth
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            variant="standard"
            slotProps={{ input: { disableUnderline: true, sx: { fontFamily: '"Fira Code", "Consolas", monospace', fontSize: 13, color: '#d4d4d4', p: 2 } } }}
            sx={{ flex: 1, '& .MuiInputBase-root': { bgcolor: '#1e1e1e', height: '100%', alignItems: 'flex-start' } }}
          />
        </Box>
        {hint && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.pista')}</Typography></AccordionSummary>
            <AccordionDetails><Typography variant="body2" color="text.secondary">{hint}</Typography></AccordionDetails>
          </Accordion>
        )}
        {solution && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.solucion')}</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>{solution}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
      <Box sx={{ flex: 1, display: { xs: 'none', lg: 'block' } }}>
        <CodePreview code={code} />
      </Box>
    </Box>
  );
}