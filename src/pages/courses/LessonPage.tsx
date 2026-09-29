import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Trophy, RotateCcw, Lock, Sparkles, Code2, Eye, EyeOff } from 'lucide-react';
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
  const handlePrevious = () => {
    if (!course) return;
      const allProblems = course.content?.flatMap((topic: any) => topic.subTopics || []) || [];
      const currentIndex = allProblems.findIndex((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
    if (currentIndex > 0) {
      const prevProblem = allProblems[currentIndex - 1];
      const prevSlug = prevProblem.problemSlug || prevProblem.slug;
    if (prevSlug) {
        navigate(`/courses/${course.id}/${prevSlug}`);
        return;
      }
    }
    navigate(`/courses/${course.id}`);
  };

  const handleNext = () => {
    if (!course || !currentProblem) return;
    const allProblems = course.content?.flatMap((topic: any) => topic.subTopics || []) || [];
    const currentIndex = allProblems.findIndex((s: any) => s.problemSlug === lessonId || s.slug === lessonId);
    if (currentIndex >= 0 && currentIndex < allProblems.length - 1) {
      const nextProblem = allProblems[currentIndex + 1];
      const nextSlug = nextProblem.problemSlug || nextProblem.slug;
      if (nextSlug) {navigate(`/courses/${course.id}/${nextSlug}`); return;}
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
  const tabFontSize = Math.round(12 * tabScale * 9.5) / 10;
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
          const totalDone = Object.values(globalProgress).filter(Boolean).length;
          const totalPts = totalDone * 10;
          setConsoleOutput(p => [...p, `🏆 +10 Punts! (Total: ${totalPts})`]);
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
    setConsoleOutput(["[SISTEMA]: Executant..."]);
    setStatus('idle');
    try {const topic = course?.content?.find((t: any) => t.subTopics?.some((s: any) => s.problemSlug === lessonId || s.slug === lessonId)); if (!topic) throw new Error('Topic not found'); setConsoleOutput(p => [...p, "📤 Enviat al servidor..."]);
      const result = await courseService.submitChallenge(courseId!,topic.id,lessonId!,{code: userInputRef.current, language: selectedLanguage });
      setConsoleOutput(p => [...p, "✅ Resposta enviada al servidor"]);
      const passed = result?.status === 'correct' || result?.passed === true;
      const msg = result?.feedback || (passed ? "✅ COMPLETAT!" : null);
      if (msg) setConsoleOutput(p => [...p, msg]);
      setUnlocked(true);
      await handleSaveProgress(true);
      if (passed) {setStatus('pass'); confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      } else {  setStatus('fail');}

      if (currentUser) {
        const submissions = JSON.parse(localStorage.getItem(`mooc_submissions_${courseId}_${lessonId}`) || '[]');
        const existingIdx = submissions.findIndex((s: any) => s.studentId === currentUser.id);
        const entry = { studentId: currentUser.id, studentName: currentUser.name, code: userInputRef.current, passed, timestamp: Date.now() };
        if (existingIdx >= 0) submissions[existingIdx] = entry;
        else submissions.push(entry);
        localStorage.setItem(`mooc_submissions_${courseId}_${lessonId}`, JSON.stringify(submissions));
        setSubmissionsRefreshKey(k => k + 1);
      }
    } catch (_) {}
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
    run(source, variables, outputs);
    if (outputs.length > 0) {setConsoleOutput(outputs);} 
    else {setConsoleOutput(["[LOCAL RUN]: Codi executat correctament.", "*(Nota: No s'han detectat sentències print() evaluables)*"]);}
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

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden' }}>
        {progressPercent > 0 && <Box sx={{ height: 4, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: 'primary.main' }} /></Box>}
        <Box sx={{height: 48, borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', px: 1, justifyContent: 'space-between', flexShrink: 0, mt: 5}}></Box>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ minHeight: 0, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', '& .MuiTabs-scroller': { display: 'flex', justifyContent: 'center' }, '& .MuiTabs-flexContainer': { justifyContent: 'center', gap: 1 }, '& .MuiTab-root': { minHeight: 20, fontSize: 7.3, fontWeight: 900, minWidth: 0, px: 1, color: mode === 'light' ? '#000' : 'inherit'}, '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' }}}>
          <Tab label={t('lesson.tab_statement', 'Enunciat')} />
          <Tab label={t('lesson.tab_teacher_solution', 'Solució Profe')} icon={!unlocked ? <Lock size={8} /> : undefined} iconPosition="end" />
          <Tab label={t('lesson.tab_other_solutions', 'Solucions Alumnes')} icon={!unlocked ? <Lock size={8} /> : undefined} iconPosition="end" />
          <Tab label={t('lesson.tab_ai_help', 'Ajut IA')} icon={<Sparkles size={8} />} iconPosition="end" />
        </Tabs>
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
                {t('lesson.teacher_solution_title', 'Solució del professor')}
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
          <IconButton onClick={handlePrevious} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1, p: 1 }}>
            <ChevronLeft size={20}/>
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
            <IconButton onClick={handleResetCode} sx={{ border: '1px solid #444', borderRadius: 1, width: 28, height: 28, '&:hover': { bgcolor: '#333' } }}><RotateCcw size={15} color="red"/></IconButton>
            <Button onClick={handleLocalRun} variant="outlined" sx={{ fontWeight: 700, borderRadius: 1, fontSize: 11, borderColor: '#666', color: 'inherit' }}>Codetest</Button>
            <Button onClick={handleRunTests} variant="contained" fullWidth sx={{fontWeight: 900, borderRadius: 1, fontSize: 13 }}>{t('lesson.run')}</Button>
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
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} centered sx={{ minHeight: 0, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', '& .MuiTabs-flexContainer': { justifyContent: 'center' }, '& .MuiTab-root': { minHeight: 20, fontSize: tabFontSize, fontWeight: 900, minWidth: 0, mt: 2, mb: 0.5, px: 1 * tabScale, color: mode === 'light' ? '#000' : 'inherit'}, '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' }}}>
            <Tab label={t('lesson.tab_statement', 'Enunciat')} />
            <Tab label={t('lesson.tab_teacher_solution', 'Solució Profe')} icon={!unlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_other_solutions', 'Solucions Alumnes')} icon={!unlocked ? <Lock size={tabIconSize} /> : undefined} iconPosition="end" />
            <Tab label={t('lesson.tab_ai_help', 'Ajut IA')} icon={<Sparkles size={tabIconSize} />} iconPosition="end" />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, pb: isMdUp ? 14 : 10 }}>
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, mb: 3, mt: 3, color: mode === 'light' ? '#000' : 'inherit' }}>{getText(currentProblem?.subtitle)}</Typography>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: '3px solid', borderColor: alpha(theme.palette.primary.main, 0.5), mt: 5 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', mb: 0.5, color: mode === 'light' ? '#000' : 'inherit' }}>{t('lesson.objective')}</Typography>
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
                    {t('lesson.other_solutions_title', 'Solucions estudiants')}
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
                  {t('lesson.tab_ai_help', 'Ajut IA')}
                </Typography>
                <AiHelpPanel courseId={courseId!} lessonId={lessonId!} />
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2, bgcolor: alpha('#8400ff', 0.3), borderTop: '1px solid #8400ff', textAlign: 'center', position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 1 }}>
            <Trophy size={20} color="#8400ff" style={{ display: 'block', margin: '0 auto 2px' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: mode === 'light' ? '#000' : 'white' }}>{t('lesson.points_label')}</Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 900 }}>{globalProgress * 10}</Typography>
          </Box>

          {/* Botons de navegació inferior esquerra */}
          <Box sx={{ height: 60, px: 4, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
            <Button onClick={handlePrevious} variant="outlined" size="small" startIcon={<ChevronLeft size={16} />} sx={{ fontWeight: 700, fontSize: 13, borderColor: mode === 'light' ? '#000' : 'divider', color: 'text.primary' }}>
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
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <IconButton onClick={handleResetCode} sx={{ border: '1px solid #444', borderRadius: 1, width: 32, height: 32, '&:hover': { bgcolor: '#333' } }}>
                  <RotateCcw size={16} color="red"/>
                </IconButton>
                <Button onClick={handleLocalRun} variant="outlined" startIcon={<Code2 size={14}/>} sx={{ borderColor: '#666', color: '#fff', height: 32, fontSize: 11, fontWeight: 700, px: 2, borderRadius: 1, '&:hover': { bgcolor: '#222', borderColor: '#888' } }}>
                  Test Python 
                </Button>
                <Button onClick={handleRunTests} variant="contained" startIcon={<Play size={12} fill="#000"/>} sx={{ bgcolor: '#fff', color: '#000', height: 32, fontSize: 11, fontWeight: 900, px: 2.5, borderRadius: 1, '&:hover': { bgcolor: '#e0e0e0' } }}>
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