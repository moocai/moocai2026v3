import { Stack, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { SearchInput } from '../../components/ui/SearchInput';
import type { Estado, FiltrosEstudiante } from '../../types';
import { useTranslation } from 'react-i18next';

interface StudentFiltersProps {
  filters: FiltrosEstudiante;
  onChange: (filters: FiltrosEstudiante) => void;
}

export function StudentFilters({ filters, onChange }: StudentFiltersProps) {
  const { t } = useTranslation();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
      <SearchInput
        value={filters.buscar}
        onChange={(v) => onChange({ ...filters, buscar: v })}
        placeholder={t('teacher.estudiantes')}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="estado-label">{t('teacher.filtroEstado')}</InputLabel>
        <Select labelId="estado-label" label={t('teacher.filtroEstado')} value={filters.estado} onChange={(e) => onChange({ ...filters, estado: e.target.value as Estado | 'todos' })}>
          <MenuItem value="todos">Todos</MenuItem>
          <MenuItem value="activo">Activo</MenuItem>
          <MenuItem value="inactivo">Inactivo</MenuItem>
          <MenuItem value="completado">Completado</MenuItem>
          <MenuItem value="bloqueado">Bloqueado</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="orden-label">{t('teacher.ordenarPor')}</InputLabel>
        <Select labelId="orden-label" label={t('teacher.ordenarPor')} value={filters.orden} onChange={(e) => onChange({ ...filters, orden: e.target.value as FiltrosEstudiante['orden'] })}>
          <MenuItem value="nombre">{t('teacher.ordenNombre')}</MenuItem>
          <MenuItem value="progreso">{t('teacher.ordenProgreso')}</MenuItem>
          <MenuItem value="ultimoAcceso">{t('teacher.ordenUltimoAcceso')}</MenuItem>
          <MenuItem value="nota">{t('teacher.ordenNota')}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}