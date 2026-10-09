import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Square, RotateCcw, Lock, CloudUpload, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Box, Typography, Button, IconButton, Stack, alpha, CircularProgress, useTheme, useMediaQuery, Tabs, Tab, Tooltip } from '@mui/material';
import Editor from '@monaco-editor/react';
import { api } from '../../services/api';
import { getMonacoEditorOptions, getMonacoEditorTheme, loadMonaco, loadMonacoTypescript } from '../../utils/monaco';
import { ReactLivePreview } from '../../components/ReactLivePreview';
import { ConsolePanel, type ConsoleLine } from '../../components/ConsolePanel';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CodeBlock } from '../../components/CodeBlock';
import { EditorToolbar, type CodeVersion } from '../../components/EditorToolbar';
import { ShortcutsDialog } from '../../components/ShortcutsDialog';
import { useAiHints } from '../../hooks/useAiHints';
import { ResizeHandle } from '../../components/ResizeHandle';
import { preloadPython } from '../../services/pythonRunner';
import { usePythonRun } from '../../hooks/usePythonRun';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { problemDetailQuery, resolveSlug, useCourse } from '../../hooks/useCourse';
import { useThemeMode } from '../../hooks/useTheme';
import { courseService } from '../../services/courseService';
import { LAST_SESSION_KEY, userKey } from '../../services/topicTestAnswers';
import { apiErrorMessages } from '../../services/httpClient';
import { AiHelpPanel } from '../courses/AiHelpPanel';
import { refreshCoursePoints, getCurrentStudent, getTotalPoints } from '../../utils/pointsSync';

interface Student { id: string; name: string; }

function LockedTabMessage({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, mt: 4 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.warning.main, 0.12) }}><Lock size={20} color={theme.palette.warning.main} /></Box>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{text}</Typography>
    </Box>
  );
}

// === Multi-model (pestanyes de fitxers) ===
type EditorLang = 'python' | 'react';
interface EditorFileInfo {
  language: string;
  label: string;
  path: string;
}
const PYTHON_FILE = 'python.py';
// Llenguatge de programació del curs. L'API encara no l'envia: els cursos són de
// Python llevat que el curs digui explícitament que és de React.
function getCourseLanguage(course: any): EditorLang {
  const raw = String(course?.language ?? course?.programming_language ?? course?.code_language ?? '').toLowerCase();
  return /react|jsx|tsx/.test(raw) ? 'react' : 'python';
}
const REACT_FILE = 'React.tsx';
const LESSON_URI_PREFIX = 'file:///lesson';

function EditorFileTabs({ value, files, onChange }: { value: EditorLang; files: Partial<Record<EditorLang, EditorFileInfo>>; onChange: (v: EditorLang) => void }) {
  const langs = Object.keys(files) as EditorLang[];
  // Un sol fitxer (p. ex. un curs de Python): només informa del llenguatge, no és clicable
  if (langs.length === 1) {
    return (
      <Box
        sx={{
          userSelect: 'none', px: 1, py: 0.3, borderRadius: 0.8, fontSize: 10.5, fontWeight: 700,
          lineHeight: 1.4, whiteSpace: 'nowrap', fontFamily: "'Fira Code', 'Consolas', monospace",
          color: '#c4b5fd', border: '1px solid #3f3f46', bgcolor: 'transparent',
        }}
      >
        {files[langs[0]]!.label}
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {langs.map((lang) => {
        const file = files[lang]!;
        const active = value === lang;
        return (
          <Box
            key={lang}
            onClick={() => onChange(lang)}
            title={file.language}
            sx={{
              cursor: 'pointer',
              userSelect: 'none',
              px: 1.4,
              py: 0.4,
              borderRadius: 0.8,
              fontSize: 10.5,
              fontWeight: 800,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              color: active ? '#fff' : '#9ca3af',
              bgcolor: active ? '#8400ff' : 'rgba(255,255,255,0.06)',
              border: '1px solid',
              borderColor: active ? '#8400ff' : '#444',
              transition: 'all 0.15s',
              '&:hover': { color: '#fff', borderColor: '#8400ff' },
            }}
          >
            {file.label}
          </Box>
        );
      })}
    </Box>
  );
}

// === Validació en temps real (marcadors de Monaco) ===
const MONACO_SEVERITY_ERROR = 8;
const MONACO_SEVERITY_WARNING = 4;

function EditorDiagnosticsBadge({ markers }: { markers: any[] }) {
  const { t } = useTranslation();
  const errors = markers.filter((m) => m.severity === MONACO_SEVERITY_ERROR).length;
  const warnings = markers.filter((m) => m.severity === MONACO_SEVERITY_WARNING).length;
  if (!errors && !warnings) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {errors > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }} title={t('lesson.diagnostics_errors', 'Errors: {{count}}', { count: errors })}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f87171' }} />
          <Typography sx={{ fontSize: 10, fontWeight: 800, lineHeight: 1, color: '#f87171' }}>{errors}</Typography>
        </Box>
      )}
      {warnings > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }} title={t('lesson.diagnostics_warnings', 'Avisos: {{count}}', { count: warnings })}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#fbbf24' }} />
          <Typography sx={{ fontSize: 10, fontWeight: 800, lineHeight: 1, color: '#fbbf24' }}>{warnings}</Typography>
        </Box>
      )}
    </Box>
  );
}

// === Botó de retorn al curs (CourseLessons) ===
function BackToCourseButton({ label, onClick, fontSize = 11 }: { label: string; onClick: () => void; fontSize?: number }) {
  return (
    <Button
      onClick={onClick}
      startIcon={<ChevronLeft size={fontSize + 5} />}
      sx={{
        fontWeight: 700, textTransform: 'none', borderRadius: 1.5,
        fontSize, color: 'text.secondary', minWidth: 0, px: 1,
        '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
      }}
    >
      {label}
    </Button>
  );
}

// === Consola redimensionable ===
const CONSOLE_HEIGHT_KEY = 'mooc_console_height';
const readConsoleHeight = (fallback: number) => {
  try { const v = Number(localStorage.getItem(CONSOLE_HEIGHT_KEY)); return v > 0 ? v : fallback; } catch { return fallback; }
};
// Amplada inicial de la columna de l'enunciat (% de la pantalla, escriptori). Arrossegant la
// barra entre columnes es pot canviar entre STATEMENT_MIN_PCT i STATEMENT_MAX_PCT, i es recorda.
const STATEMENT_DEFAULT_PCT = 30;
const STATEMENT_MIN_PCT = 15;
const STATEMENT_MAX_PCT = 70;
const STATEMENT_WIDTH_KEY = 'mooc_statement_width';
const readStatementWidth = () => {
  try {
    const v = Number(localStorage.getItem(STATEMENT_WIDTH_KEY));
    return v >= STATEMENT_MIN_PCT && v <= STATEMENT_MAX_PCT ? v : STATEMENT_DEFAULT_PCT;
  } catch { return STATEMENT_DEFAULT_PCT; }
};
// Mida de la lletra de l'editor (botons de zoom), es recorda
const FONT_SIZE_KEY = 'mooc_editor_font_size';
const FONT_SIZE_DEFAULT = 18;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 32;
const readFontSize = () => {
  try { const v = Number(localStorage.getItem(FONT_SIZE_KEY)); return v >= FONT_SIZE_MIN && v <= FONT_SIZE_MAX ? v : FONT_SIZE_DEFAULT; } catch { return FONT_SIZE_DEFAULT; }
};
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
// Python Tutor (pythontutor.com): visualitza l'execució pas a pas, com a algorien
const pythonTutorUrl = (code: string) =>
  `https://pythontutor.com/visualize.html#code=${encodeURIComponent(code)}&mode=display&cumulative=false&py=3&curInstr=0`;
// Per sota d'aquesta amplada, els botons de l'editor es mostren només amb la icona
const COMPACT_EDITOR_HEADER_PX = 780;

// === Estat de la solució de l'alumne (el corregeix el servidor) ===
type SolutionStatus = 'accepted' | 'partially_rejected' | 'fully_rejected' | 'pending' | 'processing';
const STATUS_STYLE: Record<SolutionStatus, { color: string; Icon: typeof CheckCircle2 }> = {
  accepted: { color: '#22c55e', Icon: CheckCircle2 },
  partially_rejected: { color: '#f59e0b', Icon: AlertTriangle },
  fully_rejected: { color: '#f87171', Icon: XCircle },
  pending: { color: '#9ca3af', Icon: Loader2 },
  processing: { color: '#9ca3af', Icon: Loader2 },
};

/** Pastilla a la capçalera de l'editor: si el problema ja està resolt (o com va anar l'últim enviament). */
function SolutionStatusChip({ status, submissions, lastSubmittedAt, compact }: { status?: string | null; submissions?: number; lastSubmittedAt?: string; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  if (!status || !(status in STATUS_STYLE)) return null;
  const { color, Icon } = STATUS_STYLE[status as SolutionStatus];
  const label = {
    accepted: t('lesson.status_accepted', 'Resolt'),
    partially_rejected: t('lesson.status_partial', 'Parcialment correcte'),
    fully_rejected: t('lesson.status_rejected', 'Incorrecte'),
    pending: t('lesson.status_pending', 'Corregint…'),
    processing: t('lesson.status_pending', 'Corregint…'),
  }[status as SolutionStatus];
  const details = [
    submissions ? t('lesson.status_submissions', '{{count}} enviaments', { count: submissions }) : '',
    lastSubmittedAt ? t('lesson.status_last_submitted', 'Últim: {{date}}', { date: new Date(lastSubmittedAt).toLocaleString(i18n.language) }) : '',
  ].filter(Boolean).join(' · ');
  return (
    <Tooltip title={details ? `${label} · ${details}` : label} arrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: compact ? 0.6 : 1, py: 0.3, borderRadius: 999, border: '1px solid', borderColor: alpha(color, 0.6), bgcolor: alpha(color, 0.15), color, flexShrink: 0 }}>
        <Icon size={13} />
        {!compact && <Typography sx={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</Typography>}
      </Box>
    </Tooltip>
  );
}

// El servidor NO corregeix les activitats: una resposta 2xx vol dir "rebut".
// Només es considera rebutjada si el servidor ho diu explícitament.
function isRejectedResult(r: any): boolean {
  if (!r) return false;
  const d = r.data ?? r;
  const status = String(d.status ?? d.result ?? d.verdict ?? '').toLowerCase();
  return d.passed === false || d.correct === false || d.is_correct === false || d.success === false
    || ['incorrect', 'failed', 'fail', 'wrong', 'error', 'rejected'].includes(status);
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMdUp = useMediaQuery('(min-height:900px)');
  const { addNotification } = useNotifications();
  const { data: course, isLoading: loading } = useCourse(courseId);
  const [currentUser] = useState<Student | null>(() => {const saved = localStorage.getItem('currentStudent'); return saved ? JSON.parse(saved) : null;  });
  const [consoleOutput, setConsoleOutput] = useState<ConsoleLine[]>([]);
  // Resultat de l'últim enviament d'aquesta visita (fins que el detail del servidor es refresca)
  const [submittedStatus, setSubmittedStatus] = useState<{ status: string; submission_count?: number } | null>(null);
  const queryClient = useQueryClient();
  // Qui s'està executant a la consola: el codi de l'editor, la solució o la d'un company
  const [runSource, setRunSource] = useState<string>('editor');
  const [editorFontSize, setEditorFontSize] = useState(readFontSize);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<CodeVersion['id'] | null>(null);
  // Shift+Enter executa el codi: el comandament de Monaco es registra un cop i crida la versió actual
  const runShortcutRef = useRef<() => void>(() => {});
  const submitShortcutRef = useRef<() => void>(() => {});
  // Botó "Executar": Python real (Pyodide); input() es respon a la consola
  const { isRunning, inputActive, run: runPythonCode, stop: stopPythonCode, submitInput } = usePythonRun(setConsoleOutput, `${courseId}/${lessonId}`);
  const [status, setStatus] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [, setWasSavedInSession] = useState(false);
  const [fadeKey] = useState(0);
  const [, setShowResultModal] = useState(false);
  const [backHidden, setBackHidden] = useState(false);
  const [showLiveRender, setShowLiveRender] = useState(false);

  // === Multi-model: un sol editor, un model/fitxer per llenguatge ===
  const [selectedLanguage, setSelectedLanguage] = useState<EditorLang>('python');
  const [codeByLang, setCodeByLang] = useState<Record<EditorLang, string>>({ python: '', react: '' });
  const userInput = codeByLang[selectedLanguage];
  const userInputRef = useRef(userInput); userInputRef.current = userInput;
  const codeStorageRef = useRef(codeByLang); codeStorageRef.current = codeByLang;
  const lastBackupRef = useRef<string | null>(null); // últim codi Python desat al servidor (d'aquest problema)
  useEffect(() => { lastBackupRef.current = null; }, [courseId, lessonId]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  const monacoInstanceRef = useRef<any>(null);
  const disposedLessonKeyRef = useRef('');
  const [monaco, setMonaco] = useState<any>(null);
  const selectedLanguageRef = useRef<EditorLang>('python'); selectedLanguageRef.current = selectedLanguage;
  const viewStateRef = useRef<Record<EditorLang, any>>({ python: null, react: null });
  const [viewRestoreKey, setViewRestoreKey] = useState(0);

  const getFile = (lang: EditorLang): EditorFileInfo =>
    lang === 'react'
      ? { language: 'typescript', label: REACT_FILE, path: `${LESSON_URI_PREFIX}/${courseId}/${lessonId}/${REACT_FILE}` }
      : { language: 'python', label: PYTHON_FILE, path: `${LESSON_URI_PREFIX}/${courseId}/${lessonId}/${PYTHON_FILE}` };

  // Monaco es comença a descarregar de seguida, en paral·lel amb les dades del curs
  // (i normalment ja ve precarregat de la llista de problemes).
  useEffect(() => { void loadMonaco().catch(() => {}); }, []);

  // Llenguatge del curs: només es mostra el seu fitxer a l'editor. El servei de
  // TypeScript (gran) només es carrega per als cursos de React.
  const courseLanguage = getCourseLanguage(course);
  const isReactCourse = courseLanguage === 'react';
  const editorFiles: Partial<Record<EditorLang, EditorFileInfo>> = { [courseLanguage]: getFile(courseLanguage) };
  useEffect(() => { setSelectedLanguage(courseLanguage); }, [courseLanguage]);
  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    (isReactCourse ? loadMonacoTypescript() : loadMonaco())
      .then((m) => { if (!cancelled) setMonaco(m); })
      .catch((err) => console.error('No s\'ha pogut carregar l\'editor:', err));
    return () => { cancelled = true; };
  }, [!!course, isReactCourse]);

  // Python (Pyodide) es carrega en segon pla quan el navegador està lliure, perquè el
  // primer "Executar" no hagi d'esperar la descàrrega.
  useEffect(() => {
    if (!course || isReactCourse) return;
    const start = () => { void preloadPython().catch(() => { /* es reintentarà en executar */ }); };
    const ric = (window as any).requestIdleCallback;
    const handle = typeof ric === 'function' ? ric(start, { timeout: 3000 }) : setTimeout(start, 500);
    return () => { if (typeof ric === 'function') (window as any).cancelIdleCallback?.(handle); else clearTimeout(handle); };
  }, [!!course, isReactCourse]);

  // Manté el tema de Monaco sincronitzat amb el mode de l'aplicació
  useEffect(() => {
    if (monaco) monaco.editor.setTheme(getMonacoEditorTheme(mode));
  }, [monaco, mode]);

  // Restaura la posició del cursor i l'scroll en canviar de fitxer o de lliçó
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const saved = viewStateRef.current[selectedLanguage];
    if (saved) editor.restoreViewState(saved);
  }, [viewRestoreKey, monaco]);

  // Accés a la instància de l'editor i la API global de Monaco
  const handleEditorMount = (editor: any, mn: any) => {
    editorRef.current = editor;
    monacoInstanceRef.current = mn;
    const saved = viewStateRef.current[selectedLanguageRef.current];
    if (saved) editor.restoreViewState(saved);
    // Manté l'estat de vista actualitzat per poder-lo desar/restaurar
    editor.onDidChangeCursorPosition(() => { viewStateRef.current[selectedLanguageRef.current] = editor.saveViewState(); });
    editor.onDidScrollChange(() => { viewStateRef.current[selectedLanguageRef.current] = editor.saveViewState(); });
    // Shift+Enter executa el codi (com a algorien). No s'activa amb la llista de suggeriments
    // oberta, on Shift+Enter ja vol dir "accepta el suggeriment alternatiu".
    editor.addAction({
      id: 'mooc.runPython',
      label: 'Run',
      keybindings: [mn.KeyMod.Shift | mn.KeyCode.Enter],
      keybindingContext: 'editorTextFocus && !suggestWidgetVisible',
      run: () => runShortcutRef.current(),
    });
    // Ctrl/⌘+Enter envia la solució (substitueix "insereix una línia a sota" de Monaco)
    editor.addAction({
      id: 'mooc.submit',
      label: 'Submit',
      keybindings: [mn.KeyMod.CtrlCmd | mn.KeyCode.Enter],
      keybindingContext: 'editorTextFocus && !suggestWidgetVisible',
      run: () => submitShortcutRef.current(),
    });
    editor.focus();
  };

  // Desa l'estat de vista (cursor/selecció/scroll) del fitxer actiu
  const persistViewState = () => {
    const editor = editorRef.current;
    if (!editor) return;
    viewStateRef.current[selectedLanguageRef.current] = editor.saveViewState();
    // Després de sortir de la sessió (la pàgina es desmunta en sortir) no es torna a escriure
    // res d'aquest alumne: sortir n'acaba d'esborrar els esborranys.
    if (currentUser && !localStorage.getItem('token')) return;
    try {
      localStorage.setItem(`${codeStorageKey}_view`, JSON.stringify(viewStateRef.current));
    } catch { /* quota */ }
  };

  const handleLanguageChange = (lang: EditorLang) => {
    persistViewState();
    setSelectedLanguage(lang);
    setViewRestoreKey((k) => k + 1);
  };

  const handleValidate = (markers: any[]) => setDiagnostics(markers);
  
  const lang = (i18n.language?.split('-')[0]) as 'ca' | 'es' | 'en';
  const getText = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['ca'] || field['es'] || field['en'] || '';
  };

  const outlineProblem = course?.content?.flatMap((t: any) => t.subTopics || []).find((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
  // Slug real del tema que conté el problema (abans la revisió IA demanava "general").
  const currentTopicSlug: string =
    course?.content?.find((t: any) => t.subTopics?.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId))?.id ?? '';
  // L'estructura del curs no porta enunciats: el problema obert es demana a part (1 petició).
  // Els tests no cal: es redirigeixen a TopicTestPage.
  // Els problemes de codi es demanen sempre sencers: el detall porta l'estat propi (`my_solution`)
  // i la solució de referència quan l'alumne ja la pot veure.
  const needsDetail = !!outlineProblem && outlineProblem.type !== 'test';
  const { data: problemDetail } = useQuery({
    ...problemDetailQuery(courseId!, currentTopicSlug, lessonId!),
    enabled: needsDetail && !!currentTopicSlug,
  });
  const currentProblem = useMemo(() => {
    if (!outlineProblem || !needsDetail) return outlineProblem;
    return problemDetail ? { ...outlineProblem, ...problemDetail } : undefined;
  }, [outlineProblem, needsDetail, problemDetail]);
  // Estat de la solució (del servidor) i què es pot veure: la solució de referència arriba
  // només quan el servidor la deixa veure (resolt, o tema tancat; mai en exàmens), i les
  // dels companys amb la mateixa condició.
  // Al professorat (i a qui pot veure el contingut ocult) el detall no li porta `my_solution`:
  // llavors l'estat propi es demana a la seva submissió (una petició, només en aquest cas).
  const needsOwnSubmission = !!currentProblem && currentProblem.type !== 'test' && currentProblem.mySolution === undefined
    && !!currentUser && !!currentTopicSlug;
  const { data: ownSubmission } = useQuery({
    queryKey: ['own-submission', courseId, currentTopicSlug, lessonId],
    queryFn: () => courseService.getOwnSubmission(resolveSlug(courseId!), currentTopicSlug, lessonId!),
    enabled: needsOwnSubmission,
    staleTime: 5 * 60 * 1000,
  });
  const mySolution = currentProblem?.mySolution ?? (needsOwnSubmission ? ownSubmission : undefined);
  // El tema del problema ja no és el que està en curs: els enviaments es corregeixen però no
  // sumen punts (el servidor només els dona mentre el tema és actiu)
  const currentTopic = course?.content?.find((tp: any) => tp.id === currentTopicSlug) as any;
  const topicClosed = currentTopic?.current === false;
  const solutionStatus: string | null = submittedStatus?.status ?? mySolution?.status ?? null;
  const solved = solutionStatus === 'accepted';
  const referenceSolution: string | null = currentProblem?.systemSolution ?? null;
  const solutionUnlocked = !!referenceSolution;
  const peersUnlocked = solved || solutionUnlocked;
  const submissionCount: number | undefined = submittedStatus?.submission_count ?? mySolution?.submission_count;

  // Pistes d'IA: es mostren a la pestanya IA (com a algorien)
  const aiHints = useAiHints(courseId, currentTopicSlug, lessonId);
  // Disponibilitat i pistes que queden avui, del detall del curs (`my_ai_hints`). Amb un
  // backend que encara no l'envia, n'hi ha prou amb el límit del curs (0 = desactivades).
  const courseAiHints = (course as any)?.my_ai_hints as { enabled: boolean; hints_remaining: number } | null | undefined;
  const hintsAvailable = !!course && (course as any).max_ai_hints_per_day !== 0 && courseAiHints?.enabled !== false;
  const hintsRemaining: number | null = aiHints.remaining ?? (courseAiHints?.enabled ? courseAiHints.hints_remaining : null);

  // Enviar: el servidor decideix si la solució és correcta; aquí només cal que hi hagi codi
  const canSubmit = userInput.trim().length > 0 && !isRunning;
  // Enunciat en Markdown, en l'idioma de l'alumne
  const statementMarkdown = getText(currentProblem?.statement) || getText(currentProblem?.text);
  // Textos d'ajuda en passar el ratolí pels botons de l'editor
  const resetTooltip = t('lesson.reset_tooltip', 'Torna a començar: recupera el codi inicial');
  const testTooltip = isRunning
    ? t('lesson.stop_tooltip', "Atura el programa (p. ex. si s'ha quedat en un bucle infinit)")
    : t('lesson.test_tooltip', "Executa el codi amb Python al navegador (no s'envia)");
  const submitTooltip = isRunning
    ? t('lesson.submit_blocked_running', 'Espera que acabi el programa per enviar')
    : canSubmit
      ? t('lesson.submit_tooltip', 'Envia la teva solució al servidor')
      : t('lesson.submit_blocked_empty', 'Escriu codi per poder enviar');
  const consoleInputLabel = t('lesson.console_input_label', 'Resposta per a input()');
  const consoleInputPlaceholder = t('lesson.console_input_placeholder', 'Escriu la resposta i prem Enter');
  const liveRenderTooltip = showLiveRender ? t('lesson.hide_live_render', 'Amaga la visualització') : t('lesson.show_live_render', 'Mostra la visualització');


  // Els problemes de tipus "test" no es resolen amb codi: es respon amb `answers`
  // a TopicTestPage. Si arribem aqui (URL directa o "seguent" des d'un exercici),
  // redirigim per evitar un POST amb `code` que el backend rebutja amb 400.
  // Ruta d'un test amb el seu tema (?topic=): així TopicTestPage només carrega aquell tema
  const testPath = (slug: string) => {
    const topicSlug = course?.content?.find((tp: any) => (tp.subTopics || []).some((st: any) => st.problemSlug === slug))?.id;
    return `/courses/${courseId}/test/${slug}${topicSlug ? `?topic=${encodeURIComponent(topicSlug)}` : ''}`;
  };

  useEffect(() => {
    if (outlineProblem?.type === 'test') {
      navigate(testPath(lessonId!), { replace: true });
    }
  }, [outlineProblem?.type, courseId, lessonId, navigate]);

  const isCoding = (p: any) => p?.type !== 'test';

  const problemPath = (courseId: string, problem: any): string | null => {
    const slug = problem?.problemSlug || problem?.slug;
    if (!slug) return null;
    return problem.type === 'test'
      ? testPath(slug)
      : `/courses/${courseId}/${slug}`;
  };

  // "Anterior" retrocedeix a l'activitat de CODI anterior, saltant els tests
  const handlePrevious = () => {
    if (!course) return;
      const codingProblems = (course.content?.flatMap((topic: any) => topic.subTopics || []) || []).filter(isCoding);
      const currentIndex = codingProblems.findIndex((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
    if (currentIndex > 0) {
      const prevPath = problemPath(course.id, codingProblems[currentIndex - 1]);
    if (prevPath) {
        navigate(prevPath);
        return;
      }
    }
    navigate(`/courses/${course.id}`);
  };

  // Torna a la pàgina del curs (CourseLessons) deixant l'activitat
  const handleBackToCourse = () => {
    if (!courseId) return;
    persistViewState();
    navigate(`/courses/${courseId}`);
  };

  // "Següent temari" avança a la següent activitat de CODI, saltant els tests
  const handleNext = () => {
    if (!course || !currentProblem) return;
    const codingProblems = (course.content?.flatMap((topic: any) => topic.subTopics || []) || []).filter(isCoding);
    const currentIndex = codingProblems.findIndex((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
    if (currentIndex >= 0 && currentIndex < codingProblems.length - 1) {
      const nextPath = problemPath(course.id, codingProblems[currentIndex + 1]);
      if (nextPath) {navigate(nextPath); return;}
    }

    const topics = course.content || []; let currentTopicId = '';
    for (const topic of topics) {const subs = topic.subTopics || []; if (subs.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId)) { currentTopicId = topic.id; break; }}
    navigate(`/courses/${course.id}${currentTopicId ? `?lessonId=${currentTopicId}` : ''}`);
  };

  const codeStorageKey = currentUser ? `code_${currentUser.id}_${courseId}_${lessonId}` : `temp_code_${lessonId}`;
  const getGlobalProgressKey = () => `${courseId}_${lessonId}`;
  const [activeTab, setActiveTab] = useState(0);
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const [peerSolutions, setPeerSolutions] = useState<any[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [col1Pct, setCol1Pct] = useState(readStatementWidth); // --- Resizable columns (desktop layout) ---
  const containerRef = useRef<HTMLDivElement>(null);
  // Columna de l'editor: amplada (botons compactes si és estreta) i alçada de la consola
  const editorColumnRef = useRef<HTMLDivElement>(null);
  const [editorColumnWidth, setEditorColumnWidth] = useState(1000);
  const compactHeader = editorColumnWidth < COMPACT_EDITOR_HEADER_PX;
  const [consoleHeight, setConsoleHeight] = useState(() => readConsoleHeight(180));
  const consoleDragStartRef = useRef(consoleHeight);
  const resizeConsole = (delta: number) => {
    const column = editorColumnRef.current?.offsetHeight || window.innerHeight;
    // Arrossegar cap amunt (delta negatiu) fa la consola més alta
    const next = Math.round(Math.min(column - 140, Math.max(60, consoleDragStartRef.current - delta)));
    setConsoleHeight(next);
    try { localStorage.setItem(CONSOLE_HEIGHT_KEY, String(next)); } catch { /* sense emmagatzematge */ }
  };
  useEffect(() => {
    const el = editorColumnRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setEditorColumnWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, loading, !!currentProblem]);
  const dragRef = useRef<{ type: 'col1'; startX: number; startPct: number } | null>(null);
  const handleDragStart = (type: 'col1') => (e: React.MouseEvent) => {e.preventDefault(); dragRef.current = { type, startX: e.clientX, startPct: col1Pct }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';};

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { startX, startPct } = dragRef.current;
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;
      const deltaPct = ((e.clientX - startX) / containerWidth) * 100;
      let newPct = startPct + deltaPct;
      newPct = Math.min(STATEMENT_MAX_PCT, Math.max(STATEMENT_MIN_PCT, newPct));
      setCol1Pct(newPct);
      try { localStorage.setItem(STATEMENT_WIDTH_KEY, String(Math.round(newPct))); } catch { /* sense emmagatzematge */ }
    };
    const handleMouseUp = () => {dragRef.current = null; document.body.style.cursor = '';document.body.style.userSelect = '';};
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Les pestanyes s'encongeixen si la columna és més estreta que l'amplada inicial, però no
  // creixen si és més ampla (amb la columna molt ampla la lletra quedava massa gran)
  const tabScale = Math.min(1, Math.max(0.6, col1Pct / STATEMENT_DEFAULT_PCT));
  const tabFontSize = Math.round(13 * tabScale * 12) / 10;
  const tabIconSize = Math.max(8, Math.round(10 * tabScale));

  useEffect(() => {
    if (currentProblem) {
      // Carrega l'estat de cada fitxer (python + react) des de localStorage
      const raw = localStorage.getItem(codeStorageKey);
      let saved: Record<EditorLang, string> | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && ('python' in parsed || 'react' in parsed)) {
            saved = { python: parsed.python || '', react: parsed.react || '' };
          }
        } catch { /* migració: valor antic (string) */ }
      }
      if (!saved && raw) saved = { python: raw, react: '' };
      setCodeByLang({
        python: saved?.python || currentProblem?.precode || '',
        react: saved?.react || '',
      });
      setDiagnostics([]);
      // Recupera l'estat de vista (cursor/selecció/scroll) desat per a aquesta lliçó
      try {
        const rawView = localStorage.getItem(`${codeStorageKey}_view`);
        viewStateRef.current = rawView ? JSON.parse(rawView) : { python: null, react: null };
      } catch { viewStateRef.current = { python: null, react: null }; }
      setViewRestoreKey((k) => k + 1);
      const progressKey = currentUser ? `mooc_global_progress_${currentUser.id}` : 'mooc_global_progress';
      const globalProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const key = getGlobalProgressKey();
      const isPass = !!globalProgress[key];
      if (isPass) setStatus('pass'); else setStatus('idle');
      setConsoleOutput([]); setIsDirty(false); setWasSavedInSession(false); setShowResultModal(false); setBackHidden(false);
      setActiveTab(0);
      setSubmittedStatus(null);
      setActiveVersion(null);
    }
    // Només en obrir un problema (o quan n'arriben les dades per primer cop): si el detall es
    // torna a demanar (p. ex. després d'enviar), no s'ha d'esborrar el codi ni la consola.
  }, [currentUser?.id, courseId, lessonId, !!currentProblem]);

  // Sense esborrany local de Python (un altre dispositiu, o s'ha sortit de la sessió, que l'esborra):
  // es recupera la còpia de seguretat del servidor, si l'alumne encara no ha tocat l'editor.
  useEffect(() => {
    if (!currentUser || !currentProblem || !currentTopicSlug || !lessonId) return;
    try {
      const raw = localStorage.getItem(codeStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (typeof parsed === 'string' ? parsed : parsed?.python) return;
    } catch { return; }
    let cancelled = false;
    courseService.getCodeBackup(resolveSlug(courseId!), currentTopicSlug, lessonId)
      .then((code) => {
        if (cancelled || !code) return;
        lastBackupRef.current = code;
        setCodeByLang((prev) => (prev.python === (currentProblem.precode || '') ? { ...prev, python: code } : prev));
      })
      .catch(() => { /* sense còpia: es queda el codi inicial */ });
    return () => { cancelled = true; };
  }, [currentUser, courseId, lessonId, currentTopicSlug, currentProblem, codeStorageKey]);

  // Disposa els models de la lliçó anterior per evitar que s'acumulin
  useEffect(() => {
    const key = `${courseId}/${lessonId}`;
    if (disposedLessonKeyRef.current && disposedLessonKeyRef.current !== key) {
      const m = monacoInstanceRef.current;
      if (m) {
        ([PYTHON_FILE, REACT_FILE] as const).forEach((file) => {
          const uri = m.Uri.parse(`${LESSON_URI_PREFIX}/${disposedLessonKeyRef.current}/${file}`);
          m.editor.getModel(uri)?.dispose();
        });
      }
    }
    disposedLessonKeyRef.current = key;
  }, [courseId, lessonId]);

  useEffect(() => {
    if (submissionsRefreshKey) {} 
  }, [submissionsRefreshKey]);

  useEffect(() => {
    if (!isDirty || !currentUser) return;
    const id = setInterval(() => {
      handleSaveProgress(false);
    }, 10000);
    return () => clearInterval(id);
  }, [isDirty, currentUser, codeStorageKey]);

  // Desa l'estat de vista (cursor/scroll) en desmuntar la pàgina
  useEffect(() => () => persistViewState(), []);

  // El desament automàtic (cada 10 s mentre s'escriu) és silenciós: només s'avisa si falla,
  // i un sol cop fins que torna a funcionar.
  const saveErrorShownRef = useRef(false);
  const handleSaveProgress = async (isAutoSaveOnPass = false) => {
    if (!currentUser || !courseId || !lessonId) return;
    persistViewState();
    setIsSaving(true);
    try {
      const progressKey = `mooc_global_progress_${currentUser.id}`;
      const globalProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const key = getGlobalProgressKey();
      localStorage.setItem(codeStorageKey, JSON.stringify(codeStorageRef.current));
      localStorage.setItem(`${codeStorageKey}_ts`, String(Date.now()));
      // El codi Python també es desa al servidor: és el que queda en sortir de la sessió
      // (l'esborrany local s'esborra) i el que es veu des d'un altre dispositiu.
      const python = codeStorageRef.current.python;
      if (python && python !== lastBackupRef.current && currentTopicSlug) {
        lastBackupRef.current = python;
        void courseService.saveCodeBackup(resolveSlug(courseId), currentTopicSlug, lessonId, python)
          .catch(() => { lastBackupRef.current = null; });
      }
      if (isAutoSaveOnPass) {
        globalProgress[key] = true;
        localStorage.setItem(progressKey, JSON.stringify(globalProgress));
      } else if (!globalProgress[key]) {
        globalProgress[key] = 'attempted';
        localStorage.setItem(progressKey, JSON.stringify(globalProgress));
      }
      localStorage.setItem(userKey(LAST_SESSION_KEY), JSON.stringify({courseId, lessonId, courseTitle: getText(course?.title), lessonTitle: getText(currentProblem?.subtitle), timestamp: Date.now()}));
      setIsDirty(false); setWasSavedInSession(true);
      await api.postProgress({ studentId: currentUser.id, courseId, lessonId, status: globalProgress[key] || false });
      window.dispatchEvent(new Event('lessonProgressUpdated'));
      document.dispatchEvent(new Event('lessonProgressUpdated'));
      saveErrorShownRef.current = false;
    } catch (err) {
      console.error('Error en desar el progrés:', err);
      if (!saveErrorShownRef.current) {
        saveErrorShownRef.current = true;
        addNotification(t('notifications.progress_error'), 'error');
      }
    } 
    finally { setIsSaving(false); }
  };

  // Missatges de consola per al resultat d'un enviament: estat i proves que han fallat
  const describeSubmission = (result: any, passed: boolean): ConsoleLine[] => {
    const lines: ConsoleLine[] = [];
    const tests: any[] = Array.isArray(result?.test_results) ? result.test_results : [];
    if (result?.feedback) lines.push(String(result.feedback));
    if (result?.code_error) lines.push({ kind: 'stderr', text: String(result.code_error) });
    if (tests.length) {
      const ok = tests.filter((r) => r.passed).length;
      lines.push(`${ok === tests.length ? '✅' : '❌'} ${t('lesson.checks_summary', 'Proves superades: {{passed}} de {{total}}', { passed: ok, total: tests.length })}`);
      tests.filter((r) => !r.passed).slice(0, 5).forEach((r) => {
        lines.push({ kind: 'stderr', text: t('lesson.check_failed', 'Prova {{n}} fallada', { n: r.order ?? '?' }) });
        if (r.input) lines.push({ kind: 'info', text: `${t('lesson.check_input', 'Entrada')}: ${r.input}` });
        if (r.expected != null) lines.push({ kind: 'info', text: `${t('lesson.check_expected', 'Esperat')}: ${r.expected}` });
        if (r.actual != null) lines.push({ kind: 'info', text: `${t('lesson.check_actual', 'Obtingut')}: ${r.actual}` });
        if (r.error) lines.push({ kind: 'stderr', text: String(r.error) });
      });
    }
    if (passed) lines.push(`✅ ${t('lesson.status_accepted_long', 'Problema resolt! Ja pots veure la solució i les dels companys.')}`);
    else if (result?.status === 'partially_rejected') lines.push(`❌ ${t('lesson.status_partial_long', "Gairebé: algunes proves no passen. Revisa-les i torna-ho a enviar.")}`);
    else if (result?.status === 'fully_rejected') lines.push(`❌ ${t('lesson.status_rejected_long', 'La solució no és correcta. Revisa-la i torna-ho a enviar.')}`);
    return lines;
  };

  const handleRunTests = async () => {
    if (currentProblem?.type === 'test') {
      navigate(testPath(lessonId!), { replace: true });
      return;
    }
    const wasSolvedBefore = solved;
    setConsoleOutput([`[${t('lesson.system', 'SISTEMA')}]: ${t('lesson.executing', 'Executant...')}`]);
    setStatus('idle');
    try {const topic = course?.content?.find((t: any) => t.subTopics?.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId)); if (!topic) throw new Error('Topic not found'); setConsoleOutput(p => [...p, `📤 ${t('lesson.sending', 'Enviant al servidor...')}`]);
      const result = await courseService.submitChallenge(courseId!,topic.id,lessonId!,{code: userInputRef.current, language: selectedLanguage });
      setConsoleOutput(p => [...p, `✅ ${t('lesson.submitted', 'Resposta enviada al servidor')}`]);
      // El servidor corregeix: `accepted` vol dir que passa totes les proves
      const passed = result?.status ? result.status === 'accepted' : !isRejectedResult(result);
      setConsoleOutput(p => [...p, ...describeSubmission(result, passed)]);
      if (result?.status) setSubmittedStatus({ status: result.status, submission_count: result.submission_count });
      // Detall i llista del curs al dia: estat propi i, si s'ha resolt, la solució de referència
      void queryClient.invalidateQueries({ queryKey: ['problem', courseId, currentTopicSlug, lessonId] });
      void queryClient.invalidateQueries({ queryKey: ['own-submission', courseId, currentTopicSlug, lessonId] });
      if (result?.status) {
        queryClient.setQueryData(['course', courseId], (old: any) => old && ({
          ...old,
          content: (old.content || []).map((tp: any) => ({
            ...tp,
            subTopics: (tp.subTopics || []).map((st: any) => (st.problemSlug === lessonId
              ? { ...st, mySolution: { ...(st.mySolution || {}), status: result.status, submission_count: result.submission_count, last_submitted_at: new Date().toISOString() } }
              : st)),
          })),
        }));
      }
      // Només es marca com a completada (i suma punts) si el servidor l'ha donat per correcta
      await handleSaveProgress(passed);
      if (passed) {setStatus('pass'); confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
        // Sincronitza els punts amb el backend: actualitza header i leaderboard

      } else {  setStatus('fail');}

      // Sincronitza els punts amb el backend (header, leaderboard i activitat llegeixen el mateix valor).
      // Sempre es refresca després d'enviar; amb reintents només si l'activitat s'ha superat.
      // Els punts guanyats els diu el servidor (`stars_earned`, només quan n'atorga): fora del
      // període del tema, o si ja estava resolt, l'enviament no en suma.
      const student = getCurrentStudent();
      const earned = Number(result?.stars_earned) || 0;
      const pointsNote: ConsoleLine | null = earned > 0
        ? `🏆 ${t('lesson.points_earned', '+{{points}} punts!', { points: earned })}`
        : passed && wasSolvedBefore
          ? { kind: 'info', text: t('lesson.points_already_solved', 'Ja l\'havies resolt: aquest enviament no suma punts.') }
          : passed && topicClosed
            ? { kind: 'info', text: t('lesson.points_topic_closed', "Els enviaments d'aquest tema ja no sumen punts.") }
            : null;
      void refreshCoursePoints(course?.slug || courseId!, earned > 0 ? 4 : 0, 1000, result).then(() => {
        if (!student) return;
        setConsoleOutput(p => [...p,
          ...(pointsNote ? [pointsNote] : []),
          `🏆 ${t('lesson.total_points', 'Punts totals: {{points}}', { points: getTotalPoints(student.id) })}`,
        ]);
      });

      setSubmissionsRefreshKey(k => k + 1);
    } catch (err: any) {
      const message =
        apiErrorMessages(err).join(' ') ||
        err?.message ||
        t('lesson.submit_error', 'Error en enviar la resposta');
      console.error('Error en enviar la submissió:', err);
      setConsoleOutput(p => [...p, `⚠️ ${message}`]);
      setStatus('fail');
      addNotification(message, 'error');
    }
  };

  const handleResetCode = () => {
    if (!window.confirm(t('lesson.reset_confirm', 'Segur que vols tornar a començar el codi?'))) return;
    setCodeByLang({ python: currentProblem?.precode || '', react: '' });
    setConsoleOutput([]);
    setStatus('idle');
    setWasSavedInSession(false);
    setIsDirty(true);
  };

  // "Executar": tornar-hi a clicar mentre el programa s'executa l'atura
  const handleLocalRun = () => {
    if (isRunning) { stopPythonCode(); return; }
    if (selectedLanguage !== 'python' || !userInputRef.current.trim()) return;
    setStatus('idle');
    setRunSource('editor');
    void runPythonCode(userInputRef.current);
  };

  // Executa a la consola la solució de referència o la d'un company (com a algorien)
  const runOtherCode = (source: string, code: string) => {
    if (isRunning) { stopPythonCode(); if (runSource === source) return; }
    setRunSource(source);
    void runPythonCode(code);
  };
  runShortcutRef.current = () => {
    if (selectedLanguage !== 'python' || !userInputRef.current.trim()) return;
    setStatus('idle');
    setRunSource('editor');
    void runPythonCode(userInputRef.current); // si n'hi havia un en marxa, s'atura i es torna a executar
  };

  // Les mateixes condicions que el botó Enviar (no mentre s'executa ni amb l'editor buit)
  submitShortcutRef.current = () => { if (canSubmit) void handleRunTests(); };

  // === Eines de l'editor ===
  const requestAiHint = () => {
    setActiveTab(3);
    void aiHints.generate(userInputRef.current, t('lesson.hint_error', "No s'ha pogut obtenir la pista. Torna-ho a provar."));
  };
  const openPythonTutor = () => { window.open(pythonTutorUrl(userInputRef.current), '_blank', 'noopener'); };
  const zoomEditor = (delta: number) => setEditorFontSize((prev) => {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
    try { localStorage.setItem(FONT_SIZE_KEY, String(next)); } catch { /* sense emmagatzematge */ }
    return next;
  });
  const editorOptions = (minimap: boolean) => ({ ...getMonacoEditorOptions(minimap), fontSize: editorFontSize, lineHeight: Math.round(editorFontSize * 4 / 3) });
  // Versions del codi que es poden recuperar (com el selector d'algorien)
  const loadVersions = async (): Promise<CodeVersion[]> => {
    let local: CodeVersion = { id: 'local', code: null };
    try {
      const raw = localStorage.getItem(codeStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const code = typeof parsed === 'string' ? parsed : parsed?.python;
      const ts = Number(localStorage.getItem(`${codeStorageKey}_ts`));
      local = { id: 'local', code: code || null, at: ts ? new Date(ts).toISOString() : null };
    } catch { /* esborrany il·legible */ }
    const slug = resolveSlug(courseId!);
    const [backup, submitted] = currentUser && currentTopicSlug
      ? await Promise.all([
        courseService.getCodeBackupVersion(slug, currentTopicSlug, lessonId!).catch(() => null),
        courseService.getOwnSubmission(slug, currentTopicSlug, lessonId!).catch(() => null),
      ])
      : [null, null];
    return [
      local,
      { id: 'backup', code: backup?.code || null, at: backup?.at },
      { id: 'submitted', code: submitted?.code || null, at: submitted?.last_submitted_at },
      { id: 'starter', code: currentProblem?.precode || null },
    ];
  };
  // Es substitueix el contingut com una edició: Ctrl+Z la desfà
  const pickVersion = (v: CodeVersion) => {
    const editor = editorRef.current;
    if (v.code == null) return;
    const model = editor?.getModel();
    if (editor && model) {
      editor.pushUndoStop();
      editor.executeEdits('version-picker', [{ range: model.getFullModelRange(), text: v.code }]);
      editor.pushUndoStop();
      editor.focus();
    } else {
      setCodeByLang((prev) => ({ ...prev, python: v.code! }));
    }
    setActiveVersion(v.id);
  };
  const runLabel = t('lesson.run_button', 'Executar');
  const stopLabel = t('lesson.stop_button', 'Atura');

  const loadPeerSolutions = async () => {
    if (!courseId || !lessonId || !course) return;
    setLoadingPeers(true);
    try {
      const topic = course?.content?.find((t: any) =>
        t.subTopics?.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId)
      );
      if (!topic) throw new Error('Topic not found');
      const data = await courseService.getPeerSubmissions(courseId, topic.id, lessonId);
      setPeerSolutions(data);} 
      catch {setPeerSolutions([]);
    } finally {setLoadingPeers(false);}
  };

  useEffect(() => {if (activeTab === 2 && peersUnlocked) {loadPeerSolutions();}}, [activeTab, peersUnlocked, courseId, lessonId]);

  if (loading) return <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}><CircularProgress color="secondary" /></Box>;
  if (!course) return null;
  if (!currentProblem) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999, flexDirection: 'column', gap: 2 }}>
      <CircularProgress color="secondary" />
      <Typography>{t('lesson.loading_problem', 'Carregant problema...')}</Typography>
    </Box>
  );

  const userProgressKey = currentUser ? `mooc_global_progress_${currentUser.id}` : 'mooc_global_progress';
  const userProgressData = JSON.parse(localStorage.getItem(userProgressKey) || '{}');
  const allProblems = course?.content?.flatMap((topic: any) => topic.subTopics || []) || [];
  const globalProgress = allProblems.reduce((acc: number, sub: any) => acc + (userProgressData[`${courseId}_${sub.problemSlug || sub.slug}`] === true ? 1 : 0), 0);
  const progressPercent = allProblems.length ? (globalProgress / allProblems.length) * 100 : 0;

  // "Anterior" es desactiva a la primera activitat de codi del curs
  const codingProblems = allProblems.filter(isCoding);
  const isFirstCoding = codingProblems.findIndex((s: any) => s.problemSlug === lessonId || s.slug === lessonId) <= 0;

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden' }}>
        {progressPercent > 0 && <Box sx={{ height: 4, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: 'primary.main' }} /></Box>}
        <Box sx={{height: 48, borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', px: 1, justifyContent: 'space-between', flexShrink: 0, mt: 5}}>
          <BackToCourseButton label={t('lesson.back_to_course', 'Torna al curs')} onClick={handleBackToCourse} fontSize={12} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', pb: '0px' }}>
          <Box sx={{ width: '100%', bgcolor: 'background.paper', p: 1, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', flexShrink: 0 }}>
            <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, color: 'primary.main' }}>{t('lesson.your_challenge')}</Typography>
              {topicClosed && (
                <Typography sx={{ fontSize: '0.75rem', color: 'warning.main', mb: 0.5 }}>{t('lesson.points_topic_closed', "Els enviaments d'aquest tema ja no sumen punts.")}</Typography>
              )}
              <Box sx={{ maxHeight: '26vh', overflowY: 'auto' }}>
                <MarkdownContent fontSize="0.85rem">{statementMarkdown}</MarkdownContent>
              </Box>
            </Box>
            {status === 'fail' && !backHidden && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button onClick={() => { setShowResultModal(false); setBackHidden(true); }} sx={{ color: 'white', fontSize: 15, minWidth: 0, p: 0.5, '&:hover': { color: '#fff' } }}>{t('lesson.back')}</Button>
              </Box>
            )}
          </Box>
          {/* SOLUCIÓ DEL PROFESSOR (MÒBIL) */}
          {activeTab === 1 && solutionUnlocked && monaco && (
            <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#1e1e1e', p: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', mb: 1, color: '#c084fc' }}>
                {t('lesson.teacher_solution_title', 'professor')}
              </Typography>
              {referenceSolution ? (
                <CodeBlock
                  code={referenceSolution}
                  onRun={() => runOtherCode('solution', referenceSolution)}
                  running={isRunning && runSource === 'solution'}
                  runLabel={runLabel}
                  stopLabel={stopLabel}
                />
              ) : (
                <Typography sx={{ fontSize: 11, color: '#aaa' }}>
                  {t('lesson.no_solution_available', 'No hi ha solució disponible per aquest exercici.')}
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ display: activeTab === 1 && solutionUnlocked ? 'none' : 'flex', flexDirection: 'column', flex: 1, bgcolor: '#1e1e1e', overflow: 'hidden' }}>
            <Box sx={{ height: 36, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
              {/* "Editor" només fa falta per distingir-lo de la visualització (cursos de React) */}
              {isReactCourse ? <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 500 }}>{t('lesson.app_file')}</Typography> : <Box />}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditorFileTabs value={selectedLanguage} files={editorFiles} onChange={handleLanguageChange} />
                <SolutionStatusChip status={solutionStatus} submissions={submissionCount} lastSubmittedAt={mySolution?.last_submitted_at} compact />
                <EditorDiagnosticsBadge markers={diagnostics} />
                {isReactCourse && (
                  <Tooltip title={liveRenderTooltip} arrow>
                    <IconButton size="small" aria-label={liveRenderTooltip} onClick={() => setShowLiveRender(v => !v)} sx={{ p: 0.5 }}>
                      {showLiveRender ? <EyeOff size={14} color="#fff" /> : <Eye size={14} color="#fff" />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {monaco ? (
                // Absolut: el contenidor flex no té alçada fixa, i amb height: 100% Monaco quedava a 0 px
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <Editor
                    height="100%"
                    path={getFile(selectedLanguage).path}
                    language={getFile(selectedLanguage).language}
                    theme={getMonacoEditorTheme(mode)}
                    value={userInput}
                    onMount={handleEditorMount}
                    onValidate={handleValidate}
                      onChange={(value: string | undefined) => { setCodeByLang(prev => ({ ...prev, [selectedLanguage]: value || '' })); setIsDirty(true); setWasSavedInSession(false); if (!value || value.trim().length === 0) setConsoleOutput([]); }}
                    options={editorOptions(false)}
                  />
                </Box>
              ) : (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
              )}
            </Box>
          </Box>

          {/* VISUALITZACIÓ EN TEMPS REAL (MÒBIL) */}
          {isReactCourse && showLiveRender && !(activeTab === 1 && solutionUnlocked) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Box sx={{ height: 30, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>{t('lesson.live_render', 'Visualització')}</Typography>
              </Box>
              <Box sx={{ flex: 1, height: 0, display: 'flex', minHeight: 0 }}>
                <ReactLivePreview monaco={monaco} code={codeByLang.react} dark={mode !== 'light'} />
              </Box>
            </Box>
          )}
        </Box>

        <ResizeHandle orientation="horizontal" thickness={8} ariaLabel={t('lesson.resize_console', 'Canvia la mida de la consola')} onDragStart={() => { consoleDragStartRef.current = consoleHeight; }} onDrag={resizeConsole} />
        <Box sx={{ height: consoleHeight, flexShrink: 0, display: 'flex' }}>
          <ConsolePanel 
            output={consoleOutput}
            emptyMessage={t('lesson.waiting_execution')}
            inputActive={inputActive}
            onInputSubmit={submitInput}
            inputLabel={consoleInputLabel}
            inputPlaceholder={consoleInputPlaceholder}
          />
        </Box>
        {/* Espai de la barra de botons fixa de sota */}
        <Box sx={{ height: 70, flexShrink: 0 }} />

        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, height: 70, flexShrink: 0, borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.paper', px: 2 }}>
          <IconButton onClick={handlePrevious} disabled={isFirstCoding} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1, p: 1 }}>
            <ChevronLeft size={20}/>
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
            <Tooltip title={resetTooltip} arrow>
              <IconButton onClick={handleResetCode} aria-label={resetTooltip} sx={{ border: '1px solid #444', borderRadius: 1, width: 28, height: 28, '&:hover': { bgcolor: '#333' } }}><RotateCcw size={15} color="red"/></IconButton>
            </Tooltip>
            {selectedLanguage === 'python' && (
              <Tooltip title={testTooltip} arrow>
                <Button onClick={handleLocalRun} variant="outlined" startIcon={isRunning ? <Square size={11} fill="currentColor" /> : <Play size={12} />} sx={{ fontWeight: 700, borderRadius: 1, fontSize: 11, borderColor: '#666', color: 'inherit', whiteSpace: 'nowrap' }}>{isRunning ? t('lesson.stop_button', 'Atura') : t('lesson.run_button', 'Executar')}</Button>
              </Tooltip>
            )}
            <Tooltip title={submitTooltip} arrow>
              {/* El span permet mostrar el tooltip encara que el botó estigui desactivat */}
              <Box component="span" sx={{ display: 'flex', flex: 1 }}>
                <Button onClick={handleRunTests} disabled={!canSubmit} variant="contained" fullWidth startIcon={<CloudUpload size={16} />} sx={{fontWeight: 900, borderRadius: 1, fontSize: 13 }}>{t('lesson.run')}</Button>
              </Box>
            </Tooltip>
          </Stack>
          <IconButton onClick={handleNext} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1.5, p: 1 }}>
            <ChevronRight size={20}/>
          </IconButton>
        </Box>
      </Box>
    );
  }

  // DESKTOP LAYOUT - Editor + Visualització en temps real neta al costat + Consola abaix
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden'}}>
      {progressPercent > 0 && <Box sx={{ height: 4, flexShrink: 0, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: 'primary.main' }} /></Box>}

      <Box ref={containerRef} sx={{ flex: 1, display: 'flex', minHeight: 0, mt: 10 }}>
        {/* COLUMNA 1: Enunciat / AI / Solucions */}
        <Box sx={{ width: `${col1Pct}%`, flexShrink: 0, borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', position: 'relative' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} centered sx={{ minHeight: 0, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', '& .MuiTabs-flexContainer': { justifyContent: 'center' }, '& .MuiTab-root': { minHeight: 20, fontSize: tabFontSize, fontWeight: 900, minWidth: 0, mt: 1, mb: 0.5, px: 1 * tabScale, ml: 2.5 * tabScale, color: mode === 'light' ? '#000' : 'inherit'}, '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' }}}>
            <Tab label={t('lesson.tab_statement', 'Enunciat')} />
            <Tab label={t('lesson.tab_teacher_solution', 'Solució')} icon={!solutionUnlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_other_solutions', 'Alumnes')} icon={!peersUnlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_ai_help', 'IA')} />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.5, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider' }}>
            <BackToCourseButton label={t('lesson.back_to_course', 'Torna al curs')} onClick={handleBackToCourse} fontSize={tabFontSize} />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, pb: isMdUp ? 14 : 10 }}>
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, mb: 3, color: mode === 'light' ? '#000' : 'inherit' }}>{getText(currentProblem?.subtitle)}</Typography>
                {topicClosed && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.25, mb: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}` }}>
                    <AlertTriangle size={16} color={theme.palette.warning.main} style={{ flexShrink: 0, marginTop: 2 }} />
                    <Typography sx={{ fontSize: '0.8rem' }}>{t('lesson.points_topic_closed', "Els enviaments d'aquest tema ja no sumen punts.")}</Typography>
                  </Box>
                )}
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1.5, mt: 2 }}>
                  <MarkdownContent>{statementMarkdown}</MarkdownContent>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              solutionUnlocked && referenceSolution ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <CodeBlock
                    code={referenceSolution}
                    header={t('lesson.teacher_solution_title', 'Solució de referència')}
                    onRun={() => runOtherCode('solution', referenceSolution)}
                    running={isRunning && runSource === 'solution'}
                    runLabel={runLabel}
                    stopLabel={stopLabel}
                  />
                </Box>
              ) : (<LockedTabMessage text={t('lesson.locked_teacher_solution', "Completa l'exercici correctament per desbloquejar la solució del professor.")} />)
            )}

            {activeTab === 2 && (
              peersUnlocked ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'primary.main' }}>
                    {t('lesson.other_solutions_title', 'Solucions dels companys')}
                  </Typography>
                  {loadingPeers ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>)
                  : peerSolutions.length === 0 ? (
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {t('lesson.no_other_solutions', 'No hi ha solucions d\'estudiants.')}
                    </Typography>
                  ) : (
                    peerSolutions.map((s: any, i: number) => {
                      // Als alumnes, el servidor les envia anònimes (anonymous_N); el professorat hi veu el nom
                      const anonymous = typeof s.username === 'string' && s.username.startsWith('anonymous_');
                      const name = anonymous
                        ? t('lesson.anonymous_n', 'Anònim {{n}}', { n: i + 1 })
                        : [s.first_name, s.last_name].filter(Boolean).join(' ') || s.username || t('lesson.student_fallback', 'Estudiant');
                      const code = s.code || '';
                      return (
                        <CodeBlock
                          key={s.id ?? i}
                          code={code}
                          header={name}
                          onRun={code ? () => runOtherCode(`peer-${i}`, code) : undefined}
                          running={isRunning && runSource === `peer-${i}`}
                          runLabel={runLabel}
                          stopLabel={stopLabel}
                        />
                      );
                    })
                  )}
                </Box>
              ) : (<LockedTabMessage text={t('lesson.locked_other_solutions', "Completa l'exercici correctament per veure les solucions d'altres estudiants.")} />)
            )}

            {activeTab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 2, color: 'primary.main' }}>
                  {t('lesson.tab_ai_help', 'IA')}
                </Typography>
                <AiHelpPanel
                  courseId={courseId!} topicSlug={currentTopicSlug} lessonId={lessonId!}
                  hints={aiHints.hints} loadingHints={aiHints.loadingList} generating={aiHints.generating}
                  hintError={aiHints.error} remaining={hintsRemaining} hintsAvailable={hintsAvailable}
                  onLoadHints={aiHints.load} onRequestHint={requestAiHint}
                />
              </Box>
            )}
          </Box>

          {/* Botons de navegació inferior esquerra */}
          <Box sx={{ height: 60, px: 4, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
            <Button onClick={handlePrevious} disabled={isFirstCoding} variant="outlined" size="small" startIcon={<ChevronLeft size={16} />} sx={{ fontWeight: 700, fontSize: 13, borderColor: mode === 'light' ? '#000' : 'divider', color: 'text.primary' }}>
              {t('lesson.previous', 'Anterior')}
            </Button>
            <Button onClick={handleNext} variant="contained" size="small" endIcon={<ChevronRight size={16} />} sx={{ fontWeight: 700, fontSize: 13, bgcolor: 'primary.main', color: '#fff' }}>
              {t('lesson.next', 'Següent')}
            </Button>
          </Box>
        </Box>

        <Box onMouseDown={handleDragStart('col1')} sx={{width: 4,flexShrink: 0,cursor: 'col-resize',bgcolor: mode === 'light' ? 'black' : '#8400ff','&:hover': { bgcolor: '#8400ff' },transition: 'background-color 0.15s',}}/>

        
        <Box ref={editorColumnRef} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}> {/* COLUMNA 2: EDITOR + VISUALITZACIÓ EN DIRECTE*/}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}> {/* SECCIÓ SUPERIOR: SPLIT DE CODI I VISUALITZACIÓ EN DIRECTE */}
           {/* Capçalera: cobreix l'editor i la visualització */}
            <Box sx={{ height: 60, px: compactHeader ? 1 : 2, gap: 1, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
              {/* Esquerra: llenguatge i estat, i a continuació Executar i Enviar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: compactHeader ? 1 : 1.5, minWidth: 0 }}>
                {isReactCourse && !compactHeader && <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>{t('lesson.app_file', 'Codi')}</Typography>}
                <EditorFileTabs value={selectedLanguage} files={editorFiles} onChange={handleLanguageChange} />
                <SolutionStatusChip status={solutionStatus} submissions={submissionCount} lastSubmittedAt={mySolution?.last_submitted_at} compact={compactHeader} />
                <EditorDiagnosticsBadge markers={diagnostics} />
                <Box sx={{ width: '1px', height: 22, bgcolor: '#3f3f46', mx: compactHeader ? 0.25 : 0.75, flexShrink: 0 }} />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                  {selectedLanguage === 'python' && (
                    <Tooltip title={`${testTooltip} (Shift+Enter)`} arrow>
                      {compactHeader ? (
                        <IconButton onClick={handleLocalRun} aria-label={testTooltip} sx={{ border: '1px solid', borderColor: isRunning ? '#f87171' : '#666', borderRadius: 1, width: 32, height: 32, color: '#fff', '&:hover': { bgcolor: '#222', borderColor: '#888' } }}>
                          {isRunning ? <Square size={12} fill="#fff"/> : <Play size={14} fill="#fff"/>}
                        </IconButton>
                      ) : (
                        <Button onClick={handleLocalRun} variant="outlined" startIcon={isRunning ? <Square size={11} fill="#fff"/> : <Play size={12} fill="#fff"/>} sx={{ borderColor: isRunning ? '#f87171' : '#666', color: '#fff', height: 32, fontSize: 11, fontWeight: 700, px: 2, borderRadius: 1, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#222', borderColor: '#888' } }}>
                          {isRunning ? t('lesson.stop_button', 'Atura') : t('lesson.run_button', 'Executar')}
                        </Button>
                      )}
                    </Tooltip>
                  )}
                  <Tooltip title={canSubmit ? `${submitTooltip} (${IS_MAC ? '⌘' : 'Ctrl'}+Enter)` : submitTooltip} arrow>
                    {/* El span permet mostrar el tooltip encara que el botó estigui desactivat */}
                    <Box component="span" sx={{ display: 'inline-flex' }}>
                      {compactHeader ? (
                        <IconButton onClick={handleRunTests} disabled={!canSubmit} aria-label={submitTooltip} sx={{ '&.Mui-disabled': { bgcolor: '#333', color: '#777' }, bgcolor: '#fff', color: '#000', width: 40, height: 32, borderRadius: 1, '&:hover': { bgcolor: '#e0e0e0' } }}>
                          <CloudUpload size={17}/>
                        </IconButton>
                      ) : (
                        <Button onClick={handleRunTests} disabled={!canSubmit} variant="contained" startIcon={<CloudUpload size={15}/>} sx={{ '&.Mui-disabled': { bgcolor: '#333', color: '#777' }, bgcolor: '#fff', color: '#000', height: 32, fontSize: 11, fontWeight: 900, px: 2.5, borderRadius: 1, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#e0e0e0' } }}>
                          {t('lesson.run', 'Enviar')}
                        </Button>
                      )}
                    </Box>
                  </Tooltip>
                </Stack>
              </Box>
              {/* Dreta: eines de l'editor (com a algorien) */}
              {selectedLanguage === 'python' && (
                <Box sx={{ flexShrink: 0 }}>
                  <EditorToolbar
                    compact={compactHeader}
                    onAiHint={requestAiHint}
                    showAiHint={hintsAvailable}
                    aiBusy={aiHints.generating}
                    hintsRemaining={hintsRemaining}
                    onPythonTutor={openPythonTutor}
                    onShortcuts={() => setShortcutsOpen(true)}
                    loadVersions={loadVersions}
                    activeVersion={activeVersion}
                    onPickVersion={pickVersion}
                    onZoomIn={() => zoomEditor(2)}
                    onZoomOut={() => zoomEditor(-2)}
                  />
                </Box>
              )}
            </Box>
            <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
              {/* L'Editor de Codi */}
              <Box ref={contentRef} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0, borderRight: isReactCourse ? '1px solid #8400ff' : 'none'}}>
                {monaco ? (
                  <Box key={fadeKey} sx={{ height: '100%' }}>
                    <Editor
                      height="100%"
                      path={getFile(selectedLanguage).path}
                      language={getFile(selectedLanguage).language}
                      theme={getMonacoEditorTheme(mode)}
                      value={userInput}
                      onMount={handleEditorMount}
                      onValidate={handleValidate}
                      onChange={(value: string | undefined) => { setCodeByLang(prev => ({ ...prev, [selectedLanguage]: value || '' })); setIsDirty(true); setWasSavedInSession(false); if (!value || value.trim().length === 0) setConsoleOutput([]); }}
                      options={editorOptions(true)}
                    />
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                )}
              </Box>

              {/* LIVE RENDER: només als cursos de React (Python fa servir tota l'amplada per a l'editor) */}
              {isReactCourse && (
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0 }}>
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                    <ReactLivePreview monaco={monaco} code={codeByLang.react} dark={mode !== 'light'} />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* CONSOLA */}
          <ResizeHandle orientation="horizontal" ariaLabel={t('lesson.resize_console', 'Canvia la mida de la consola')} onDragStart={() => { consoleDragStartRef.current = consoleHeight; }} onDrag={resizeConsole} />
          <Box sx={{ height: consoleHeight, flexShrink: 0, display: 'flex' }}>
            <ConsolePanel 
              output={consoleOutput}
              emptyMessage={t('lesson.waiting_execution', "Esperant l'execució del codi...")}
              inputActive={inputActive}
              onInputSubmit={submitInput}
              inputLabel={consoleInputLabel}
              inputPlaceholder={consoleInputPlaceholder}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}