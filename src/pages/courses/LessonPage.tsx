import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Terminal, Play, Trophy, RotateCcw, Lock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Typography, Button, IconButton, Stack, alpha, CircularProgress, useTheme, useMediaQuery, Tabs, Tab } from '@mui/material';
import { api } from '../../services/api';
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
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.warning.main, 0.12) }}>
        <Lock size={20} color={theme.palette.warning.main} />
      </Box>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{text}</Typography>
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
  const [currentUser] = useState<Student | null>(() => {
    const saved = localStorage.getItem('currentStudent');
    return saved ? JSON.parse(saved) : null;
  });
  const [userInput, setUserInput] = useState("");
  const userInputRef = useRef(userInput);
  userInputRef.current = userInput;
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [wasSavedInSession, setWasSavedInSession] = useState(false);
  const [fadeKey] = useState(0);
  const [_showResultModal, setShowResultModal] = useState(false);
  const [backHidden, setBackHidden] = useState(false);
  const consoleWindowRef = useRef<Window | null>(null);
  
  const lang = (i18n.language?.split('-')[0]) as 'ca' | 'es' | 'en';
  const getText = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['ca'] || '';
  };

  const currentProblem = course?.content?.flatMap((t: any) => t.subTopics || []).find((s: any) => s.problemSlug === lessonId);

  const handlePrevious = () => {
    if (course) navigate(`/courses/${course.id}`);
  };
  const handleNext = () => {
    if (!course || !currentProblem) return;
    const topics = course.content || [];
    let currentTopicId = '';
    for (const topic of topics) {
      const subs = topic.subTopics || [];
      if (subs.some((s: any) => s.problemSlug === lessonId)) { currentTopicId = topic.id; break; }
    }
    navigate(`/courses/${course.id}${currentTopicId ? `?lessonId=${currentTopicId}` : ''}`);
  };
  const codeStorageKey = currentUser ? `code_${currentUser.id}_${courseId}_${lessonId}` : `temp_code_${lessonId}`;
  const getGlobalProgressKey = () => `${courseId}_${lessonId}`;
  const [activeTab, setActiveTab] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const [peerSolutions, setPeerSolutions] = useState<any[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);

  // --- Resizable columns (desktop 3-column layout) ---
  const [col1Pct, setCol1Pct] = useState(30); // amplada % de la COLUMNA 1 (Enunciat)
  const [editorPct, setEditorPct] = useState(60); // amplada % de l'Editor dins el wrapper COLUMNA 2+3
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: 'col1' | 'editor'; startX: number; startPct: number } | null>(null);

  const handleDragStart = (type: 'col1' | 'editor') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { type, startX: e.clientX, startPct: type === 'col1' ? col1Pct : editorPct };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { type, startX, startPct } = dragRef.current;
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;
      const deltaPct = ((e.clientX - startX) / containerWidth) * 100;
      let newPct = startPct + deltaPct;
      newPct = Math.min(70, Math.max(15, newPct));
      if (type === 'col1') setCol1Pct(newPct);
      else setEditorPct(newPct);
    };
    const handleMouseUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Escala del text de les pestanyes en funció de l'amplada de la COLUMNA 1 (30% = escala 1)
  const tabScale = Math.min(1.3, Math.max(0.6, col1Pct / 30));
  const tabFontSize = Math.round(12 * tabScale * 9.5) / 10; // px
  const tabIconSize = Math.max(8, Math.round(10 * tabScale));

  useEffect(() => {
    if (currentProblem) {
      const savedCode = localStorage.getItem(codeStorageKey);
      setUserInput(savedCode || currentProblem?.precode || '');
      const progressKey = currentUser ? `mooc_global_progress_${currentUser.id}` : 'mooc_global_progress';
      const globalProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const key = getGlobalProgressKey();
      const isPass = !!globalProgress[key];
      if (isPass) setStatus('pass'); else setStatus('idle');
      setConsoleOutput([]); setIsDirty(false); setWasSavedInSession(false); setShowResultModal(false); setBackHidden(false);
      setActiveTab(0);
      setUnlocked(false);
    }
  }, [currentUser, courseId, lessonId]);

  // Força re-render de les pestanyes quan es guarden submissions
  useEffect(() => {
    if (submissionsRefreshKey) {} // no-op, només per forçar re-render
  }, [submissionsRefreshKey]);

  // Auto-save every 10 seconds when user is typing
  useEffect(() => {
    if (!isDirty || !currentUser) return;
    const id = setInterval(() => {
      handleSaveProgress(false);
    }, 10000);
    return () => clearInterval(id);
  }, [isDirty, currentUser, codeStorageKey]);

  // Sync console output to popup window
  useEffect(() => {
    const win = consoleWindowRef.current;
    if (!win || win.closed) return;
    const lines = consoleOutput.length > 0 ? consoleOutput : ["// Esperant execució..."];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Consola - ${courseId}</title><style>body{margin:0;font-family:'Fira Code',Consolas,monospace;background:#000;color:#b5e853;padding:20px;font-size:14px;line-height:1.6;white-space:pre-wrap}::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:4px}</style></head><body>${lines.map(l => l.replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')}</body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }, [consoleOutput, courseId]);

  const handleSaveProgress = async (isAutoSaveOnPass = false) => {
    if (!currentUser || !courseId || !lessonId) return;
    setIsSaving(true);
    try {
      const progressKey = `mooc_global_progress_${currentUser.id}`;
      const globalProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const key = getGlobalProgressKey();
      const wasAlreadyComplete = globalProgress[key] === true;
      localStorage.setItem(codeStorageKey, userInputRef.current);
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
      localStorage.setItem('mooc_last_session', JSON.stringify({
        courseId,
        lessonId,
        courseTitle: getText(course?.title),
        lessonTitle: getText(currentProblem?.subtitle),
        timestamp: Date.now(),
      }));
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
    try {
      const topic = course?.content?.find((t: any) =>
        t.subTopics?.some((s: any) => s.problemSlug === lessonId)
      );
      if (!topic) throw new Error('Topic not found');

      setConsoleOutput(p => [...p, "📤 Enviat al servidor..."]);

      const result = await courseService.submitChallenge(
        courseId!,
        topic.id,
        lessonId!,
        { code: userInput }
      );

      setConsoleOutput(p => [...p, "✅ Resposta enviada al servidor"]);

      const passed = result?.status === 'correct' || result?.passed === true;
      const msg = result?.feedback || (passed ? "✅ COMPLETAT!" : null);
      if (msg) setConsoleOutput(p => [...p, msg]);

      // Desbloqueja les pestanyes en fer "Enviar"
      setUnlocked(true);

      await handleSaveProgress(true);
      if (passed) {
        setStatus('pass');
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      } else {
        setStatus('fail');
      }

      // Desa la submission a localStorage
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

  const handleOpenConsole = () => {
    if (consoleWindowRef.current && !consoleWindowRef.current.closed) {
      consoleWindowRef.current.focus();
      return;
    }
    const newWindow = window.open('', 'console-popup', 'width=800,height=600');
    if (!newWindow) { setConsoleOutput(p => [...p, "⚠️ Permet les finestres emergents per obrir la consola"]); return; }
    consoleWindowRef.current = newWindow;
    const lines = consoleOutput.length > 0 ? consoleOutput : ["// Esperant execució..."];
    newWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Consola - ${courseId}</title><style>body{margin:0;font-family:'Fira Code',Consolas,monospace;background:#000;color:#b5e853;padding:20px;font-size:14px;line-height:1.6;white-space:pre-wrap}::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:4px}</style></head><body>${lines.map(l => l.replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')}</body></html>`);
    newWindow.document.close();
    const checkClosed = () => {
      if (newWindow.closed) {
        if (consoleWindowRef.current === newWindow) consoleWindowRef.current = null;
        return;
      }
      setTimeout(checkClosed, 100);
    };
    checkClosed();
  };

  const handleResetCode = () => {
    if (!window.confirm("Segur que vols tornar a començar el codi?")) return;
    setUserInput(currentProblem?.precode || '');
    setConsoleOutput([]);
    setStatus('idle');
    setWasSavedInSession(false);
    setIsDirty(true);
  };

  const loadPeerSolutions = async () => {
    if (!courseId || !lessonId || !course) return;
    setLoadingPeers(true);
    try {
      const topic = course?.content?.find((t: any) =>
        t.subTopics?.some((s: any) => s.problemSlug === lessonId)
      );
      if (!topic) throw new Error('Topic not found');
      const data = await courseService.getPeerSubmissions(courseId, topic.id, lessonId);
      setPeerSolutions(data);
    } catch {
      setPeerSolutions([]);
    } finally {
      setLoadingPeers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 2 && unlocked) {
      loadPeerSolutions();
    }
  }, [activeTab, unlocked, courseId, lessonId]);

  if (loading) return <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}><CircularProgress color="secondary" /></Box>;
  if (!course || !currentProblem) return null;

  const userProgressKey = currentUser ? `mooc_global_progress_${currentUser.id}` : 'mooc_global_progress';
  const userProgressData = JSON.parse(localStorage.getItem(userProgressKey) || '{}');
  const allProblems = course?.content?.flatMap((topic: any) => topic.subTopics || []) || [];
  const globalProgress = allProblems.reduce((acc: number, sub: any) => acc + (userProgressData[`${courseId}_${sub.problemSlug || sub.slug}`] === true ? 1 : 0), 0);
  const progressPercent = allProblems.length ? (globalProgress / allProblems.length) * 100 : 0;

  // MOBILE LAYOUT - Optimized for xs
 if (isMobile) {
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden' }}>
      {progressPercent > 0 && <Box sx={{ height: 4, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: 'primary.main' }} /></Box>}
      
      {/* Header */}
      <Box sx={{height: 48, borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', px: 1, justifyContent: 'space-between', flexShrink: 0,mt:10}}>
      </Box>

      {/* Tabs mobile */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ minHeight: 0, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', '& .MuiTabs-flexContainer': { justifyContent: 'center', gap: 1 }, '& .MuiTab-root': { minHeight: 20, fontSize: 7.3, fontWeight: 900, minWidth: 0, px: 1, color: mode === 'light' ? '#000' : 'inherit'}, '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' }}}
      >
        <Tab label={t('lesson.tab_statement', 'Enunciat')} />
        <Tab label={t('lesson.tab_teacher_solution', 'Solució Profe')} icon={!unlocked ? <Lock size={8} /> : undefined} iconPosition="end" />
        <Tab label={t('lesson.tab_other_solutions', 'Solucions Alumnes')} icon={!unlocked ? <Lock size={8} /> : undefined} iconPosition="end" />
        <Tab label={t('lesson.tab_ai_help', 'Ajut IA')} icon={<Sparkles size={8} />} iconPosition="end" />
      </Tabs>

      {/* Content - Vertical Stack */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>

        {/* 1r: ENUNCIAT */}
        <Box sx={{ width: '100%', bgcolor: 'background.paper', p: 2, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', flexShrink: 0}}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1,bgcolor: '#1e1e1e',overflow: 'hidden' }}>
          <Box sx={{ height: 36, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{t('lesson.app_file')}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1, position: 'relative' }}>
            <textarea 
              value={userInput} 
              onChange={(e) => { setUserInput(e.target.value); setIsDirty(true); }} 
              style={{ width: '100%', height: '100%', background: 'transparent', color: '#b5e853', fontFamily: "'Fira Code', monospace", border: 'none', resize: 'none', fontSize: '0.85rem', outline: 'none' }} 
            />
          </Box>
        </Box>
      </Box>

        <Box sx={{ height: 230, display: 'flex', flexDirection: 'column', width: '100%', bgcolor: '#000', borderTop: '1px solid', borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', flexShrink: 0 }}>
        <Box sx={{ height: 22, px: 1.5, bgcolor: '#111', display: 'flex', alignItems: 'center' }}>
          <Terminal size={10} style={{ opacity: 0.4, marginRight: 4, color: '#fff' }} />
          <Typography sx={{ fontSize: 8, color: '#888', fontWeight: 600 }}>CONSOLE</Typography>
        </Box>
        <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
          {consoleOutput.length === 0 && <Typography sx={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>{`// ${t('lesson.waiting_execution')}`}</Typography>}
          {consoleOutput.map((line, i) => (
            <Typography key={i} sx={{ fontSize: 9, mb: 0.2, fontFamily: 'monospace', color: line.includes('✅') ? '#4ade80' : line.includes('❌') ? '#f87171' : '#aaa' }}>
              {'>'} {line}
            </Typography>
          ))}
          {status === 'pass' && (
            <Typography sx={{ fontSize: 9, mt: 0.5, fontFamily: 'monospace', color: '#4ade80' }}>
              {'>'} Molt bé! Ja pots passar al següent →
            </Typography>
          )}
        </Box>
      </Box>

        {/* BOTONS ESTIL */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, height: 70, flexShrink: 0, borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.paper', px: 2 }}>
        <IconButton onClick={handlePrevious} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1, p: 1 }}>
          <ChevronLeft size={20}/>
        </IconButton>
        <Stack direction="row" spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
          <IconButton onClick={handleResetCode} sx={{ border: '1px solid #444', borderRadius: 1, width: 28, height: 28, '&:hover': { bgcolor: '#333' } }}><RotateCcw size={15} color="red"/></IconButton>
          <Button onClick={handleRunTests} variant="contained" fullWidth sx={{fontWeight: 900, borderRadius: 1, fontSize: 13 }}>{t('lesson.run')}</Button>
        </Stack>
        <IconButton onClick={handleNext} disabled={status !== 'pass'} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', borderRadius: 1.5, p: 1 }}>
          <ChevronRight size={20}/>
        </IconButton>
      </Box>
    </Box>
  );
}

  // DESKTOP LAYOUT - 3 Columns
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden'}}>
      {/* Progress */}
      {progressPercent > 0 && <Box sx={{ height: 4, flexShrink: 0, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: 'primary.main' }} /></Box>}
      
      {/* Header - reduced height */}
      <Box sx={{ height: 55, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', px: 3, justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'primary.main' }}>{getText(course.title).toUpperCase()}</Typography>
        </Box>
      </Box>

      {/* 3 Columnas Desktop - reduced heights */}
      <Box ref={containerRef} sx={{ flex: 1, display: 'flex', minHeight: 0, mt: 3}}>
        {/* COLUMNA 1: Enunciat amb pestanyes (redimensionable) */}
        <Box sx={{ width: `${col1Pct}%`, flexShrink: 0, borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', position: 'relative'}}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            centered
            sx={{ minHeight: 0, flexShrink: 0, borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', '& .MuiTabs-flexContainer': { justifyContent: 'center' }, '& .MuiTab-root': { minHeight: 20, fontSize: tabFontSize, fontWeight: 900, minWidth: 0, mt: 2, mb: 0.5, px: 1 * tabScale, color: mode === 'light' ? '#000' : 'inherit'}, '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' }}}
          >
            <Tab label={t('lesson.tab_statement', 'Enunciat')} />
            <Tab
              label={t('lesson.tab_teacher_solution', 'Solució Profe')}
              icon={!unlocked ? <Lock size={tabIconSize} /> : undefined}
              iconPosition="end"
            />
            <Tab
              label={t('lesson.tab_other_solutions', 'Solucions Alumnes')}
              icon={!unlocked ? <Lock size={tabIconSize} /> : undefined}
              iconPosition="end"
            />
           <Tab
              label={t('lesson.tab_ai_help', 'Ajut IA')}
              icon={<Sparkles size={tabIconSize} />}
              iconPosition="end"
            />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, pb: isMdUp ? 8 : 6 }}>
            {/* PESTANYA 0: Enunciat */}
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, mb: 3, mt: 3, color: mode === 'light' ? '#000' : 'inherit' }}>{getText(currentProblem?.subtitle)}</Typography>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: '3px solid', borderColor: alpha(theme.palette.primary.main, 0.5), mt: 5 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', mb: 0.5, color: mode === 'light' ? '#000' : 'inherit' }}>{t('lesson.objective')}</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', color: mode === 'light' ? '#000' : 'inherit' }}>{currentProblem?.text || ''}</Typography>
                </Box>
              </Box>
            )}

            {/* PESTANYA 1: Solució Profe (bloquejada fins status === 'pass') */}
            {activeTab === 1 && (
              unlocked ? (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, color: 'primary.main' }}>
                    {t('lesson.teacher_solution_title', 'Solució del professor')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {currentProblem?.teacherSolution || t('lesson.no_solution_available', 'Encara no hi ha solució disponible per aquest exercici.')}
                  </Typography>
                </Box>
              ) : (
                <LockedTabMessage text={t('lesson.locked_teacher_solution', "Completa l'exercici correctament per desbloquejar la solució del professor.")} />
              )
            )}

            {/* PESTANYA 2: Solucions Alumnes (bloquejada fins fer "Enviar") */}
            {activeTab === 2 && (
              unlocked ? (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, color: 'primary.main' }}>
                    {t('lesson.other_solutions_title', 'Solucions estudiants')}
                  </Typography>
                  {loadingPeers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : peerSolutions.length === 0 ? (
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
              ) : (
                <LockedTabMessage text={t('lesson.locked_other_solutions', "Completa l'exercici correctament per veure les solucions d'altres estudiants.")} />
              )
            )}

            {/* PESTANYA 3: Ajut IA */}
            {activeTab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 2, color: 'primary.main' }}>
                  {t('lesson.tab_ai_help', 'Ajut IA')}
                </Typography>
                
                <AiHelpPanel 
                  courseId={courseId!} 
                  lessonId={lessonId!} 
                />
              </Box>
            )}
          </Box>

          {/* Points */}
          <Box sx={{ p: 2, bgcolor: alpha('#8400ff', 0.3), borderTop: '1px solid #8400ff', textAlign: 'center', position: 'absolute', bottom: 0, left: 0, right: 0, transform: isMdUp ? 'translateY(-30px)' : 'none', zIndex: 1 }}>
            <Trophy size={24} color="#8400ff" style={{ display: 'block', margin: '0 auto 4px' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: mode === 'light' ? '#000' : 'white' }}>{t('lesson.points_label')}</Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 900 }}>{globalProgress * 10}</Typography>
          </Box>
        </Box>

        {/* Divisor arrossegable: COLUMNA 1 <-> COLUMNA 2+3 */}
        <Box
          onMouseDown={handleDragStart('col1')}
          sx={{
            width: 6,
            flexShrink: 0,
            cursor: 'col-resize',
            bgcolor: mode === 'light' ? '#00000014' : 'divider',
            '&:hover': { bgcolor: '#8400ff' },
            transition: 'background-color 0.15s',
          }}
        />

        {/* COLUMNA 2: Editor  */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: courseId === 'python-public-test' ? 'column' : 'row', minHeight: 0 }}>
          <Box ref={contentRef} sx={{ [courseId === 'python-public-test' ? 'height' : 'width']: courseId === 'python-public-test' ? '70%' : `${editorPct}%`, flexShrink: courseId === 'python-public-test' ? undefined : 0, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0 }}>
            <Box sx={{ height: 60, px: 2, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>{t('lesson.app_file')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleResetCode} sx={{ border: `1px solid ${mode === 'light' ? 'white' : 'white'}`, borderRadius: 1, width: 28, height: 28, '&:hover': { bgcolor: '#333' } }}><RotateCcw size={15} color="red"/></IconButton>
                <Button onClick={handleOpenConsole} startIcon={<Terminal size={10}/>} sx={{ bgcolor: 'transparent', color: 'white', height: 28, fontSize: 10, fontWeight: 600, px: 1.5, borderRadius: 1, border: `1px solid ${mode === 'light' ? 'white' : 'white'}`, '&:hover': { bgcolor: '#333', color: 'white' } }}>Consola</Button>
                <Button onClick={handleRunTests} startIcon={<Play size={10} fill="#000"/>} sx={{ bgcolor: '#fff', color: '#000', height: 28, fontSize: 10, fontWeight: 700, px: 2, borderRadius: 1 }}>{t('lesson.run')}</Button>
              </Box>
            </Box>
            <motion.div key={fadeKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', position: 'relative' }}>
              <textarea value={userInput} onChange={(e) => { setUserInput(e.target.value); setIsDirty(true); setWasSavedInSession(false); }}
                style={{ flex: 1, background: 'transparent', color: '#b5e853', fontFamily: "'Fira Code', 'Consolas', monospace", padding: '1rem', border: 'none', outline: 'none', resize: 'none', fontSize: '0.9rem', lineHeight: 1.6, minHeight: 0 }} />
            </motion.div>
          </Box>

          {/* Divisor arrossegable: Editor <-> Consola (només en layout de fila) */}
          {courseId !== 'python-public-test' && (
            <Box
              onMouseDown={handleDragStart('editor')}
              sx={{
                width: 6,
                flexShrink: 0,
                cursor: 'col-resize',
                bgcolor: mode === 'light' ? '#00000014' : 'divider',
                '&:hover': { bgcolor: '#8400ff' },
                transition: 'background-color 0.15s',
              }}
            />
          )}

          {/* COLUMNA 3: Console */}
          <Box sx={{ [courseId === 'python-public-test' ? 'height' : 'width']: courseId === 'python-public-test' ? '30%' : `${100 - editorPct}%`, flexShrink: courseId === 'python-public-test' ? undefined : 0, borderLeft: courseId === 'python-public-test' ? 'none' : '1px solid', borderTop: courseId === 'python-public-test' ? '1px solid' : 'none', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0 }}>
          <Box sx={{ height: 40, px: 2, bgcolor: 'black', display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider' }}>
            <Terminal size={14} style={{opacity: 1, marginRight: 6, color: mode === 'light' ? '#fff' : undefined }} />
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'white' }}>{t('lesson.debug_console')}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
            {consoleOutput.length === 0 && <Typography sx={{ fontFamily: 'monospace', fontSize: 15, color: mode === 'light' ? 'white' : 'text.disabled' }}>{`// ${t('lesson.run_code')}`}</Typography>}
            {consoleOutput.map((line, i) => (
              <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: 11, mb: 0.5, color: line.includes('✅') || line.includes('🏆') || line.includes('💾') ? 'success.main' : line.includes('❌') ? 'error.main' : 'text.secondary' }}>{'> '} {line}</Typography>
            ))}
            <AnimatePresence>
              {wasSavedInSession && status === 'pass' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '1rem' }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'success.main', borderRadius: 1.5, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                    <Typography sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>{t('lesson.lesson_completed')}</Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </Box>
      </Box>

      {/* Footer Desktop - reduced */}
      <Box sx={{ height: 56, flexShrink: 0, mt: isMdUp ? -4 : 0, borderTop: '1px solid', borderColor: mode === 'light' ? '#000' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.paper' }}>
        <Button onClick={handlePrevious} variant="outlined" sx={{ minWidth: 120, minHeight: 36, fontSize: '0.85rem' }}><ChevronLeft size={18}/> {t('lesson.previous')}</Button>
        <Button onClick={handleNext} disabled={status !== 'pass'} variant="outlined" sx={{ minWidth: 120, minHeight: 36, fontSize: '0.85rem' }}>{t('lesson.next')} <ChevronRight size={18}/></Button>
      </Box>
    </Box>
  );
}