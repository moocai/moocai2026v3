import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useThemeMode } from '../../hooks/useTheme';
import { ReactLivePreview } from '../../components/ReactLivePreview';

interface CodePreviewProps {
  code: string;
  monaco?: any;
  onOutput?: (output: string[]) => void;
}

export function CodePreview({ code, monaco, onOutput }: CodePreviewProps) {
  const { mode } = useThemeMode();
  const [executedCode, setExecutedCode] = useState<string>('');
  const [hasRun, setHasRun] = useState(false);

  const wrapCode = (c: string) => {
    const hasApp = /function\s+App\s*\(|const\s+App\s*=|export\s+default\s+function/i.test(c);
    if (hasApp) return c;
    const hasJsx = /<[A-Z][a-zA-Z]*|<\/[A-Z]/.test(c);
    if (hasJsx) return `function App() { return (${c}); }`;
    return c;
  };

  const handleRun = () => {
    const wrappedCode = wrapCode(code);
    setExecutedCode(wrappedCode);
    setHasRun(true);
    
    const output: string[] = [];
    
    try {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        originalLog.apply(console, args);
      };

      const cleanCode = wrappedCode
        .replace(/:\s*\w+(\[\])?(\s*[=;,)\]}])/g, '$2')
        .replace(/interface\s+\w+\s*{[^}]*}/g, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

      const fn = new Function(cleanCode);
      const result = fn();
      
      console.log = originalLog;

      if (logs.length > 0) {
        output.push(...logs);
      } else if (result !== undefined) {
        output.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      } else {
        output.push('✅ Código ejecutado correctamente');
      }
    } catch (err) {
      output.push(`❌ ${err instanceof Error ? err.message : String(err)}`);
    }

    onOutput?.(output);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#1e1e1e', 
      borderRadius: 2, 
      overflow: 'hidden',
      border: '1px solid',
      borderColor: mode === 'light' ? '#000' : 'divider'
    }}>
      <Box sx={{ 
        height: 30,
        px: 2,
        bgcolor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, 
        flexShrink: 0 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>PREVIEW</Typography>
        </Box>
        <Button
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={handleRun}
          sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#34d399', minWidth: 'auto', fontWeight: 700 }}
        >
          Ejecutar
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {monaco && hasRun ? (
          <ReactLivePreview monaco={monaco} code={executedCode} dark={mode !== 'light'} />
        ) : (
          <Box sx={{ p: 2, height: '100%' }}>
            <Typography sx={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>
              {hasRun ? '// No hay código React para mostrar' : '// Pulsa Ejecutar para ver el preview'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
