import { useState } from 'react';
import { Box, TextField, Button, Stack, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { Curso, CursoEstado } from '../../types';
import { useTranslation } from 'react-i18next';

interface CourseFormProps {
  onSubmit: (curso: Partial<Curso>) => void;
  onCancel?: () => void;
}

export function CourseForm({ onSubmit, onCancel }: CourseFormProps) {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [duracion, setDuracion] = useState('');
  const [estado, setEstado] = useState<CursoEstado>('borrador');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: String(Date.now()), nombre, descripcion, duracion, estado, fechaInicio: new Date().toISOString(), totalEstudiantes: 0, alumnos: [] });
    setNombre(''); setDescripcion(''); setDuracion(''); setEstado('borrador');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label={t('teacher.cursoNombre')} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <TextField label={t('teacher.cursoDescripcion')} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} multiline rows={3} required />
      <TextField label={t('teacher.cursoDuracion')} value={duracion} onChange={(e) => setDuracion(e.target.value)} required placeholder={t('teacher.cursoDuracionEjemplo')} />
      <FormControl>
        <InputLabel id="estado-curso-label">{t('teacher.estado')}</InputLabel>
        <Select labelId="estado-curso-label" label={t('teacher.estado')} value={estado} onChange={(e) => setEstado(e.target.value as CursoEstado)}>
          <MenuItem value="activo">{t('teacher.estadoActivo')}</MenuItem>
          <MenuItem value="inactivo">{t('teacher.estadoInactivo')}</MenuItem>
          <MenuItem value="borrador">{t('teacher.estadoBorrador')}</MenuItem>
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        {onCancel && <Button onClick={onCancel}>{t('teacher.cancelar')}</Button>}
        <Button type="submit" variant="contained">{t('teacher.crearCurso')}</Button>
      </Stack>
    </Box>
  );
}