import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCodeSurface } from '../theme/codeSurface';

/**
 * Línia de la consola: un text de l'aplicació (string, amb el prefix "> ") o
 * sortida d'un programa, que es mostra tal qual (stdout, stderr en vermell, o info).
 * `echo` és el que l'alumne ha escrit en respondre un input(), a continuació del text.
 */
export type ConsoleLine = string | { kind: 'stdout' | 'stderr' | 'info'; text: string; echo?: string };

interface ConsolePanelProps {
  output: ConsoleLine[];
  emptyMessage?: string;
  /** El programa espera una resposta d'input(): es mostra un camp al final de l'última línia. */
  inputActive?: boolean;
  onInputSubmit?: (value: string) => void;
  /** Nom accessible del camp d'entrada. */
  inputLabel?: string;
  /** Text d'ajuda dins del camp mentre és buit (p. ex. "escriu i prem Enter"). */
  inputPlaceholder?: string;
}


export function ConsolePanel({ output, emptyMessage, inputActive = false, onInputSubmit, inputLabel, inputPlaceholder }: ConsolePanelProps) {
  const c = useCodeSurface();
  const kindColors = { stdout: c.stdout, stderr: c.error, info: c.info };
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sempre a la vista l'última sortida
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output, inputActive]);

  useEffect(() => {
    if (inputActive) inputRef.current?.focus();
  }, [inputActive]);

  const inputField = inputActive ? (
    <Box
      component="input"
      ref={inputRef}
      type="text"
      autoComplete="off"
      spellCheck={false}
      aria-label={inputLabel}
      placeholder={inputPlaceholder}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        onInputSubmit?.(e.currentTarget.value);
      }}
      sx={{ flex: 1, minWidth: 80, border: 'none', outline: 'none', p: 0, m: 0, bgcolor: 'transparent', color: c.echo, caretColor: c.echo, font: 'inherit', '&::placeholder': { color: c.placeholder, fontStyle: 'italic', opacity: 1 } }}
    />
  ) : null;

  const lastIndex = output.length - 1;

  return (
    <Box sx={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      borderTop: '1px solid',
      borderTopColor: 'divider',
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}>
      <Box sx={{
        height: 30,
        px: 2,
        bgcolor: c.bar,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${c.border}`,
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: c.text, fontWeight: 900 }}>{t('lesson.console', 'Consola').toUpperCase()}</Typography>
        </Box>
      </Box>
      {/* Clicar a la consola posa el cursor al camp d'entrada, com en un terminal */}
      <Box ref={scrollRef} onClick={() => { if (inputActive && !window.getSelection()?.toString()) inputRef.current?.focus(); }} sx={{ p: 2, overflowY: 'auto', flex: 1, cursor: inputActive ? 'text' : 'default' }}>
        {output.length === 0 && !inputActive && (
          <Typography sx={{ fontSize: 14, color: c.placeholder, fontFamily: 'monospace' }}>
            {`// ${emptyMessage ?? t('lesson.waiting_execution', "Esperant l'execució del codi...")}`}
          </Typography>
        )}
        {output.map((line, i) =>
          typeof line === 'string' ? (
            <Typography
              key={i}
              sx={{
                fontSize: 14,
                fontFamily: 'monospace',
                color: line.includes('✅') ? c.success : line.includes('❌') ? c.error : c.muted,
                mb: 0.5
              }}
            >
              {'>'} {line}
            </Typography>
          ) : (
            <Typography
              key={i}
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                fontSize: 14,
                fontFamily: 'monospace',
                lineHeight: 1.45,
                color: kindColors[line.kind],
                fontStyle: line.kind === 'info' ? 'italic' : 'normal',
                mt: line.kind === 'info' ? 0.75 : 0,
              }}
            >
              <Box component="span" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 0 }}>
                {line.text}
                {line.echo !== undefined && <Box component="span" sx={{ color: c.echo }}>{line.echo}</Box>}
                {!line.text && line.echo === undefined && !(i === lastIndex && inputActive) ? ' ' : null}
              </Box>
              {i === lastIndex && inputField}
            </Typography>
          )
        )}
        {inputActive && (output.length === 0 || typeof output[lastIndex] === 'string') && (
          <Typography component="div" sx={{ display: 'flex', fontSize: 14, fontFamily: 'monospace' }}>{inputField}</Typography>
        )}
      </Box>
    </Box>
  );
}
