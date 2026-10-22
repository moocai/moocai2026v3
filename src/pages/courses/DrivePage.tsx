import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, EyeOff, FileText, Folder } from 'lucide-react';
import { Box, Button, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { useAllCourses } from '../../hooks/useCourses';
import { courseService } from '../../services/courseService';
import { getLocalizedText } from '../../utils/formatters';
import type { DriveFile } from '../../types';

const ACCENT = '#00685d';

export const driveQueryKey = (slug: string, folderId?: string) => ['drive', slug, folderId ?? 'root'] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drive del curs: els fitxers generals (programa, guies, recursos…), carpeta a carpeta.
 * Els fitxers de cada tema no hi surten: són a la pestanya Fitxers del curs, al costat del tema.
 */
export default function DrivePage() {
  const { courseId = '', folderId } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const slug = resolveSlug(courseId);
  const courseTitle = useAllCourses().data?.find((c) => c.slug === slug)?.title;
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const drive = useQuery({
    queryKey: driveQueryKey(slug, folderId),
    queryFn: () => courseService.getDriveFolder(slug, folderId),
    enabled: !!slug,
    staleTime: 60 * 1000,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });
  const notFound = (drive.error as any)?.response?.status === 404;

  const folderUrl = (id: number, isRoot: boolean) =>
    isRoot ? `/courses/${courseId}/drive` : `/courses/${courseId}/drive/${id}`;

  const download = async (file: DriveFile) => {
    if (!localStorage.getItem('token')) { setDownloadError(t('drive.login_required')); return; }
    setDownloadingId(file.id);
    setDownloadError(null);
    try {
      const blob = await courseService.downloadFile(slug, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDownloadError(t('drive.download_error'));
    } finally {
      setDownloadingId(null);
    }
  };

  const hiddenChip = <Chip size="small" icon={<EyeOff size={14} />} label={t('drive.hidden')} sx={{ fontWeight: 700, flexShrink: 0 }} />;
  const rowSx = {
    alignItems: 'center', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider',
    textDecoration: 'none', color: 'text.primary', cursor: 'pointer',
    '&:hover': { bgcolor: 'action.hover' },
  } as const;

  const data = drive.data;
  const crumbs = data?.breadcrumbs ?? [];

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {getLocalizedText(courseTitle) || slug}
        </Button>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, mb: 0.5 }}>
          {t('drive.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{t('drive.subtitle')}</Typography>

        {drive.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : drive.isError || !data ? (
          <Typography color="error">{notFound ? t('drive.not_found') : t('drive.load_error')}</Typography>
        ) : (
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden', mb: 4 }}>
            {/* Camí: Drive › carpeta › subcarpeta */}
            <Stack direction="row" component="nav" aria-label={t('nav.breadcrumb')} sx={{ alignItems: 'center', flexWrap: 'wrap', px: 2, py: 1.5, gap: 0.5 }}>
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                const label = i === 0 ? t('drive.title') : c.name;
                return (
                  <Stack key={c.id} direction="row" sx={{ alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    {i > 0 && <ChevronRight size={16} style={{ opacity: 0.6 }} />}
                    {last ? (
                      <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }} aria-current="page">{label}</Typography>
                    ) : (
                      <Typography component={RouterLink} to={folderUrl(c.id, i === 0)} sx={{ fontWeight: 600, color: 'text.secondary', textDecoration: 'none', overflowWrap: 'anywhere', '&:hover': { textDecoration: 'underline' } }}>
                        {label}
                      </Typography>
                    )}
                  </Stack>
                );
              })}
            </Stack>

            {downloadError && (
              <Typography role="alert" sx={{ color: 'error.main', fontSize: '0.9rem', px: 2, pb: 1.5 }}>{downloadError}</Typography>
            )}

            {data.folders.length === 0 && data.files.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 3, color: 'text.secondary', borderTop: '1px solid', borderColor: 'divider' }}>
                <Folder size={40} style={{ opacity: 0.5 }} />
                <Typography sx={{ mt: 2, fontWeight: 600 }}>{t('drive.empty')}</Typography>
              </Box>
            ) : (
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {data.folders.map((f) => (
                  <Box key={`folder-${f.id}`} component="li">
                    <Stack component={RouterLink} to={folderUrl(f.id, false)} direction="row" spacing={2} sx={rowSx}>
                      <Folder size={20} color={ACCENT} style={{ flexShrink: 0 }} />
                      <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{f.name}</Typography>
                      {f.hidden && hiddenChip}
                      <ChevronRight size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
                    </Stack>
                  </Box>
                ))}
                {data.files.map((file) => (
                  <Stack
                    key={`file-${file.id}`}
                    component="li"
                    direction="row"
                    spacing={2}
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (downloadingId === null) void download(file); }}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && downloadingId === null) { e.preventDefault(); void download(file); } }}
                    sx={rowSx}
                  >
                    <FileText size={20} style={{ flexShrink: 0, opacity: 0.8 }} />
                    <Typography sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{file.name}</Typography>
                    {file.hidden && hiddenChip}
                    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
                      {formatSize(file.size)}
                    </Typography>
                    {downloadingId === file.id ? <CircularProgress size={16} /> : <Download size={18} style={{ flexShrink: 0 }} />}
                  </Stack>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
