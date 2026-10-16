import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, IconButton, LinearProgress, Stack, Typography, alpha, useTheme } from '@mui/material';
import { CloudUpload, FileSpreadsheet, Lock, Send, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiErrorMessages } from '../../services/httpClient';
import { challengeKeys, challengeService, type ChallengeDetail } from '../../services/challengeService';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  courseSlug: string;
  challenge: ChallengeDetail;
  isLoggedIn: boolean;
  /** Professorat: pot entregar encara que el repte sigui tancat (per provar-lo) */
  isStaff: boolean;
}

/** Zona per pujar l'entrega (arrossegant o triant el fitxer) i enviar-la. */
export function SubmitPanel({ courseSlug, challenge, isLoggedIn, isStaff }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const extensions = challenge.is_exam ? ['.ipynb', '.zip'] : ['.csv'];
  const maxMb = challenge.is_exam ? challenge.max_upload_size_mb ?? null : null;
  const limit = challenge.submission_limit;
  const remaining = limit?.limited ? limit.remaining ?? 0 : null;
  const outOfSubmissions = remaining !== null && remaining <= 0;
  const open = challenge.current || isStaff;

  const submit = useMutation({
    mutationFn: (f: File) => challengeService.submit(courseSlug, challenge.slug, f),
    onSuccess: () => {
      setFile(null);
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      }
      void queryClient.invalidateQueries({ queryKey: challengeKeys.detail(courseSlug, challenge.slug) });
      void queryClient.invalidateQueries({ queryKey: challengeKeys.leaderboard(courseSlug, challenge.slug) });
      void queryClient.invalidateQueries({ queryKey: challengeKeys.status(courseSlug, challenge.slug) });
    },
  });

  const pick = (f: File | undefined | null) => {
    submit.reset();
    setLocalError(null);
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!extensions.some((ext) => name.endsWith(ext))) {
      setLocalError(t('challenges.wrong_type', { types: extensions.join(', ') }));
      return;
    }
    if (maxMb && f.size > maxMb * 1024 * 1024) {
      setLocalError(t('challenges.too_big', { max: maxMb }));
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!submit.isPending) pick(e.dataTransfer.files?.[0]);
  };

  if (!isLoggedIn) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 1 }}>
        <Typography color="text.secondary">{t('challenges.login_to_submit')}</Typography>
        <Button component={RouterLink} to="/dashboards/student" variant="contained" sx={{ fontWeight: 700 }}>
          {t('auth.access')}
        </Button>
      </Stack>
    );
  }

  if (!open) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', color: 'text.secondary', py: 1 }}>
        <Lock size={18} />
        <Typography sx={{ fontWeight: 600 }}>{t('challenges.submissions_closed')}</Typography>
      </Stack>
    );
  }

  const serverErrors = submit.isError ? apiErrorMessages(submit.error) : [];
  const disabled = submit.isPending || (outOfSubmissions && !isStaff);

  return (
    <Stack spacing={2}>
      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={t('challenges.choose_file')}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          border: '2px dashed', borderRadius: 3, px: 2, py: 3, textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
          transition: 'border-color .15s, background-color .15s',
          '&:hover, &:focus-visible': disabled ? {} : { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04), outline: 'none' },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={extensions.join(',')}
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
        />
        <CloudUpload size={30} color={theme.palette.primary.main} />
        <Typography sx={{ fontWeight: 800, mt: 1 }}>{t('challenges.drop_here')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {challenge.is_exam
            ? t('challenges.exam_hint', { max: maxMb ?? '—' })
            : t('challenges.csv_hint')}
        </Typography>
      </Box>

      {file && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1.5, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
          <FileSpreadsheet size={20} style={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">{formatSize(file.size)}</Typography>
          </Box>
          <IconButton size="small" aria-label={t('challenges.remove_file')} onClick={() => setFile(null)} disabled={submit.isPending}>
            <X size={16} />
          </IconButton>
        </Stack>
      )}

      <Button
        variant="contained"
        size="large"
        disabled={!file || disabled}
        onClick={() => file && submit.mutate(file)}
        startIcon={submit.isPending ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
        sx={{ fontWeight: 800, borderRadius: 2.5 }}
      >
        {submit.isPending ? t('challenges.submitting') : t('challenges.submit')}
      </Button>

      {remaining !== null && limit && !isStaff && (
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: outOfSubmissions ? 'error.main' : 'text.secondary' }}>
              {t('challenges.remaining_today', { count: remaining })}
            </Typography>
            <Typography variant="body2" color="text.secondary">{t('challenges.per_day', { max: limit.max_per_day })}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={limit.max_per_day ? (remaining / limit.max_per_day) * 100 : 0}
            color={outOfSubmissions ? 'error' : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      {(localError || serverErrors.length > 0 || (submit.isError && serverErrors.length === 0)) && (
        <Alert severity="error" role="alert">
          {localError || (serverErrors.length ? serverErrors.join(' ') : t('challenges.submit_error'))}
        </Alert>
      )}
      {submit.isSuccess && (
        <Alert severity="success">{challenge.is_exam ? t('challenges.submitted_exam') : t('challenges.submitted')}</Alert>
      )}
    </Stack>
  );
}
