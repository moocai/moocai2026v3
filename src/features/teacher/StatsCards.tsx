import { Paper, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

interface StatsCardProps {
  label: string;
  value: number | string;
  color?: string;
}

function StatsCard({ label, value, color }: StatsCardProps) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, color: color || 'primary.main' }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

export function StatsCards({ stats }: { stats: StatsCardProps[] }) {
  return (
    <Grid container spacing={2}>
      {stats.map((stat, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatsCard {...stat} />
        </Grid>
      ))}
    </Grid>
  );
}