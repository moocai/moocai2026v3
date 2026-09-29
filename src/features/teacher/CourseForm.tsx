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
      <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <TextField label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} multiline rows={3} required />
      <TextField label="Duración" value={duracion} onChange={(e) => setDuracion(e.target.value)} required placeholder="8 semanas" />
      <FormControl>
        <InputLabel id="estado-curso-label">Estado</InputLabel>
        <Select labelId="estado-curso-label" label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as CursoEstado)}>
          <MenuItem value="activo">Activo</MenuItem>
          <MenuItem value="inactivo">Inactivo</MenuItem>
          <MenuItem value="borrador">Borrador</MenuItem>
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="contained">{t('teacher.crearCurso')}</Button>
      </Stack>
    </Box>
  );
}