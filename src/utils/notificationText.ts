/**
 * Text pla d'un avís en Markdown, per a les previsualitzacions (desplegable de la campana):
 * sense marques, imatges ni HTML, i amb els enllaços reduïts al seu text.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Data d'un avís a l'idioma de la interfície (`short`: només dia i mes, per al desplegable). */
export function formatNotificationDate(iso: string, language: string, short = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return short
    ? date.toLocaleDateString(language, { day: 'numeric', month: 'short' })
    : date.toLocaleString(language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
