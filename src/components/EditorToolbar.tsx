import { useState, type ReactNode } from 'react';
import { Box, CircularProgress, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { Bot, GraduationCap, History, Keyboard, MoreHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

/** Una versió del codi que es pot carregar a l'editor (esborrany local, còpia del servidor...). */
export interface CodeVersion {
  id: 'local' | 'backup' | 'submitted' | 'starter';
  code: string | null;
  at?: string | null;
}

const VERSION_ORDER: CodeVersion['id'][] = ['local', 'backup', 'submitted', 'starter'];

function relativeTime(iso: string | null | undefined, t: TFunction, lang: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('lesson.time_just_now', 'ara mateix');
  if (min < 60) return t('lesson.time_min_ago', 'fa {{n}} min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('lesson.time_h_ago', 'fa {{n}} h', { n: h });
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

function ToolButton({ title, onClick, disabled, children }: { title: string; onClick: (e: React.MouseEvent<HTMLElement>) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip title={title} arrow>
      {/* El span manté el tooltip encara que el botó estigui desactivat */}
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <IconButton size="small" onClick={onClick} disabled={disabled} aria-label={title} sx={{ color: '#d1d5db', borderRadius: 1, px: 0.75, '&:hover': { bgcolor: '#222', color: '#fff' }, '&.Mui-disabled': { color: '#555' } }}>
          {children}
        </IconButton>
      </Box>
    </Tooltip>
  );
}

/**
 * Eines de l'editor (com a algorien): pista d'IA, Python Tutor, dreceres, versions del codi
 * i zoom. Amb poc espai (`compact`) es plega en un menú "···".
 */
export function EditorToolbar({ compact, onAiHint, aiBusy, hintsRemaining, onPythonTutor, onShortcuts, loadVersions, activeVersion, onPickVersion, onZoomIn, onZoomOut }: {
  compact: boolean;
  onAiHint: () => void;
  aiBusy: boolean;
  hintsRemaining: number | null;
  onPythonTutor: () => void;
  onShortcuts: () => void;
  loadVersions: () => Promise<CodeVersion[]>;
  activeVersion: CodeVersion['id'] | null;
  onPickVersion: (v: CodeVersion) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [versionsAnchor, setVersionsAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [versions, setVersions] = useState<CodeVersion[] | null>(null);

  const versionLabel: Record<CodeVersion['id'], string> = {
    local: t('lesson.version_local', 'Esborrany local'),
    backup: t('lesson.version_backup', 'Desat automàtic (servidor)'),
    submitted: t('lesson.version_submitted', 'Últim enviament'),
    starter: t('lesson.version_starter', 'Codi inicial'),
  };
  const aiTitle = hintsRemaining === null
    ? t('lesson.hint_button', 'Pista d\'IA')
    : t('lesson.hint_button_remaining', 'Pista d\'IA ({{count}} restants avui)', { count: hintsRemaining });

  const openVersions = (anchor: HTMLElement) => {
    setVersionsAnchor(anchor);
    setVersions(null);
    // Es consulten en obrir el menú (còpia i enviament venen del servidor)
    loadVersions().then(setVersions).catch(() => setVersions([]));
  };

  const versionsMenu = (
    <Menu anchorEl={versionsAnchor} open={!!versionsAnchor} onClose={() => setVersionsAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <Typography sx={{ px: 2, py: 0.5, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
        {t('lesson.version_title', 'Carrega una versió')}
      </Typography>
      {versions === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5, width: 260 }}><CircularProgress size={20} /></Box>
      ) : VERSION_ORDER.map((id) => {
        const v = versions.find((x) => x.id === id) ?? { id, code: null };
        const available = !!v.code;
        return (
          <MenuItem key={id} disabled={!available} selected={activeVersion === id} onClick={() => { setVersionsAnchor(null); onPickVersion(v); }} sx={{ minWidth: 260, gap: 1.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, ...(activeVersion === id ? { bgcolor: '#8400ff' } : { border: '1px solid', borderColor: 'text.disabled' }) }} />
            <ListItemText primary={versionLabel[id]} slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>{relativeTime(v.at, t, i18n.language)}</Typography>
          </MenuItem>
        );
      })}
    </Menu>
  );

  const aiIcon = aiBusy ? <CircularProgress size={14} color="inherit" /> : <Bot size={17} />;

  if (compact) {
    const close = () => setMoreAnchor(null);
    return (
      <>
        <ToolButton title={t('lesson.more_tools', 'Més eines')} onClick={(e) => setMoreAnchor(e.currentTarget)}><MoreHorizontal size={18} /></ToolButton>
        <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem onClick={() => { close(); onAiHint(); }} disabled={aiBusy || hintsRemaining === 0}><ListItemIcon>{aiIcon}</ListItemIcon>{aiTitle}</MenuItem>
          <MenuItem onClick={() => { close(); onPythonTutor(); }}><ListItemIcon><GraduationCap size={17} /></ListItemIcon>{t('lesson.python_tutor', 'Obre a Python Tutor')}</MenuItem>
          <MenuItem onClick={(e) => { const anchor = moreAnchor ?? e.currentTarget; close(); openVersions(anchor); }}><ListItemIcon><History size={17} /></ListItemIcon>{t('lesson.version_title', 'Carrega una versió')}</MenuItem>
          <MenuItem onClick={() => { close(); onShortcuts(); }}><ListItemIcon><Keyboard size={17} /></ListItemIcon>{t('lesson.shortcuts_title', 'Dreceres de teclat')}</MenuItem>
          <MenuItem onClick={onZoomOut}><ListItemIcon><ZoomOut size={17} /></ListItemIcon>{t('lesson.zoom_out', 'Redueix la lletra')}</MenuItem>
          <MenuItem onClick={onZoomIn}><ListItemIcon><ZoomIn size={17} /></ListItemIcon>{t('lesson.zoom_in', 'Amplia la lletra')}</MenuItem>
        </Menu>
        {versionsMenu}
      </>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <ToolButton title={aiTitle} onClick={onAiHint} disabled={aiBusy || hintsRemaining === 0}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
          {aiIcon}
          {hintsRemaining !== null && <Typography component="span" sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{hintsRemaining}</Typography>}
        </Box>
      </ToolButton>
      <ToolButton title={t('lesson.python_tutor', 'Obre a Python Tutor')} onClick={onPythonTutor}><GraduationCap size={17} /></ToolButton>
      <ToolButton title={t('lesson.shortcuts_title', 'Dreceres de teclat')} onClick={onShortcuts}><Keyboard size={17} /></ToolButton>
      <ToolButton title={t('lesson.version_title', 'Carrega una versió')} onClick={(e) => openVersions(e.currentTarget)}><History size={17} /></ToolButton>
      <Box sx={{ width: '1px', height: 18, bgcolor: '#333', mx: 0.5 }} />
      <ToolButton title={t('lesson.zoom_out', 'Redueix la lletra')} onClick={onZoomOut}><ZoomOut size={17} /></ToolButton>
      <ToolButton title={t('lesson.zoom_in', 'Amplia la lletra')} onClick={onZoomIn}><ZoomIn size={17} /></ToolButton>
      {versionsMenu}
    </Box>
  );
}
