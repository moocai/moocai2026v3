import { Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { ChevronRight } from 'lucide-react';

// Noms d'aquesta mida o més curts (com "Exàmens") no s'escurcen mai
const SHORT_LABEL = 10;

export interface Crumb {
  label: string;
  /** Sense `to`: és la pàgina actual (no és un enllaç) */
  to?: string;
}

/**
 * On és el problema (Curs › Tema › Problema, o Curs › Exàmens › Examen › Problema): cada nivell
 * és a un clic, en lloc d'haver de tornar enrere pas a pas.
 */
export function ProblemBreadcrumb({ items, fontSize = 12, onNavigate }: {
  items: Crumb[];
  fontSize?: number;
  /** Abans de sortir del problema (p. ex. desar l'estat de l'editor) */
  onNavigate?: () => void;
}) {
  // Si no hi cap, s'escurcen (amb "…") els noms llargs; els curts es veuen sencers
  // Cada nivell és un <li> (entre separadors, també <li>): el del nivell i és el fill 2i+1
  const shrinkRules = Object.fromEntries(items.map((item, i) => [
    `& .MuiBreadcrumbs-ol > li:nth-of-type(${2 * i + 1})`,
    item.label.length <= SHORT_LABEL ? { flexShrink: 0 } : { minWidth: '3em' },
  ]));
  const crumbSx = { fontSize, fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } as const;
  return (
    <Breadcrumbs
      separator={<ChevronRight size={fontSize + 2} />}
      sx={{ px: 1, minWidth: 0, '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' }, ...shrinkRules }}
    >
      {items.map((item, i) => {
        return item.to ? (
        <Link
          key={i}
          component={RouterLink}
          to={item.to}
          onClick={onNavigate}
          underline="hover"
          title={item.label}
          sx={{ ...crumbSx, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          {item.label}
        </Link>
      ) : (
        <Typography key={i} title={item.label} aria-current="page" sx={{ ...crumbSx, color: 'text.primary' }}>
          {item.label}
        </Typography>
      );
      })}
    </Breadcrumbs>
  );
}
