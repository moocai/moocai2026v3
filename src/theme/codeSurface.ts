import { useThemeMode } from '../hooks/useTheme';

/**
 * Colors de la zona de codi (barres de l'editor, botons, consola, blocs de codi) segons el
 * mode de la web. Fosc i fancy són els de sempre; el clar fa servir superfícies clares perquè
 * la pàgina no tingui blocs negres enmig del blanc.
 */
export interface CodeSurface {
  bg: string;
  bar: string;
  border: string;
  separator: string;
  text: string;
  muted: string;
  icon: string;
  hover: string;
  accentText: string;
  chipBg: string;
  chipBorder: string;
  outline: string;
  outlineHover: string;
  primaryBg: string;
  primaryText: string;
  primaryHover: string;
  disabledBg: string;
  disabledText: string;
  error: string;
  warning: string;
  success: string;
  stdout: string;
  info: string;
  echo: string;
  placeholder: string;
  resizeHandle: string;
}

const DARK: CodeSurface = {
  bg: '#1e1e1e',
  bar: '#000',
  border: '#333',
  separator: '#3f3f46',
  text: '#fff',
  muted: '#aaa',
  icon: '#d1d5db',
  hover: '#222',
  accentText: '#c4b5fd',
  chipBg: 'rgba(255,255,255,0.06)',
  chipBorder: '#444',
  outline: '#666',
  outlineHover: '#888',
  primaryBg: '#fff',
  primaryText: '#000',
  primaryHover: '#e0e0e0',
  disabledBg: '#333',
  disabledText: '#777',
  error: '#f87171',
  warning: '#fbbf24',
  success: '#4ade80',
  stdout: '#e5e7eb',
  info: '#9ca3af',
  echo: '#67e8f9',
  placeholder: '#6b7280',
  resizeHandle: '#333',
};

const LIGHT: CodeSurface = {
  bg: '#ffffff',
  bar: '#f5f3ff',
  border: '#e5e7eb',
  separator: '#d1d5db',
  text: '#1f2937',
  muted: '#4b5563',
  icon: '#4b5563',
  hover: '#ede9fe',
  accentText: '#7c3aed',
  chipBg: '#ffffff',
  chipBorder: '#d1d5db',
  outline: '#c4b5fd',
  outlineHover: '#8400ff',
  primaryBg: '#8400ff',
  primaryText: '#fff',
  primaryHover: '#6d00d4',
  disabledBg: '#e5e7eb',
  disabledText: '#9ca3af',
  error: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  stdout: '#1f2937',
  info: '#6b7280',
  echo: '#0e7490',
  placeholder: '#9ca3af',
  resizeHandle: '#e5e7eb',
};

export const getCodeSurface = (mode: 'light' | 'dark' | 'fancy'): CodeSurface => (mode === 'light' ? LIGHT : DARK);

export function useCodeSurface(): CodeSurface {
  const { mode } = useThemeMode();
  return getCodeSurface(mode);
}
