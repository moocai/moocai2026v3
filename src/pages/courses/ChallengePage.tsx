import { useState, type ReactNode } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Container, FormControlLabel, LinearProgress,
  Stack, Switch, Tab, Tabs, Typography, alpha, useTheme,
} from '@mui/material';
import {
  BrainCircuit, CheckCircle2, ChevronDown, ChevronLeft, Circle, Download, EyeOff, FileText,
  GraduationCap, Medal, MessageSquareText, Upload, Users,
} from 'lucide-react';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { courseService } from '../../services/courseService';
import {
  challengeKeys, challengeService, saveBlob,
  type ChallengeDetail, type ChallengeFile, type LeaderboardEntry,
} from '../../services/challengeService';
import { MarkdownContent } from '../../components/MarkdownContent';
import { Leaderboard } from '../../features/challenges/Leaderboard';
import { SubmitPanel } from '../../features/challenges/SubmitPanel';
import {
  ACCENT, MEDALS, MetricChip, StaffChips, StatusChip,
  challengeDescription, currentUserId, formatDateTime, formatScore,
} from '../../features/challenges/shared';

type TabName = 'overview' | 'leaderboard';

/** Targeta lateral amb títol, com les de la resta de pàgines del curs. */
function SideCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', p: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography component="h2" sx={{ fontWeight: 900, fontSize: '1rem' }}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

/**
 * Un repte de ML: enunciat i fitxers de dades, classificació (pública i, un cop tancat,
 * privada i final) i, al costat, l'entrega i el resultat propis. El professorat hi té
 * també qui ha entregat i la descàrrega de totes les entregues.
 */
export default function ChallengePage() {
  const { courseId = '', challengeSlug = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { mode } = useThemeMode();
  const theme = useTheme();
  const slug = resolveSlug(courseId);
  const [params, setParams] = useSearchParams();
  const isLoggedIn = !!localStorage.getItem('token');
  const myId = currentUserId();

  const detail = useQuery({
    queryKey: challengeKeys.detail(slug, challengeSlug),
    queryFn: () => challengeService.get(slug, challengeSlug),
    enabled: !!slug && !!challengeSlug,
    staleTime: 30 * 1000,
    retry: (count, err: any) => ![403, 404].includes(err?.response?.status) && count < 2,
  });
  const challenge = detail.data;
  // Només el professorat rep `locked`
  const isStaff = !!challenge && 'locked' in challenge;

  const boards = useQuery({
    queryKey: challengeKeys.leaderboard(slug, challengeSlug),
    queryFn: () => challengeService.leaderboard(slug, challengeSlug),
    // Sense sessió també: als cursos públics la classificació és pública
    enabled: !!challenge && !challenge.is_exam,
    staleTime: 30 * 1000,
    retry: false,
  });

  const hasBoard = !!challenge && !challenge.is_exam;
  const requested = params.get('tab') as TabName | null;
  const tab: TabName = hasBoard && (requested === 'leaderboard' || (!requested && challenge && !challenge.current)) ? 'leaderboard' : 'overview';
  const setTab = (next: TabName) => setParams((p) => { p.set('tab', next); return p; }, { replace: true });

  const status = (err: unknown) => (err as any)?.response?.status as number | undefined;

  const myEntry: LeaderboardEntry | undefined = (boards.data?.final ?? boards.data?.public)?.find((e) => e.user_id === myId);

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 4 } }}>
        <Button component={RouterLink} to={`/courses/${courseId}/challenges`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {t('challenges.title')}
        </Button>

        {detail.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : detail.isError || !challenge ? (
          <Alert severity="error">
            {status(detail.error) === 404 || status(detail.error) === 403 ? t('challenges.not_found') : t('challenges.load_error')}
          </Alert>
        ) : (
          <>
            {/* Capçalera */}
            <Box sx={{
              position: 'relative', overflow: 'hidden', borderRadius: 4, p: { xs: 2.5, md: 4 }, mb: 3,
              border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.3),
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(ACCENT, 0.12)} 100%)`,
            }}>
              <Box aria-hidden sx={{ position: 'absolute', right: { xs: -30, md: 20 }, top: { xs: -20, md: -10 }, color: alpha(theme.palette.primary.main, 0.12), display: { xs: 'none', sm: 'block' } }}>
                <BrainCircuit size={160} strokeWidth={1.25} />
              </Box>
              <Stack spacing={1.5} sx={{ position: 'relative', maxWidth: 760 }}>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  <StatusChip open={challenge.current} />
                  {challenge.is_exam
                    ? <Chip size="small" icon={<GraduationCap size={14} />} label={t('challenges.exam')} sx={{ fontWeight: 700 }} />
                    : <MetricChip metric={challenge.metric} />}
                  <StaffChips challenge={challenge} />
                </Stack>
                <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: '1.6rem', md: '2.4rem' }, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
                  {challenge.name}
                </Typography>
                {myEntry && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Medal size={18} color={myEntry.pos <= 3 ? MEDALS[myEntry.pos - 1] : theme.palette.primary.main} />
                    <Typography sx={{ fontWeight: 800 }}>
                      {t('challenges.your_rank', { pos: myEntry.pos })}
                      <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}> · {formatScore(myEntry.score, i18n.language)}</Box>
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 360px' }, gap: 3, alignItems: 'start', pb: 4 }}>
              {/* Contingut */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden', minWidth: 0 }}>
                {hasBoard && (
                  <Tabs
                    value={tab}
                    onChange={(_, v: TabName) => setTab(v)}
                    sx={{ px: 1.5, borderBottom: '1px solid', borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, minHeight: 52 } }}
                  >
                    <Tab value="overview" label={t('challenges.tab_overview')} />
                    <Tab value="leaderboard" label={t('challenges.leaderboard')} />
                  </Tabs>
                )}
                <Box sx={{ p: { xs: 2, md: 3.5 } }}>
                  {tab === 'overview' ? (
                    <Overview courseSlug={slug} challenge={challenge} isStaff={isStaff} />
                  ) : boards.isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                  ) : boards.isError || !boards.data ? (
                    status(boards.error) === 403 || status(boards.error) === 401
                      ? <Typography color="text.secondary">{isLoggedIn ? t('challenges.board_members_only') : t('challenges.login_to_see_board')}</Typography>
                      : <Typography color="error">{t('challenges.board_error')}</Typography>
                  ) : (
                    <Leaderboard courseSlug={slug} boards={boards.data} myId={myId} closed={!challenge.current} />
                  )}
                </Box>
              </Box>

              {/* Lateral: entrega i resultat */}
              <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 16 }, minWidth: 0 }}>
                <SideCard title={t('challenges.submit_title')} icon={<Box sx={{ color: 'primary.main', display: 'flex' }}><Upload size={18} /></Box>}>
                  <SubmitPanel courseSlug={slug} challenge={challenge} isLoggedIn={isLoggedIn} isStaff={isStaff} />
                </SideCard>
                {isLoggedIn && <MySubmissionCard courseSlug={slug} challenge={challenge} myEntry={myEntry} />}
                {isStaff && <StaffCard courseSlug={slug} challenge={challenge} />}
              </Stack>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}

function Overview({ courseSlug, challenge, isStaff }: { courseSlug: string; challenge: ChallengeDetail; isStaff: boolean }) {
  const { t, i18n } = useTranslation();
  const description = challengeDescription(challenge, i18n.language);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const download = async (file: ChallengeFile) => {
    if (!localStorage.getItem('token')) { setDownloadError(t('drive.login_required')); return; }
    setDownloadingId(file.id);
    setDownloadError(null);
    try {
      saveBlob(await courseService.downloadFile(courseSlug, file.id), file.name);
    } catch {
      setDownloadError(t('drive.download_error'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        {description
          ? <MarkdownContent fontSize="1rem">{description}</MarkdownContent>
          : <Typography color="text.secondary">{t('challenges.no_description')}</Typography>}
      </Box>

      {(challenge.files.length > 0 || isStaff) && (
        <Box component="section">
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: '1.1rem', mb: 1.5 }}>{t('challenges.data_files')}</Typography>
          {downloadError && <Typography role="alert" sx={{ color: 'error.main', fontSize: '0.9rem', mb: 1 }}>{downloadError}</Typography>}
          {challenge.files.length === 0 ? (
            <Typography color="text.secondary">{t('challenges.no_files')}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
              {challenge.files.map((file) => (
                <Stack
                  key={file.id}
                  direction="row"
                  spacing={1.5}
                  role="button"
                  tabIndex={0}
                  onClick={() => { if (downloadingId === null) void download(file); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && downloadingId === null) { e.preventDefault(); void download(file); } }}
                  sx={{
                    alignItems: 'center', px: 1.75, py: 1.25, borderRadius: 2, cursor: 'pointer',
                    border: '1px solid', borderColor: 'divider',
                    '&:hover, &:focus-visible': { borderColor: 'primary.main', bgcolor: 'action.hover', outline: 'none' },
                  }}
                >
                  <FileText size={20} style={{ flexShrink: 0, opacity: 0.8 }} />
                  <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{file.name}</Typography>
                  {file.hidden && <Chip size="small" icon={<EyeOff size={13} />} label={t('drive.hidden')} sx={{ fontWeight: 700 }} />}
                  {downloadingId === file.id ? <CircularProgress size={16} /> : <Download size={18} style={{ flexShrink: 0 }} />}
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Stack>
  );
}

function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{children}</Typography>
    </Stack>
  );
}

function MySubmissionCard({ courseSlug, challenge, myEntry }: { courseSlug: string; challenge: ChallengeDetail; myEntry?: LeaderboardEntry }) {
  const { t, i18n } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);
  const mine = challenge.my_submission;
  // Backend antic sense `my_submission`: no se sap si n'hi ha, i no es mostra la targeta
  if (mine === undefined) return null;

  const download = async () => {
    setDownloading(true);
    setError(false);
    try {
      const blob = await challengeService.downloadMine(courseSlug, challenge.slug);
      // Els exàmens poden ser .ipynb o .zip: es dedueix del tipus del fitxer
      const ext = !challenge.is_exam ? '.csv' : /zip/.test(blob.type) ? '.zip' : '.ipynb';
      saveBlob(blob, `${challenge.slug}_submission${ext}`);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SideCard title={t('challenges.your_submission')} icon={<Box sx={{ color: 'primary.main', display: 'flex' }}><FileText size={18} /></Box>}>
      {!mine ? (
        <Typography color="text.secondary">{t('challenges.no_submission')}</Typography>
      ) : (
        <Stack spacing={1.25}>
          <StatRow label={t('challenges.last_submitted')}>{formatDateTime(mine.submitted_at, i18n.language)}</StatRow>
          {!challenge.is_exam && <StatRow label={t('challenges.public_score')}>{formatScore(mine.public_score, i18n.language)}</StatRow>}
          {myEntry && !challenge.is_exam && <StatRow label={t('challenges.position')}>#{myEntry.pos}</StatRow>}
          {challenge.is_exam && (
            <StatRow label={t('challenges.grade')}>
              {mine.professor_grade === null ? t('challenges.not_graded') : `${formatScore(mine.professor_grade, i18n.language)} / 10`}
            </StatRow>
          )}
          {challenge.is_exam && mine.professor_comment && (
            <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <MessageSquareText size={16} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{t('challenges.feedback')}</Typography>
              </Stack>
              <MarkdownContent fontSize="0.9rem">{mine.professor_comment}</MarkdownContent>
            </Box>
          )}
          <Button variant="outlined" onClick={download} disabled={downloading} startIcon={downloading ? <CircularProgress size={16} /> : <Download size={16} />} sx={{ fontWeight: 700, mt: 1 }}>
            {t('challenges.download_mine')}
          </Button>
          {error && <Typography role="alert" variant="body2" color="error">{t('drive.download_error')}</Typography>}
        </Stack>
      )}
    </SideCard>
  );
}

/** Professorat: qui ha entregat i descàrrega de totes les entregues. */
function StaffCard({ courseSlug, challenge }: { courseSlug: string; challenge: ChallengeDetail }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const status = useQuery({
    queryKey: challengeKeys.status(courseSlug, challenge.slug),
    queryFn: () => challengeService.submissionStatus(courseSlug, challenge.slug),
    staleTime: 30 * 1000,
    retry: false,
  });
  const rows = status.data ?? [];
  const done = rows.filter((r) => r.submitted).length;
  const shown = missingOnly ? rows.filter((r) => !r.submitted) : rows;

  const downloadAll = async () => {
    setDownloading(true);
    setError(false);
    try {
      saveBlob(await challengeService.downloadAll(courseSlug, challenge.slug), `${challenge.slug}_submissions.zip`);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SideCard title={t('challenges.staff_title')} icon={<Box sx={{ color: 'primary.main', display: 'flex' }}><Users size={18} /></Box>}>
      <Stack spacing={2}>
        {status.isLoading ? (
          <LinearProgress />
        ) : status.isError ? (
          <Typography variant="body2" color="error">{t('challenges.status_error')}</Typography>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('challenges.no_students')}</Typography>
        ) : (
          <Box>
            <Button
              fullWidth
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              endIcon={<ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
              sx={{ justifyContent: 'space-between', color: 'text.primary', fontWeight: 800, px: 0 }}
            >
              {t('challenges.submitted_count', { done, total: rows.length })}
            </Button>
            <LinearProgress variant="determinate" value={(done / rows.length) * 100} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
            <Collapse in={expanded}>
              <FormControlLabel
                sx={{ mt: 1.5 }}
                control={<Switch size="small" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />}
                label={<Typography variant="body2">{t('challenges.missing_only')}</Typography>}
              />
              <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0, maxHeight: 320, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {shown.map((r, i) => (
                  <Stack key={r.user_id} component="li" direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1.5, py: 1, borderTop: i ? '1px solid' : 0, borderColor: 'divider' }}>
                    {r.submitted
                      ? <CheckCircle2 size={16} color={theme.palette.success.main} style={{ flexShrink: 0 }} />
                      : <Circle size={16} style={{ flexShrink: 0, opacity: 0.4 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.full_name || r.username}
                      </Typography>
                      {r.submitted && (
                        <Typography variant="caption" color="text.secondary">{formatDateTime(r.submitted_at, i18n.language)}</Typography>
                      )}
                    </Box>
                    {r.submitted && !challenge.is_exam && (
                      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatScore(r.public_score, i18n.language)}</Typography>
                    )}
                  </Stack>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
        <Button variant="outlined" onClick={downloadAll} disabled={downloading} startIcon={downloading ? <CircularProgress size={16} /> : <Download size={16} />} sx={{ fontWeight: 700 }}>
          {t('challenges.download_all')}
        </Button>
        {error && <Typography role="alert" variant="body2" color="error">{t('drive.download_error')}</Typography>}
      </Stack>
    </SideCard>
  );
}
