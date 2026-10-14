import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download, ExternalLink, FileText } from 'lucide-react';
import { Box, Button, CircularProgress, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme } from '@mui/material';
import { problemDetailQuery, resolveSlug, topicDetailQuery, useCourse } from '../../hooks/useCourse';
import { courseService } from '../../services/courseService';
import { getBaseLanguage, getLocalizedText } from '../../utils/formatters';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CodeBlock } from '../../components/CodeBlock';

type Section = 'theory' | 'files' | 'problems';

/**
 * Materials del curs dins de la pàgina d'un problema: la teoria, els fitxers (les diapositives
 * en PDF s'obren en una pestanya nova) i els altres problemes d'un tema, sense deixar el codi.
 * Per defecte, el tema del problema obert; dins d'un examen (que en permeti la consulta),
 * els temes del curs.
 */
export function MaterialsPanel({ courseId, topicSlug, problemSlug }: {
  courseId: string;
  /** Tema per defecte (el del problema), si és un tema del curs */
  topicSlug?: string;
  /** El problema obert: no surt a la llista */
  problemSlug?: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = getBaseLanguage(i18n.language, 'ca');
  const slug = resolveSlug(courseId);
  const { data: course, isLoading } = useCourse(courseId);
  const topics: any[] = course?.content ?? [];
  const [chosenTopic, setChosenTopic] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('theory');
  const topic = topics.find((tp) => tp.id === (chosenTopic ?? topicSlug)) ?? topics[0];

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>;
  if (!topic) return <Typography sx={{ p: 2, fontSize: '0.85rem', color: 'text.secondary' }}>{t('materials.no_topics')}</Typography>;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        select size="small" label={t('materials.topic')} value={topic.id}
        onChange={(e) => setChosenTopic(e.target.value)}
      >
        {topics.map((tp) => <MenuItem key={tp.id} value={tp.id}>{getLocalizedText(tp.title, lang as any)}</MenuItem>)}
      </TextField>
      <ToggleButtonGroup
        size="small" exclusive fullWidth value={section}
        onChange={(_, v) => { if (v) setSection(v); }}
        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, py: 0.5 } }}
      >
        <ToggleButton value="theory">{t('materials.theory')}</ToggleButton>
        <ToggleButton value="files">{t('materials.files')}</ToggleButton>
        <ToggleButton value="problems">{t('materials.problems')}</ToggleButton>
      </ToggleButtonGroup>

      {section === 'theory' && <TopicTheory courseSlug={slug} topicSlug={topic.id} lang={lang} />}
      {section === 'files' && <TopicFiles courseSlug={slug} topicSlug={topic.id} lang={lang} />}
      {section === 'problems' && (
        <TopicProblems courseId={courseId} topic={topic} currentProblemSlug={problemSlug} lang={lang} />
      )}
    </Box>
  );
}

function TopicTheory({ courseSlug, topicSlug, lang }: { courseSlug: string; topicSlug: string; lang: string }) {
  const { t } = useTranslation();
  const detail = useQuery(topicDetailQuery(courseSlug, topicSlug, lang));
  if (detail.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>;
  if (detail.isError || !detail.data?.theory) {
    return <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontStyle: 'italic' }}>{t('materials.no_theory')}</Typography>;
  }
  return <MarkdownContent fontSize="0.9rem" runnablePython>{detail.data.theory}</MarkdownContent>;
}

function TopicFiles({ courseSlug, topicSlug, lang }: { courseSlug: string; topicSlug: string; lang: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const detail = useQuery(topicDetailQuery(courseSlug, topicSlug, lang));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Els PDF (diapositives) s'obren en una pestanya nova; la resta es descarreguen.
  // El fitxer es demana amb la sessió, així que la pestanya s'obre abans (si no, el
  // navegador la bloquejaria per no venir directament del clic) i s'omple en arribar.
  const openFile = async (file: { id: number; name: string }) => {
    const isPdf = /\.pdf$/i.test(file.name);
    const tab = isPdf ? window.open('', '_blank') : null;
    setBusyId(file.id);
    setError(null);
    try {
      const blob = await courseService.downloadFile(courseSlug, file.id);
      if (isPdf) {
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (tab) tab.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      tab?.close();
      setError(t('lesson.file_download_error', "No s'ha pogut descarregar el fitxer."));
    } finally {
      setBusyId(null);
    }
  };

  if (detail.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>;
  const files = detail.data?.files ?? [];
  if (detail.isError || files.length === 0) {
    return <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontStyle: 'italic' }}>{t('materials.no_files')}</Typography>;
  }
  return (
    <Box>
      {error && <Typography role="alert" sx={{ color: 'error.main', fontSize: '0.8rem', mb: 1 }}>{error}</Typography>}
      {files.map((file) => {
        const isPdf = /\.pdf$/i.test(file.name);
        return (
          <Box
            key={file.id} component="button" type="button" onClick={() => { if (busyId === null) void openFile(file); }}
            title={isPdf ? t('materials.open_new_tab') : t('materials.download')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, width: '100%', px: 1, py: 1, border: 'none', borderBottom: '1px solid',
              borderColor: 'divider', bgcolor: 'transparent', color: 'text.primary', cursor: 'pointer', textAlign: 'left', font: 'inherit',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
            }}
          >
            <FileText size={16} style={{ flexShrink: 0 }} />
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, overflowWrap: 'anywhere' }}>{file.name}</Typography>
            {busyId === file.id ? <CircularProgress size={14} /> : isPdf ? <ExternalLink size={15} /> : <Download size={15} />}
          </Box>
        );
      })}
    </Box>
  );
}

function TopicProblems({ courseId, topic, currentProblemSlug, lang }: {
  courseId: string; topic: any; currentProblemSlug?: string; lang: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);
  const problems = (topic.subTopics || []).filter((p: any) => p.problemSlug && p.problemSlug !== currentProblemSlug);
  if (problems.length === 0) {
    return <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontStyle: 'italic' }}>{t('materials.no_problems')}</Typography>;
  }
  return (
    <Box>
      {problems.map((p: any) => {
        const expanded = open === p.problemSlug;
        return (
          <Box key={p.problemSlug} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box
              component="button" type="button" aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : p.problemSlug)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', px: 1, py: 1, border: 'none', bgcolor: 'transparent', color: 'text.primary', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
            >
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, overflowWrap: 'anywhere' }}>
                {getLocalizedText(p.subtitle, lang as any)}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
                {p.type === 'test' ? t('materials.kind_test') : t('materials.kind_coding')}
              </Typography>
            </Box>
            {expanded && <ProblemPreview courseId={courseId} topicSlug={topic.id} problem={p} lang={lang} />}
          </Box>
        );
      })}
    </Box>
  );
}

/** Enunciat (i la solució de referència, si ja es pot veure) d'un altre problema, sense obrir-lo. */
function ProblemPreview({ courseId, topicSlug, problem, lang }: { courseId: string; topicSlug: string; problem: any; lang: string }) {
  const { t } = useTranslation();
  const detail = useQuery(problemDetailQuery(courseId, topicSlug, problem.problemSlug));
  const to = problem.type === 'test'
    ? `/courses/${courseId}/test/${encodeURIComponent(problem.problemSlug)}?topic=${encodeURIComponent(topicSlug)}`
    : `/courses/${courseId}/${encodeURIComponent(problem.problemSlug)}`;
  return (
    <Box sx={{ px: 1, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {detail.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
      ) : detail.isError ? (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{t('materials.problem_error')}</Typography>
      ) : (
        <>
          <MarkdownContent fontSize="0.85rem">{getLocalizedText(detail.data?.statement, lang as any) || detail.data?.text || ''}</MarkdownContent>
          {detail.data?.systemSolution && (
            <CodeBlock code={detail.data.systemSolution} header={t('lesson.teacher_solution_title', 'Solució de referència')} />
          )}
        </>
      )}
      <Button component={RouterLink} to={to} size="small" variant="outlined" sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}>
        {t('materials.open_problem')}
      </Button>
    </Box>
  );
}
