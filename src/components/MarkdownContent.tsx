import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, alpha, useTheme, type SxProps, type Theme } from '@mui/material';

/**
 * Text en Markdown escrit pel professorat (p. ex. l'enunciat d'un problema), amb
 * GitHub Flavored Markdown (taules, llistes de tasques...). L'HTML dins del Markdown
 * no s'interpreta: només es mostra el que genera el Markdown.
 */
export function MarkdownContent({ children, fontSize = '0.95rem', sx }: { children: string; fontSize?: string; sx?: SxProps<Theme> }) {
  const theme = useTheme();
  return (
    <Box
      sx={[
        {
          fontSize,
          lineHeight: 1.65,
          color: 'text.primary',
          overflowWrap: 'anywhere',
          '& > :first-of-type': { mt: 0 },
          '& > :last-child': { mb: 0 },
          '& p': { my: 1.25 },
          '& h1, & h2, & h3, & h4, & h5, & h6': { fontWeight: 800, lineHeight: 1.3, mt: 2.5, mb: 1 },
          '& h1': { fontSize: '1.35em' },
          '& h2': { fontSize: '1.2em' },
          '& h3': { fontSize: '1.08em' },
          '& h4, & h5, & h6': { fontSize: '1em' },
          '& ul, & ol': { pl: 3, my: 1.25 },
          '& li': { my: 0.4 },
          '& code': { fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.88em', bgcolor: alpha(theme.palette.primary.main, 0.1), px: 0.6, py: 0.15, borderRadius: 0.75 },
          '& pre': { bgcolor: '#1a1d23', color: '#e5e7eb', p: 1.5, borderRadius: 1.5, overflowX: 'auto', my: 1.5, '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.85em', color: 'inherit' } },
          '& blockquote': { borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5, ml: 0, my: 1.5, color: 'text.secondary' },
          '& table': { borderCollapse: 'collapse', my: 1.5, display: 'block', overflowX: 'auto', maxWidth: '100%' },
          '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1.25, py: 0.6, textAlign: 'left' },
          '& th': { bgcolor: alpha(theme.palette.primary.main, 0.06), fontWeight: 700 },
          '& a': { color: 'primary.main' },
          '& img': { maxWidth: '100%', borderRadius: 1 },
          '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 2 },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
}
