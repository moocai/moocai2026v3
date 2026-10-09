import { useRef } from 'react';
import { Box } from '@mui/material';

/**
 * Barra per redimensionar dos panells arrossegant-la (ratolí o dit).
 * `onDrag` rep el desplaçament en píxels des que s'ha començat a arrossegar.
 */
export function ResizeHandle({ orientation, onDragStart, onDrag, ariaLabel, color = '#333', activeColor = '#8400ff', thickness = 5 }: {
  orientation: 'vertical' | 'horizontal';
  onDragStart?: () => void;
  onDrag: (delta: number) => void;
  ariaLabel?: string;
  color?: string;
  activeColor?: string;
  thickness?: number;
}) {
  const startRef = useRef<number | null>(null);
  const horizontal = orientation === 'horizontal'; // barra horitzontal: es mou amunt i avall
  const cursor = horizontal ? 'row-resize' : 'col-resize';
  return (
    <Box
      role="separator"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label={ariaLabel}
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startRef.current = horizontal ? e.clientY : e.clientX;
        document.body.style.cursor = cursor;
        document.body.style.userSelect = 'none';
        onDragStart?.();
      }}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        if (startRef.current === null) return;
        onDrag((horizontal ? e.clientY : e.clientX) - startRef.current);
      }}
      onPointerUp={() => { startRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; }}
      onPointerCancel={() => { startRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; }}
      sx={{
        flexShrink: 0,
        [horizontal ? 'height' : 'width']: thickness,
        cursor,
        touchAction: 'none',
        bgcolor: color,
        transition: 'background-color 0.15s',
        '&:hover, &:active': { bgcolor: activeColor },
      }}
    />
  );
}
