import { useState, useRef, useEffect } from 'react';
import { Box, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Typography, Button, Stack, useTheme, Card, CardContent, Radio, RadioGroup, FormControlLabel, FormControl } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Editor from '@monaco-editor/react';
import { CodePreview } from './CodePreview';
import { ConsolePanel } from '../../components/ConsolePanel';
import { useTranslation } from 'react-i18next';

type EditorLang = 'python' | 'react';

interface Choice {
  label: string;
  correct: boolean;
}

interface ExerciseEditorProps {
  exerciseId?: string;
  initialCode?: string;
  hint?: string;
  solution?: string;
  teacherSolution?: string;
  statement?: string;
  type?: string;
  choices?: Choice[];
  onCodeChange?: (code: string) => void;
}

export function ExerciseEditor({ exerciseId, initialCode = '', hint, solution, teacherSolution, statement, type = 'code', choices = [], onCodeChange }: ExerciseEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Storage key para persistencia
  const storageKey = exerciseId ? `teacher_exercise_${exerciseId}` : null;
  
  // Inicializar código desde localStorage o initialCode
  const getInitialCode = () => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed;
        } catch {
          return saved;
        }
      }
    }
    return { python: initialCode, react: '' };
  };
  
  const initialCodeState = getInitialCode();
  
  const [selectedLanguage, setSelectedLanguage] = useState<EditorLang>('python');
  const [codeByLang, setCodeByLang] = useState<Record<EditorLang, string>>(initialCodeState);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const editorRef = useRef<any>(null);
  const currentCode = codeByLang[selectedLanguage];
  const isTest = type === 'test' || type === 'quiz' || type === 'exam' || type === 'multiple_choice' || choices.length > 0;

  // Guardar en localStorage cuando cambia el código
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(codeByLang));
    }
  }, [codeByLang, storageKey]);

  const handleChange = (v: string | undefined) => {
    const newCode = v || '';
    setCodeByLang(prev => ({ ...prev, [selectedLanguage]: newCode }));
    onCodeChange?.(newCode);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setMonacoInstance(monaco);
  };

  const handleLanguageChange = (_: any, newValue: EditorLang) => {
    setSelectedLanguage(newValue);
  };

  const handleReset = () => {
    if (!window.confirm('¿Seguro que quieres resetear el código?')) return;
    const resetCode = { python: initialCode || '', react: '' };
    setCodeByLang(resetCode);
    setConsoleOutput([]);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(resetCode));
    }
  };

  const runPython = () => {
    setConsoleOutput(["[PYTHON]: Ejecutando código..."]);
    
    const source = codeByLang.python;
    const lines = source.split('\n').map(l => l.replace(/#.*$/, '').replace(/\s+$/, '')).filter(l => l.trim().length > 0);
    const variables: Record<string, any> = {};
    const outputs: string[] = [];
    
    const evalExpr = (expr: string): any => {
      let e = expr.trim();
      
      // Manejar strings
      if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
        return e.slice(1, -1);
      }
      
      // Manejar range()
      e = e.replace(/range\(([^)]*)\)/g, (_, a) => {
        const n = Number(evalExpr(a.trim()));
        return '[' + Array.from({ length: Math.max(0, n) }, (_, k) => k).join(',') + ']';
      });
      
      // Manejar len()
      e = e.replace(/len\(([^)]*)\)/g, (_, a) => {
        const val = evalExpr(a.trim());
        return String(Array.isArray(val) || typeof val === 'string' ? val.length : 0);
      });
      
      // Manejar str(), int(), float()
      e = e.replace(/str\(([^)]*)\)/g, (_, a) => String(evalExpr(a.trim())));
      e = e.replace(/int\(([^)]*)\)/g, (_, a) => String(parseInt(evalExpr(a.trim()))));
      e = e.replace(/float\(([^)]*)\)/g, (_, a) => String(parseFloat(evalExpr(a.trim()))));
      
      // Reemplazar variables
      Object.keys(variables).forEach(v => {
        const regex = new RegExp(`\\b${v}\\b`, 'g');
        e = e.replace(regex, JSON.stringify(variables[v]));
      });
      
      // Manejar operaciones con listas
      if (e.includes('[') && e.includes(']')) {
        try {
          return Function(`'use strict'; return (${e})`)();
        } catch {
          // Continuar con el procesamiento normal
        }
      }
      
      try {
        return Function(`'use strict'; return (${e})`)();
      } catch {
        return e.replace(/^["']|["']$/g, '');
      }
    };

    const run = (codeLines: string[], vars: Record<string, any>, outs: string[]) => {
      let idx = 0;
      while (idx < codeLines.length) {
        const line = codeLines[idx].trim();
        
        if (!line || line.startsWith('#')) {
          idx++;
          continue;
        }

        // Manejar for loops
        const forMatch = line.match(/^for\s+([\w.]+)\s+in\s+(.+):$/);
        if (forMatch) {
          const varName = forMatch[1].trim();
          const iterable = evalExpr(forMatch[2].trim());
          const body: string[] = [];
          let j = idx + 1;
          while (j < codeLines.length && (codeLines[j].startsWith(' ') || codeLines[j].startsWith('\t') || codeLines[j].trim() === '')) {
            if (codeLines[j].trim()) body.push(codeLines[j].trim());
            j++;
          }
          const items = Array.isArray(iterable) ? iterable : typeof iterable === 'string' ? iterable.split('') : [iterable];
          items.forEach(item => {
            vars[varName] = item;
            run(body, vars, outs);
          });
          idx = j;
          continue;
        }

        // Manejar while loops
        const whileMatch = line.match(/^while\s+(.+):$/);
        if (whileMatch) {
          const body: string[] = [];
          let j = idx + 1;
          while (j < codeLines.length && (codeLines[j].startsWith(' ') || codeLines[j].startsWith('\t') || codeLines[j].trim() === '')) {
            if (codeLines[j].trim()) body.push(codeLines[j].trim());
            j++;
          }
          let guard = 0;
          while (evalExpr(whileMatch[1].trim()) && guard < 100000) {
            run(body, vars, outs);
            guard++;
          }
          idx = j;
          continue;
        }

        // Manejar if
        const ifMatch = line.match(/^if\s+(.+):$/);
        if (ifMatch) {
          const body: string[] = [];
          let j = idx + 1;
          while (j < codeLines.length && (codeLines[j].startsWith(' ') || codeLines[j].startsWith('\t') || codeLines[j].trim() === '')) {
            if (codeLines[j].trim()) body.push(codeLines[j].trim());
            j++;
          }
          if (evalExpr(ifMatch[1].trim())) {
            run(body, vars, outs);
          }
          idx = j;
          continue;
        }

        // Manejar print()
        const printMatch = line.match(/^print\s*\((.*)\)$/);
        if (printMatch) {
          let expr = printMatch[1].trim();
          try {
            const val = evalExpr(expr);
            outs.push(String(val));
          } catch (err) {
            outs.push(`Error: ${err}`);
          }
          idx++;
          continue;
        }

        // Manejar asignaciones
        if (line.includes('=') && !line.includes('==') && !line.startsWith('print')) {
          const eqIdx = line.indexOf('=');
          const varName = line.slice(0, eqIdx).trim();
          const varVal = line.slice(eqIdx + 1).trim();
          if (varName && !varName.includes(' ') && !varName.includes('=')) {
            try {
              vars[varName] = evalExpr(varVal);
            } catch (err) {
              outs.push(`Error asignando ${varName}: ${err}`);
            }
          }
          idx++;
          continue;
        }

        idx++;
      }
    };

    run(lines, variables, outputs);
    
    if (outputs.length > 0) {
      setConsoleOutput(["[PYTHON]: Resultado de la ejecución:", ...outputs]);
    } else {
      setConsoleOutput(["[PYTHON]: Código ejecutado correctamente.", "*(No se han detectado sentencias print() con resultado)*"]);
    }
  };

  const handleRun = () => {
    if (selectedLanguage === 'python') {
      runPython();
    } else {
      setConsoleOutput(['[REACT]: Código React ejecutado.']);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header con botones de acción */}
      <Box sx={{ 
        height: 60, 
        px: 2, 
        bgcolor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '1px solid #333',
        flexShrink: 0 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>
            {isTest ? 'Test' : 'Código'}
          </Typography>
          {!isTest && (
            <Tabs
              value={selectedLanguage}
              onChange={handleLanguageChange}
              sx={{
                minHeight: 32,
                '& .MuiTab-root': {
                  minHeight: 32,
                  py: 0,
                  px: 1.5,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'none',
                  color: '#9ca3af',
                  minWidth: 0,
                  '&.Mui-selected': {
                    color: '#fff',
                    bgcolor: '#8400ff',
                    borderRadius: 1,
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              <Tab label="Python" value="python" />
              <Tab label="React" value="react" />
            </Tabs>
          )}
        </Box>
        {!isTest && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button 
              onClick={handleReset} 
              startIcon={<RestartAltIcon />}
              sx={{ 
                border: '1px solid #444', 
                borderRadius: 1, 
                height: 32, 
                fontSize: 11, 
                fontWeight: 700, 
                px: 2, 
                color: '#fff',
                '&:hover': { bgcolor: '#333', borderColor: '#888' } 
              }}
            >
              Reset
            </Button>
            <Button 
              onClick={handleRun} 
              variant="contained"
              startIcon={<PlayArrowIcon />}
              sx={{ 
                bgcolor: '#fff', 
                color: '#000', 
                height: 32, 
                fontSize: 11, 
                fontWeight: 900, 
                px: 2.5, 
                borderRadius: 1, 
                '&:hover': { bgcolor: '#e0e0e0' } 
              }}
            >
              Ejecutar
            </Button>
          </Stack>
        )}
        {isTest && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowAnswers(!showAnswers)}
            sx={{ textTransform: 'none', borderRadius: 2, color: '#fff', borderColor: '#444', '&:hover': { bgcolor: '#333', borderColor: '#888' } }}
            startIcon={showAnswers ? <CheckCircleIcon /> : undefined}
          >
            {showAnswers ? t('teacher.ocultarRespuesta', 'Ocultar respuesta') : t('teacher.mostrarRespuesta', 'Mostrar respuesta')}
          </Button>
        )}
      </Box>

      {/* Contenido: Editor o Test */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isTest ? (
          <Box sx={{ p: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
              <CardContent>
                {statement && (
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2, whiteSpace: 'pre-wrap' }}>
                    {statement}
                  </Typography>
                )}

                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup>
                    {choices.map((choice, idx) => {
                      const isCorrect = choice.correct;
                      return (
                        <FormControlLabel
                          key={idx}
                          value={idx}
                          control={<Radio size="small" disabled />}
                          label={
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ fontWeight: showAnswers && isCorrect ? 700 : 400 }}>
                                {choice.label}
                              </Typography>
                              {showAnswers && isCorrect && (
                                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                              )}
                            </Stack>
                          }
                          sx={{
                            mb: 1,
                            mx: 0,
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.75,
                            bgcolor: showAnswers && isCorrect ? 'success.main' + '15' : 'transparent',
                            border: 1,
                            borderColor: showAnswers && isCorrect ? 'success.main' : 'divider',
                          }}
                        />
                      );
                    })}
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
            {/* Editor */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', borderRight: '1px solid #333', minHeight: 0 }}>
              <Box sx={{ flex: 1 }}>
                <Editor
                  height="100%"
                  language={selectedLanguage === 'python' ? 'python' : 'typescript'}
                  defaultValue={codeByLang.python}
                  value={currentCode}
                  onChange={handleChange}
                  onMount={handleEditorDidMount}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    fontFamily: '"Fira Code", "Consolas", monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: selectedLanguage === 'python' ? 4 : 2,
                    wordWrap: 'on',
                  }}
                />
              </Box>
            </Box>

            {/* Preview */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', minHeight: 0 }}>
              {selectedLanguage === 'react' ? (
                <CodePreview 
                  code={currentCode} 
                  monaco={monacoInstance} 
                  onOutput={setConsoleOutput}
                />
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#151515' }}>
                  <Typography sx={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Python no necessita renderitzar</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Consola (solo para código) */}
      {!isTest && (
        <Box sx={{ height: 180, flexShrink: 0 }}>
          <ConsolePanel 
            output={consoleOutput}
            emptyMessage="Esperando ejecución..."
          />
        </Box>
      )}

      {/* Accordions para pista, solución y enunciado */}
      <Box sx={{ flexShrink: 0 }}>
        {!isTest && statement && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.enunciado')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{statement}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
        {hint && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.pista')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">{hint}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
        {teacherSolution && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.solucionProfesor', 'Solución del profesor')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: isDark ? 'grey.900' : 'grey.100', p: 2, borderRadius: 1 }}>{teacherSolution}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
        {solution && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('teacher.solucion')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: isDark ? 'grey.900' : 'grey.100', p: 2, borderRadius: 1 }}>{solution}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    </Box>
  );
}
