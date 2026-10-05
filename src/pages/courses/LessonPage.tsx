import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, RotateCcw, Lock, Sparkles, Code2, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Box, Typography, Button, IconButton, Stack, alpha, CircularProgress, useTheme, useMediaQuery, Tabs, Tab } from '@mui/material';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { api } from '../../services/api';
import { getMonacoEditorOptions, getMonacoEditorTheme, loadMonaco, registerMonacoThemes, registerPythonCompletionProvider, setupTypescriptDefaults } from '../../utils/monaco';
import { ReactLivePreview } from '../../components/ReactLivePreview';
import { ConsolePanel } from '../../components/ConsolePanel';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationContext';
import { useCourse } from '../../hooks/useCourse';
import { useThemeMode } from '../../hooks/useTheme';
import { courseService } from '../../services/courseService';
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
const REACT_FILE = 'React.tsx';
const LESSON_URI_PREFIX = 'file:///lesson';

function EditorFileTabs({ value, files, onChange }: { value: EditorLang; files: Record<EditorLang, EditorFileInfo>; onChange: (v: EditorLang) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {(Object.keys(files) as EditorLang[]).map((lang) => {
        const active = value === lang;
        return (
          <Box
            key={lang}
            onClick={() => onChange(lang)}
            title={files[lang].language}
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
            {files[lang].label}
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
  const errors = markers.filter((m) => m.severity === MONACO_SEVERITY_ERROR).length;
  const warnings = markers.filter((m) => m.severity === MONACO_SEVERITY_WARNING).length;
  if (!errors && !warnings) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {errors > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }} title={`${errors} error(s)`}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f87171' }} />
          <Typography sx={{ fontSize: 10, fontWeight: 800, lineHeight: 1, color: '#f87171' }}>{errors}</Typography>
        </Box>
      )}
      {warnings > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }} title={`${warnings} avís(s)`}>
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

// === Validació de rellevància: el que escriu l'usuari ha de tenir a veure amb l'enunciat ===
const STOPWORDS = new Set((
  // català
  'aquest aquesta aquests aquestes aixo això amb per com que són sou som has han hem heu una uns unes els les del dels pel pels mes més molt molta tot tota tots totes seu seva seus seves nostre vostre fer fem fet fins entre sobre sota cada quan quin quina mentre doncs perque perquè també tambe sense dins fora ' +
  // castellà
  'este esta estos estas eso esto con por como los las del una unos unas para pero mas más muy todo toda todos todas sus nuestro vuestro hacer hace hecho hasta entre sobre cada cuando cual mientras entonces porque tambien también sin dentro fuera ' +
  // anglès
  'the and for are but not you all any can had her was one our out has have this that with from they will what when your into than then them these those there their been were which while would could should about each make like just over also'
).split(/\s+/).filter(Boolean));

const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const extractKeywords = (s: string): Set<string> => {
  const out = new Set<string>();
  normalizeText(s).split(/[^a-z0-9]+/).forEach((w) => {
    if (w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) out.add(w);
  });
  return out;
};

// Dues paraules "coincideixen" si són iguals o comparteixen l'arrel (primers 5 caràcters)
const sameWord = (a: string, b: string) =>
  a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));

// Recull recursivament tots els textos de l'activitat (qualsevol idioma/camp), excepte metadades
const STATEMENT_SKIP_KEYS = new Set(['id', 'slug', 'problemSlug', 'type', 'precode', 'image', 'img', 'url', 'icon', 'order', 'points']);
function collectStatementStrings(node: any, extraSkip?: Set<string>, depth = 0): string[] {
  if (node == null || depth > 5) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap((n) => collectStatementStrings(n, extraSkip, depth + 1));
  if (typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => (STATEMENT_SKIP_KEYS.has(k) || extraSkip?.has(k) ? [] : collectStatementStrings(v, extraSkip, depth + 1)));
  }
  return [];
}


const PY_CONCEPTS: Array<{ label: string; words: string[]; test: RegExp }> = [
  { label: 'print()', words: ['imprim', 'print', 'mostr', 'escriu', 'escrib', 'output', 'sortida', 'salida'], test: /\bprint\s*\(/ },
  { label: 'assignació de variable', words: ['variabl', 'assign', 'asign'], test: /^\s*[A-Za-z_]\w*\s*(?:[+\-*/%]?=)(?!=)/m },
  { label: 'enter', words: ['enter', 'entero', 'integer'], test: /\b\d+\b|\bint\s*\(/ },
  { label: 'decimal', words: ['decimal', 'float', 'flotant'], test: /\d+\.\d+|\bfloat\s*\(/ },
  { label: 'cadena de text', words: ['cadena', 'string', 'caracter'], test: /["']/ },
  { label: 'llista', words: ['llista', 'lista', 'list'], test: /\[|\blist\s*\(/ },
  { label: 'diccionari', words: ['diccionari', 'diccionario', 'dict'], test: /\{|\bdict\s*\(/ },
  { label: 'for/while', words: ['bucle', 'repeteix', 'repite', 'loop', 'mentre', 'while', 'iter'], test: /\bfor\b|\bwhile\b/ },
  { label: 'if', words: ['condicion', 'condition', 'else', 'altrament', 'sino'], test: /\bif\b/ },
  { label: 'def', words: ['funci', 'function', 'defin'], test: /\bdef\b|\blambda\b/ },
  { label: 'operació', words: ['suma', 'resta', 'multiplic', 'divid', 'operaci', 'calcul'], test: /[+\-*/%]|\bsum\s*\(/ },
  { label: 'input()', words: ['demana', 'pregunta', 'input', 'entrada', 'teclat'], test: /\binput\s*\(/ },
  { label: 'return', words: ['retorn', 'return', 'devuelve'], test: /\breturn\b/ },
  { label: 'import', words: ['import'], test: /\bimport\b|\bfrom\b/ },
];

// Analitza el codi segons els conceptes que demana l'enunciat. Retorna null si no n'activa cap.
function analyzePythonConcepts(code: string, statementOnly: string): { active: string[]; missing: string[]; pass: boolean } | null {
  const words = Array.from(extractKeywords(statementOnly));
  const active = PY_CONCEPTS.filter((c) => words.some((w) => c.words.some((p) => w.startsWith(p))));
  if (active.length === 0) return null;
  const cleanCode = code.split('\n').map((l) => l.replace(/#.*$/, '')).join('\n');
  const missing = active.filter((c) => !c.test.test(cleanCode)).map((c) => c.label);
  const required = active.length <= 2 ? active.length : Math.ceil(active.length * 0.75);
  return { active: active.map((c) => c.label), missing, pass: active.length - missing.length >= required };
}

// Retorna true si la resposta té relació amb l'enunciat de l'activitat.
// Ignora el codi inicial (precode) perquè no compti com a coincidència.
function isRelatedToStatement(userText: string, statementParts: Array<string | undefined>, precode?: string, language: string = 'python', statementOnly: string = ''): boolean {
  let cleaned = userText || '';
  if (precode) {
    const pre = new Set(precode.split('\n').map((l) => l.trim()).filter(Boolean));
    cleaned = cleaned.split('\n').filter((l) => !pre.has(l.trim())).join('\n');
  }
  if (!cleaned.trim()) return false;
  // 1) Codi Python: valida per conceptes (print, assignació, bucle...) segons el que demana l'enunciat
  if (language === 'python') {
    const byConcepts = analyzePythonConcepts(cleaned, statementOnly);
    if (byConcepts?.pass) return true;
  }
  // 2) Resposta en llenguatge natural: coincidència de paraules clau amb l'enunciat
  const userWords = extractKeywords(cleaned);
  if (userWords.size === 0) return false;
  const statementWords = Array.from(extractKeywords(statementParts.filter(Boolean).join(' ')));
  // Si no hem pogut llegir cap paraula clau de l'enunciat, NO enviem (mai obrim la porta per defecte)
  if (statementWords.length === 0) return false;
  let matches = 0;
  userWords.forEach((w) => { if (statementWords.some((sw) => sameWord(w, sw))) matches++; });
  const required = Math.min(2, statementWords.length);
  // Cal un mínim de coincidències I que la majoria del que s'ha escrit sigui del tema
  // (així no val barrejar 2 paraules bones amb text sense sentit)
  const ratio = matches / userWords.size;
  return matches >= required && ratio >= 0.5;
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
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
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
  const [testedCode, setTestedCode] = useState<string | null>(null); // codi Python que ha passat Test Python
  const userInput = codeByLang[selectedLanguage];
  const userInputRef = useRef(userInput); userInputRef.current = userInput;
  const codeStorageRef = useRef(codeByLang); codeStorageRef.current = codeByLang;
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

  // Carrega Monaco de manera diferida i registra temes, tipus de React/JSX i el provider de Python
  useEffect(() => {
    let cancelled = false;
    loadMonaco().then((m) => {
      if (cancelled) return;
      registerMonacoThemes(m);
      setupTypescriptDefaults(m);
      registerPythonCompletionProvider(m);
      setMonaco(m);
    });
    return () => { cancelled = true; };
  }, []);

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
    editor.focus();
  };

  // Desa l'estat de vista (cursor/selecció/scroll) del fitxer actiu
  const persistViewState = () => {
    const editor = editorRef.current;
    if (!editor) return;
    viewStateRef.current[selectedLanguageRef.current] = editor.saveViewState();
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
    return field[lang] || field['ca'] || '';
  };

  const currentProblem = course?.content?.flatMap((t: any) => t.subTopics || []).find((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
  // Sincronització editor <-> enunciat: es recalcula cada cop que l'usuari escriu
  const statementShown = [getText(currentProblem?.subtitle), typeof currentProblem?.text === 'string' ? currentProblem.text : getText(currentProblem?.text)].join(' ');
  const isRelated = useMemo(
    () => !!currentProblem && isRelatedToStatement(userInput, collectStatementStrings(currentProblem), currentProblem?.precode, selectedLanguage, statementShown),
    [userInput, currentProblem, selectedLanguage, statementShown]
  );
  const missingHint = (() => {
    if (isRelated || selectedLanguage !== 'python' || !userInput.trim()) return '';
    const a = analyzePythonConcepts(userInput.split('\n').filter((l) => l.trim() !== '').join('\n'), statementShown);
    return a?.missing.length ? ` · falta: ${a.missing.join(', ')}` : '';
  })();
  const showOffTopicHint = userInput.trim().length > 0 && !isRelated;
  // Python: Enviar només es desbloqueja si el codi actual té relació amb l'enunciat I s'ha provat amb "Test Python".
  // Si l'usuari canvia el codi després de provar-lo, es torna a bloquejar.
  const hasBeenTested = selectedLanguage !== 'python' || (testedCode !== null && testedCode === userInput);
  const canSubmit = isRelated && hasBeenTested;
  const showTestHint = selectedLanguage === 'python' && userInput.trim().length > 0 && isRelated && !hasBeenTested;


  // Els problemes de tipus "test" no es resolen amb codi: es respon amb `answers`
  // a ExamPage. Si arribem aqui (URL directa o "seguent" des d'un exercici),
  // redirigim per evitar un POST amb `code` que el backend rebutja amb 400.
  useEffect(() => {
    if (currentProblem?.type === 'test') {
      navigate(`/courses/${courseId}/exam/${lessonId}`, { replace: true });
    }
  }, [currentProblem?.type, courseId, lessonId, navigate]);

  const isCoding = (p: any) => p?.type !== 'test';

  const problemPath = (courseId: string, problem: any): string | null => {
    const slug = problem?.problemSlug || problem?.slug;
    if (!slug) return null;
    return problem.type === 'test'
      ? `/courses/${courseId}/exam/${slug}`
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
  const [unlocked, setUnlocked] = useState(false);
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const [peerSolutions, setPeerSolutions] = useState<any[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [col1Pct, setCol1Pct] = useState(25); // --- Resizable columns (desktop layout) ---
  const containerRef = useRef<HTMLDivElement>(null);
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
      newPct = Math.min(70, Math.max(15, newPct));
      setCol1Pct(newPct);
    };
    const handleMouseUp = () => {dragRef.current = null; document.body.style.cursor = '';document.body.style.userSelect = '';};
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const tabScale = Math.min(1.3, Math.max(0.6, col1Pct / 30));
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
      setTestedCode(null);
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
      setUnlocked(false);
    }
  }, [currentUser, courseId, lessonId, currentProblem]);

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

  const handleSaveProgress = async (isAutoSaveOnPass = false) => {
    if (!currentUser || !courseId || !lessonId) return;
    persistViewState();
    setIsSaving(true);
    try {
      const progressKey = `mooc_global_progress_${currentUser.id}`;
      const globalProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const key = getGlobalProgressKey();
      const wasAlreadyComplete = globalProgress[key] === true;
      localStorage.setItem(codeStorageKey, JSON.stringify(codeStorageRef.current));
      if (isAutoSaveOnPass) {
        globalProgress[key] = true;
        localStorage.setItem(progressKey, JSON.stringify(globalProgress));
        if (!wasAlreadyComplete) {
          setConsoleOutput(p => [...p, '🏆 +10 Punts!']);
        }
      } else if (!globalProgress[key]) {
        globalProgress[key] = 'attempted';
        localStorage.setItem(progressKey, JSON.stringify(globalProgress));
      }
      localStorage.setItem('mooc_last_session', JSON.stringify({courseId, lessonId, courseTitle: getText(course?.title), lessonTitle: getText(currentProblem?.subtitle), timestamp: Date.now()}));
      setIsDirty(false); setWasSavedInSession(true);
      setConsoleOutput(p => [...p, "💾 Sincronitzat!"]);
      await api.postProgress({ studentId: currentUser.id, courseId, lessonId, status: globalProgress[key] || false });
      window.dispatchEvent(new Event('lessonProgressUpdated'));
      document.dispatchEvent(new Event('lessonProgressUpdated'));
      addNotification(t('notifications.progress_saved'), 'success');
    } catch (err) {
      addNotification(t('notifications.progress_error'), 'error');
      setConsoleOutput(p => [...p, "⚠️ Error local"]);
    } 
    finally { setIsSaving(false); }
  };

  const handleRunTests = async () => {
    if (currentProblem?.type === 'test') {
      navigate(`/courses/${courseId}/exam/${lessonId}`, { replace: true });
      return;
    }
    // Validació: la resposta ha de tenir relació amb l'enunciat; si no, no s'envia
    const statementText = collectStatementStrings(currentProblem);
    const related = isRelatedToStatement(userInputRef.current, statementText, currentProblem?.precode, selectedLanguage, statementShown);
    console.debug('[Validació enunciat]', { related, input: userInputRef.current, statementShown, concepts: analyzePythonConcepts(userInputRef.current, statementShown) });
    if (related && selectedLanguage === 'python' && testedCode !== userInputRef.current) {
      const msg = t('lesson.test_first_error', "Primer executa el codi amb «Test Python»: Enviar es desbloqueja quan el resultat és coherent amb l'activitat.");
      setConsoleOutput([`⚠️ ${msg}`]);
      addNotification(msg, 'error');
      return;
    }
    if (!related) {
      const offTopicMsg = t('lesson.off_topic_error', "El que has escrit no té relació amb l'enunciat de l'activitat. Revisa'l i torna-ho a provar.");
      setConsoleOutput([`⚠️ ${offTopicMsg}${missingHint}`]);
      setStatus('fail');
      addNotification(offTopicMsg, 'error');
      return;
    }
    setConsoleOutput(["[SISTEMA]: Executant..."]);
    setStatus('idle');
    try {const topic = course?.content?.find((t: any) => t.subTopics?.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId)); if (!topic) throw new Error('Topic not found'); setConsoleOutput(p => [...p, "📤 Enviat al servidor..."]);
      const result = await courseService.submitChallenge(courseId!,topic.id,lessonId!,{code: userInputRef.current, language: selectedLanguage });
      setConsoleOutput(p => [...p, "✅ Resposta enviada al servidor"]);
      const passed = !isRejectedResult(result);
      console.debug('[Enviar] resposta del servidor', result, { passed });
      const msg = result?.feedback || (passed ? "✅ COMPLETAT!" : null);
      if (msg) setConsoleOutput(p => [...p, msg]);
      setUnlocked(true);
      // Només es marca com a completada (i suma punts) si el servidor l'ha donat per correcta
      await handleSaveProgress(passed);
      if (passed) {setStatus('pass'); confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
        // Sincronitza els punts amb el backend: actualitza header i leaderboard

      } else {  setStatus('fail');}

      // Sincronitza els punts amb el backend (header, leaderboard i activitat llegeixen el mateix valor).
      // Sempre es refresca després d'enviar; amb reintents només si l'activitat s'ha superat.
      void refreshCoursePoints(course?.slug || courseId!, passed ? 4 : 0).then(() => {
        const st = getCurrentStudent();
        if (st) setConsoleOutput(p => [...p, `🏆 Punts totals: ${getTotalPoints(st.id)}`]);
      });

      if (currentUser) {
        const submissions = JSON.parse(localStorage.getItem(`mooc_submissions_${courseId}_${lessonId}`) || '[]');
        const existingIdx = submissions.findIndex((s: any) => s.studentId === currentUser.id);
        const entry = { studentId: currentUser.id, studentName: currentUser.name, code: userInputRef.current, passed, timestamp: Date.now() };
        if (existingIdx >= 0) submissions[existingIdx] = entry;
        else submissions.push(entry);
        localStorage.setItem(`mooc_submissions_${courseId}_${lessonId}`, JSON.stringify(submissions));
        setSubmissionsRefreshKey(k => k + 1);
      }
    } catch (err: any) {
      const detail = err?.response?.data;
      const message =
        (typeof detail === 'string' ? detail : null) ||
        (Array.isArray(detail) ? detail.map((d: any) => (typeof d === 'string' ? d : Object.values(d).flat().join(' '))).join(' ') : null) ||
        (detail && typeof detail === 'object' ? Object.values(detail).flat().join(' ') : null) ||
        err?.message ||
        t('lesson.submit_error', 'Error en enviar la resposta');
      console.error('Error en enviar la submissió:', err);
      setConsoleOutput(p => [...p, `⚠️ ${message}`]);
      setStatus('fail');
      addNotification(message, 'error');
    }
  };

  const handleResetCode = () => {
    if (!window.confirm("Segur que vols tornar a començar el codi?")) return;
    setCodeByLang({ python: currentProblem?.precode || '', react: '' });
    setConsoleOutput([]);
    setStatus('idle');
    setWasSavedInSession(false);
    setIsDirty(true);
  };

  const handleLocalRun = () => {if (selectedLanguage !== 'python') {setConsoleOutput([`[LOCAL RUN]: Execució local finalitzada.`]); return;}
    // Consola sincronitzada amb editor + enunciat (només Python): si no té relació, no s'executa
    if (!isRelated) {
      const msg = t('lesson.off_topic_error', "El que has escrit no té relació amb l'enunciat de l'activitat. Revisa'l i torna-ho a provar.") + missingHint;
      setConsoleOutput([`⚠️ ${msg}`]);
      setTestedCode(null);
      addNotification(msg, 'error');
      return;
    }
    const source = userInputRef.current .split('\n') .map(l => l.replace(/#.*$/, '').replace(/\s+$/, '')) .filter(l => l.trim().length > 0) .map(l => ({ indent: l.match(/^\s*/)![0].length, text: l.trim() }));
    const variables: Record<string, any> = {};
    const outputs: string[] = [];
    const evalExpr = (expr: string): any => {
      let e = expr;
      e = e.replace(/range\(([^)]*)\)/g, (_, a) => {
        const n = Number(evalExpr(a.trim()));
        return '[' + Array.from({ length: Math.max(0, n) }, (_, k) => k).join(',') + ']';
      });
      Object.keys(variables).forEach(v => {
        e = e.replace(new RegExp(`\\b${v}\\b`, 'g'), JSON.stringify(variables[v]));
      });
      try {
        return Function(`'use strict'; return (${e})`)();
      } catch {
        return expr.replace(/^["']|["']$/g, '');
      }
    };

    const run = (lines: { indent: number; text: string }[], vars: Record<string, any>, outs: string[]) => {
      let idx = 0;
      while (idx < lines.length) {
        const { indent, text } = lines[idx];
        const collectBody = (i: number) => {
          const body: { indent: number; text: string }[] = [];
          let j = i;
          while (j < lines.length && lines[j].indent > indent) body.push(lines[j++]);
          return { body, end: j };
        };

        const forMatch = text.match(/^for\s+([\w.]+)\s+in\s+(.+):$/);
        if (forMatch) {
          const varName = forMatch[1].trim();
          const iterable = evalExpr(forMatch[2].trim());
          const { body, end } = collectBody(idx + 1);
          const items = Array.isArray(iterable) ? iterable : [iterable];
          items.forEach(item => { vars[varName] = item; run(body, vars, outs); });
          idx = end;
          continue;
        }

        const whileMatch = text.match(/^while\s+(.+):$/);
        if (whileMatch) {
          const { body, end } = collectBody(idx + 1);
          let guard = 0;
          while (evalExpr(whileMatch[1].trim()) && guard < 100000) { run(body, vars, outs); guard++; }
          idx = end;
          continue;
        }

        const condMatch = text.match(/^(if|elif)\s+(.+):$/);
        if (condMatch) {
          const { body, end } = collectBody(idx + 1);
          let elseEnd = end;
          if (end < lines.length && /^else:/.test(lines[end].text)) {
            const { body: eb, end: ee } = collectBody(end + 1);
            if (evalExpr(condMatch[2].trim())) run(body, vars, outs); else run(eb, vars, outs);
            elseEnd = ee;
          } else if (evalExpr(condMatch[2].trim())) {
            run(body, vars, outs);
          }
          idx = elseEnd;
          continue;
        }

        const augMatch = text.match(/^([\w.]+)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
        if (augMatch) {
          const cur = vars[augMatch[1]] ?? 0;
          vars[augMatch[1]] = evalExpr(`${cur} ${augMatch[2][0]} (${augMatch[3]})`);
          idx += 1;
          continue;
        }

        if (text.includes('=') && !/^print\b|^return\b/.test(text)) {
          const eqIdx = text.indexOf('=');
          const varName = text.slice(0, eqIdx).trim();
          const varVal = text.slice(eqIdx + 1).trim();
          if (varName && !varName.includes(' ') && !varName.includes('=') && varVal) {
            vars[varName] = evalExpr(varVal);
          }
          idx += 1;
          continue;
        }

        const printMatch = text.match(/^print\s*\((.*)\)$/s);
        if (printMatch) {
          let expr = printMatch[1].trim();
          try {
            const val = Function(`'use strict'; return (${evalExpr(expr)})`)();
            outs.push(String(val));
          } catch {
            outs.push(expr.replace(/^["']|["']$/g, ''));
          }
          idx += 1;
          continue;
        }
        idx += 1;
      }
    };
    try {
      run(source, variables, outputs);
    } catch (err: any) {
      setConsoleOutput([`⚠️ Error d'execució: ${err?.message || err}`]);
      setTestedCode(null);
      return;
    }
    // Si l'enunciat demana imprimir, cal que s'hagi imprès alguna cosa; si no, n'hi ha prou amb que el codi s'executi
    const needsPrint = !!analyzePythonConcepts(userInputRef.current, statementShown)?.active.includes('print()');
    if (outputs.length > 0) {
      setConsoleOutput([...outputs, '', "✅ El resultat té relació amb l'activitat: ja pots enviar."]);
      setTestedCode(userInputRef.current);
    } else if (needsPrint) {
      setConsoleOutput(["⚠️ L'enunciat demana imprimir un resultat, però el codi no imprimeix res (usa print(...)).", "Enviar continua bloquejat."]);
      setTestedCode(null);
    } else {
      setConsoleOutput(["[LOCAL RUN]: Codi executat correctament.", "✅ Codi relacionat amb l'activitat: ja pots enviar."]);
      setTestedCode(userInputRef.current);
    }
  };

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

  useEffect(() => {if (activeTab === 2 && unlocked) {loadPeerSolutions();}}, [activeTab, unlocked, courseId, lessonId]);

  if (loading) return <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}><CircularProgress color="secondary" /></Box>;
  if (!course) return null;
  if (!currentProblem) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999, flexDirection: 'column', gap: 2 }}>
      <CircularProgress color="secondary" />
      <Typography>Cargando lección...</Typography>
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
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{currentProblem?.text || ''}</Typography>
            </Box>
            {status === 'fail' && !backHidden && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button onClick={() => { setShowResultModal(false); setBackHidden(true); }} sx={{ color: 'white', fontSize: 15, minWidth: 0, p: 0.5, '&:hover': { color: '#fff' } }}>{t('lesson.back')}</Button>
              </Box>
            )}
          </Box>
          {/* SOLUCIÓ DEL PROFESSOR (MÒBIL) */}
          {activeTab === 1 && unlocked && monaco && (
            <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#1e1e1e', p: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', mb: 1, color: '#c084fc' }}>
                {t('lesson.teacher_solution_title', 'professor')}
              </Typography>
              {currentProblem?.teacherSolution ? (
                <>
                  <Box sx={{ border: '1px solid #333', borderRadius: 1, overflow: 'hidden', mb: 1.5 }}>
                    <DiffEditor
                      original={currentProblem.teacherSolution}
                      modified={codeByLang.python}
                      originalModelPath={`${LESSON_URI_PREFIX}/${courseId}/${lessonId}/m-teacher.py`}
                      modifiedModelPath={`${LESSON_URI_PREFIX}/${courseId}/${lessonId}/m-student.py`}
                      language="python"
                      theme={getMonacoEditorTheme(mode)}
                      height="240px"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, automaticLayout: true, renderSideBySide: false, scrollBeyondLastLine: false }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', mb: 0.5, color: '#c084fc' }}>
                    {t('lesson.teacher_solution_full', 'Solució completa')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', color: '#ddd' }}>
                    {currentProblem.teacherSolution}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: '#aaa' }}>
                  {t('lesson.no_solution_available', 'Encara no hi ha solució disponible per aquest exercici.')}
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ display: activeTab === 1 && unlocked ? 'none' : 'flex', flexDirection: 'column', flex: 1, bgcolor: '#1e1e1e', overflow: 'hidden' }}>
            <Box sx={{ height: 36, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
              <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 500 }}>{t('lesson.app_file')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditorFileTabs value={selectedLanguage} files={{ python: getFile('python'), react: getFile('react') }} onChange={handleLanguageChange} />
                <EditorDiagnosticsBadge markers={diagnostics} />
                {showTestHint && (<Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>{t('lesson.test_first_hint', 'Prova el codi amb Test Python per poder enviar')}</Typography>)}
                {showOffTopicHint && (<Typography sx={{ fontSize: 10, fontWeight: 800, color: '#f87171' }}>{t('lesson.off_topic_hint', "Sense relació amb l'enunciat") + missingHint}</Typography>)}
                <IconButton size="small" onClick={() => setShowLiveRender(v => !v)} sx={{ p: 0.5 }}>
                  {showLiveRender ? <EyeOff size={14} color="#fff" /> : <Eye size={14} color="#fff" />}
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              {monaco ? (
                <div className="h-full">
                  <Editor
                    height="100%"
                    path={getFile(selectedLanguage).path}
                    language={getFile(selectedLanguage).language}
                    theme={getMonacoEditorTheme(mode)}
                    value={userInput}
                    onMount={handleEditorMount}
                    onValidate={handleValidate}
                      onChange={(value: string | undefined) => { setCodeByLang(prev => ({ ...prev, [selectedLanguage]: value || '' })); setIsDirty(true); setWasSavedInSession(false); if (!value || value.trim().length === 0) setConsoleOutput([]); }}
                    options={getMonacoEditorOptions(false)}
                  />
                </div>
              ) : (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
              )}
            </Box>
          </Box>

          {/* VISUALITZACIÓ EN TEMPS REAL (MÒBIL) */}
          {showLiveRender && !(activeTab === 1 && unlocked) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Box sx={{ height: 30, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>Live Render</Typography>
              </Box>
              <Box sx={{ flex: 1, height: 0, display: 'flex', minHeight: 0 }}>
                {selectedLanguage === 'python' ? (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Python no necessita renderitzar</Typography>
                  </Box>
                ) : (
                  <ReactLivePreview monaco={monaco} code={codeByLang.react} dark={mode !== 'light'} />
                )}
              </Box>
            </Box>
          )}
        </Box>

        <ConsolePanel 
          output={consoleOutput}
          emptyMessage={t('lesson.waiting_execution')}
        />

        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, height: 70, flexShrink: 0, borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.paper', px: 2 }}>
          <IconButton onClick={handlePrevious} disabled={isFirstCoding} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1, p: 1 }}>
            <ChevronLeft size={20}/>
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
            <IconButton onClick={handleResetCode} sx={{ border: '1px solid #444', borderRadius: 1, width: 28, height: 28, '&:hover': { bgcolor: '#333' } }}><RotateCcw size={15} color="red"/></IconButton>
            <Button onClick={handleLocalRun} variant="outlined" sx={{ fontWeight: 700, borderRadius: 1, fontSize: 11, borderColor: '#666', color: 'inherit' }}>Codetest</Button>
            <Button onClick={handleRunTests} disabled={!canSubmit} variant="contained" fullWidth sx={{fontWeight: 900, borderRadius: 1, fontSize: 13 }}>{t('lesson.run')}</Button>
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
            <Tab label={t('lesson.tab_teacher_solution', 'Professor')} icon={!unlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_other_solutions', 'Alumnes')} icon={!unlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_ai_help', 'IA')} icon={<Sparkles size={tabIconSize} />} iconPosition="end" />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.5, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider' }}>
            <BackToCourseButton label={t('lesson.back_to_course', 'Torna al curs')} onClick={handleBackToCourse} fontSize={tabFontSize} />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, pb: isMdUp ? 14 : 10 }}>
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, mb: 3, color: mode === 'light' ? '#000' : 'inherit' }}>{getText(currentProblem?.subtitle)}</Typography>
                <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), mt: 5 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', color: mode === 'light' ? '#000' : 'inherit' }}>{currentProblem?.text || ''}</Typography>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              monaco && unlocked ? (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, color: 'primary.main' }}>
                    {t('lesson.teacher_solution_title', 'Solució del professor')}
                  </Typography>
                  {currentProblem?.teacherSolution ? (
                    <>
                      <Typography sx={{ fontSize: '0.7rem', mb: 1, color: 'text.secondary' }}>
                        {t('lesson.diff_hint', "Compara la teva solució (dreta) amb la del professor (esquerra).")}
                      </Typography>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                        <DiffEditor
                          original={currentProblem.teacherSolution}
                          modified={codeByLang.python}
                          originalModelPath={`${LESSON_URI_PREFIX}/${courseId}/${lessonId}/teacher.py`}
                          modifiedModelPath={`${LESSON_URI_PREFIX}/${courseId}/${lessonId}/student.py`}
                          language="python"
                          theme={getMonacoEditorTheme(mode)}
                          height="320px"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true, renderSideBySide: true, scrollBeyondLastLine: false }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1, color: 'primary.main' }}>
                        {t('lesson.teacher_solution_full', 'Solució completa')}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        {currentProblem.teacherSolution}
                      </Typography>
                    </>
                  ) : (
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                      {t('lesson.no_solution_available', 'Encara no hi ha solució disponible per aquest exercici.')}
                    </Typography>
                  )}
                </Box>
              ) : (<LockedTabMessage text={t('lesson.locked_teacher_solution', "Completa l'exercici correctament per desbloquejar la solució del professor.")} />)
            )}

            {activeTab === 2 && (
              unlocked ? (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, color: 'primary.main' }}>
                    {t('lesson.other_solutions_title', 'Estudiants')}
                  </Typography>
                  {loadingPeers ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>) 
                  : peerSolutions.length === 0 ? (
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {t('lesson.no_other_solutions', 'Encara no hi ha solucions d\'estudiants.')}
                    </Typography>
                  ) : (
                    peerSolutions.map((s: any, i: number) => (
                      <Box key={i} sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: s.passed ? alpha(theme.palette.success.main, 0.06) : alpha(theme.palette.warning.main, 0.06), border: '1px solid', borderColor: s.passed ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.warning.main, 0.3) }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
                          {s.passed ? '✅' : '📝'} {s.user?.name || s.username || s.studentName || s.student_email || 'Estudiant'}
                        </Typography>
                        {(s.code || s.content || s.source_code) && (
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                            {s.code || s.content || s.source_code}
                          </Typography>
                        )}
                      </Box>
                    ))
                  )}
                </Box>
              ) : (<LockedTabMessage text={t('lesson.locked_other_solutions', "Completa l'exercici correctament per veure les solucions d'altres estudiants.")} />)
            )}

            {activeTab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 2, color: 'primary.main' }}>
                  {t('lesson.tab_ai_help', 'IA')}
                </Typography>
                <AiHelpPanel courseId={courseId!} lessonId={lessonId!} />
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

        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}> {/* COLUMNA 2: EDITOR + VISUALITZACIÓ EN DIRECTE*/}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}> {/* SECCIÓ SUPERIOR: SPLIT DE CODI I VISUALITZACIÓ EN DIRECTE */}
           {/* Capçalera: cobreix l'editor i la visualització */}
            <Box sx={{ height: 60, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>{t('lesson.app_file', 'Codi')}</Typography>
                <EditorFileTabs value={selectedLanguage} files={{ python: getFile('python'), react: getFile('react') }} onChange={handleLanguageChange} />
                <EditorDiagnosticsBadge markers={diagnostics} />
                {showTestHint && (<Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>{t('lesson.test_first_hint', 'Prova el codi amb Test Python per poder enviar')}</Typography>)}
                {showOffTopicHint && (<Typography sx={{ fontSize: 10, fontWeight: 800, color: '#f87171' }}>{t('lesson.off_topic_hint', "Sense relació amb l'enunciat") + missingHint}</Typography>)}
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <IconButton onClick={handleResetCode} sx={{ border: '1px solid #444', borderRadius: 1, width: 32, height: 32, '&:hover': { bgcolor: '#333' } }}>
                  <RotateCcw size={16} color="red"/>
                </IconButton>
                <Button onClick={handleLocalRun} variant="outlined" startIcon={<Code2 size={14}/>} sx={{ borderColor: '#666', color: '#fff', height: 32, fontSize: 11, fontWeight: 700, px: 2, borderRadius: 1, '&:hover': { bgcolor: '#222', borderColor: '#888' } }}>
                  Test Python 
                </Button>
                <Button onClick={handleRunTests} disabled={!canSubmit} variant="contained" startIcon={<Play size={12} fill="#000"/>} sx={{ '&.Mui-disabled': { bgcolor: '#333', color: '#777' }, bgcolor: '#fff', color: '#000', height: 32, fontSize: 11, fontWeight: 900, px: 2.5, borderRadius: 1, '&:hover': { bgcolor: '#e0e0e0' } }}>
                  {t('lesson.run', 'Enviar')}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
              {/* L'Editor de Codi */}
              <Box ref={contentRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0, borderRight: '1px solid #8400ff'}}>
                {monaco ? (
                  <motion.div key={fadeKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
                    <Editor
                      height="100%"
                      path={getFile(selectedLanguage).path}
                      language={getFile(selectedLanguage).language}
                      theme={getMonacoEditorTheme(mode)}
                      value={userInput}
                      onMount={handleEditorMount}
                      onValidate={handleValidate}
                      onChange={(value: string | undefined) => { setCodeByLang(prev => ({ ...prev, [selectedLanguage]: value || '' })); setIsDirty(true); setWasSavedInSession(false); if (!value || value.trim().length === 0) setConsoleOutput([]); }}
                      options={getMonacoEditorOptions(true)}
                    />
                  </motion.div>
                ) : (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                )}
              </Box>

              {/* LIVE RENDER */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0 }}>               
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {selectedLanguage === 'python' ? (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#151515' }}>
                    <Typography sx={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Python no necessita renderitzar</Typography>
                  </Box>
                ) : (
                  <ReactLivePreview monaco={monaco} code={codeByLang.react} dark={mode !== 'light'} />
                )}
              </Box>
              </Box>
            </Box>
          </Box>

          {/* CONSOLA */}
          <Box sx={{ height: 180, flexShrink: 0 }}>
            <ConsolePanel 
              output={consoleOutput}
              emptyMessage={t('lesson.waiting_execution', "Esperant l'execució del codi...")}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}