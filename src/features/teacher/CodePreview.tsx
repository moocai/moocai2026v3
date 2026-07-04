import { Box, Typography } from '@mui/material';

export function CodePreview({ code }: { code: string }) {

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: '#2d2d2d', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f57' }} />
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#28c840' }} />
        <Typography variant="caption" sx={{ color: 'grey.500', ml: 2 }}>Preview</Typography>
      </Box>
      <Box sx={{ flex: 1, p: 2, overflow: 'auto', fontFamily: '"Fira Code", "Consolas", monospace', fontSize: 13, color: '#d4d4d4', whiteSpace: 'pre-wrap' }}>
        {code || <Typography sx={{ color: '#666' }}>No code to preview</Typography>}
      </Box>
    </Box>
  );
}