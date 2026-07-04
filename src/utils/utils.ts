import { SxProps, Theme } from '@mui/material';

type SxInput = SxProps<Theme> | undefined | null | boolean;

export function sx(...inputs: SxInput[]): SxProps<Theme> {
  const filtered = inputs.filter((input): input is SxProps<Theme> => 
    Boolean(input) && typeof input !== 'boolean'
  );

  if (filtered.length === 1) return filtered[0];
  
  return filtered as SxProps<Theme>;
}