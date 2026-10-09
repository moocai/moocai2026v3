import { Box, Dialog, DialogContent, DialogTitle, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Keyboard, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const CTRL = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? '⌥' : 'Alt';

function Kbd({ children }: { children: string }) {
  return (
    <Box component="kbd" sx={{ display: 'inline-block', px: 0.75, py: 0.1, mx: 0.25, borderRadius: 0.75, border: '1px solid', borderColor: 'divider', borderBottomWidth: 2, fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, bgcolor: 'action.hover' }}>
      {children}
    </Box>
  );
}

/** Dreceres de teclat de l'editor (les mateixes que a algorien). */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const rows: Array<[string, React.ReactNode]> = [
    [t('lesson.sc_run', 'Executar el codi'), <><Kbd>Shift</Kbd>+<Kbd>Enter</Kbd></>],
    [t('lesson.sc_submit', 'Enviar el codi'), <><Kbd>{CTRL}</Kbd>+<Kbd>Enter</Kbd></>],
    [t('lesson.sc_comment', 'Comentar / descomentar'), <><Kbd>{CTRL}</Kbd>+<Kbd>/</Kbd></>],
    [t('lesson.sc_copy_line', 'Copiar / tallar / enganxar la línia'), <><Kbd>{CTRL}</Kbd>+<Kbd>C</Kbd>/<Kbd>X</Kbd>/<Kbd>V</Kbd></>],
    [t('lesson.sc_suggestion', 'Acceptar el suggeriment'), <Kbd>Tab</Kbd>],
    [t('lesson.sc_next_occurrence', 'Seleccionar la següent coincidència'), <><Kbd>{CTRL}</Kbd>+<Kbd>D</Kbd></>],
    [t('lesson.sc_move_line', 'Moure la línia amunt / avall'), <><Kbd>{ALT}</Kbd>+<Kbd>↑</Kbd>/<Kbd>↓</Kbd></>],
    [t('lesson.sc_multicursor', 'Afegir un cursor'), <><Kbd>{ALT}</Kbd>+{t('lesson.sc_click', 'clic')}</>],
    [t('lesson.sc_find', 'Cercar'), <><Kbd>{CTRL}</Kbd>+<Kbd>F</Kbd></>],
    [t('lesson.sc_undo', 'Desfer / refer'), <><Kbd>{CTRL}</Kbd>+<Kbd>Z</Kbd> / <Kbd>{CTRL}</Kbd>+<Kbd>Y</Kbd></>],
  ];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
        <Keyboard size={20} /> {t('lesson.shortcuts_title', 'Dreceres de teclat')}
        <IconButton onClick={onClose} aria-label={t('lesson.close', 'Tanca')} sx={{ ml: 'auto' }}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, pl: 3 }}>{t('lesson.sc_action', 'Acció')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('lesson.sc_shortcut', 'Drecera')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(([action, keys]) => (
              <TableRow key={action}>
                <TableCell sx={{ pl: 3 }}>{action}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{keys}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
