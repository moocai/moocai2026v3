import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Box, alpha, useTheme, type SxProps, type Theme } from '@mui/material';
import type { Element } from 'hast';
import { RunnableCodeBlock } from './RunnableCodeBlock';

// L'HTML escrit pel professorat es mostra, però passat per una llista blanca (com fa el
// servidor d'algorien amb nh3): sense <script>, atributs on*, URLs javascript:, <iframe>,
// <form>, <style>, estils en línia... Sense això, qualsevol autor podria executar
// JavaScript a la sessió dels alumnes (XSS) i, p. ex., llegir-ne el token de sessió.
// `class` es manté restringit (només `language-*` als blocs de codi): aquí Tailwind és
// actiu i una classe com `fixed inset-0` permetria tapar la pàgina amb contingut fals.
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  // <script> i <style> es treuen amb el contingut (no només l'etiqueta)
  strip: [...(defaultSchema.strip || []), 'style'],
  protocols: {
    ...defaultSchema.protocols,
    // data: només pot arribar a <img src> (l'únic element permès amb src): una imatge no executa codi
    src: [...(defaultSchema.protocols?.src || []), 'data'],
  },
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), 'title'],
  },
};

// react-markdown també filtra les URL: es manté el seu filtre, però s'hi afegeixen les
// imatges incrustades (data:image/...) a <img src>, que el servidor també accepta.
const urlTransform = (url: string, key: string, node: { tagName?: string }) =>
  key === 'src' && node.tagName === 'img' && /^data:image\//i.test(url.trim()) ? url : defaultUrlTransform(url);

/** Codi d'un bloc ```python (el text del seu <code>), o `null` si el bloc és d'un altre llenguatge. */
function pythonBlockCode(pre: Element | undefined): string | null {
  const code = pre?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
  const classes = code?.properties?.className;
  if (!code || !Array.isArray(classes) || !classes.includes('language-python')) return null;
  const text = code.children.map((c) => (c.type === 'text' ? c.value : '')).join('');
  return text.replace(/\n$/, '');
}

// Fora del component: amb un objecte nou a cada render, React tornaria a muntar cada bloc
// executable (i en perdria el codi editat i la sortida)
const COMPONENTS: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};
const RUNNABLE_COMPONENTS: Components = {
  ...COMPONENTS,
  pre: ({ node, ...props }) => {
    const code = pythonBlockCode(node);
    return code !== null ? <RunnableCodeBlock code={code} /> : <pre {...props} />;
  },
};

/**
 * Text en Markdown escrit pel professorat (p. ex. l'enunciat d'un problema), amb
 * GitHub Flavored Markdown (taules, llistes de tasques...) i HTML sanejat.
 */
export function MarkdownContent({ children, fontSize = '0.95rem', sx, runnablePython = false }: {
  children: string; fontSize?: string; sx?: SxProps<Theme>;
  /** Els blocs ```python es poden editar i executar (teoria), amb la sortida a sota */
  runnablePython?: boolean;
}) {
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
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        urlTransform={urlTransform}
        components={runnablePython ? RUNNABLE_COMPONENTS : COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
}
