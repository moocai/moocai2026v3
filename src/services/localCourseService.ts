import type { Curso } from '../types';

const STORAGE_KEY = 'mooc_local_courses';

function getAll(): Curso[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveAll(cursos: Curso[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cursos));
}

export const localCourseService = {
  getAll,

  getById(id: string): Curso | undefined {
    return getAll().find((c) => c.id === id);
  },

  save(curso: Curso) {
    const all = getAll();
    const idx = all.findIndex((c) => c.id === curso.id);
    if (idx >= 0) all[idx] = curso; else all.push(curso);
    saveAll(all);
  },

  remove(id: string) {
    saveAll(getAll().filter((c) => c.id !== id));
  },

  cloneFrom(source: Curso, newName: string, alumnoIds: string[]): Curso {
    const clone: Curso = {
      ...source,
      id: `clone-${source.id}-${Date.now()}`,
      nombre: newName,
      alumnos: alumnoIds,
      totalEstudiantes: alumnoIds.length,
      estado: 'borrador',
      fechaInicio: new Date().toISOString(),
      originalSlug: source.originalSlug || source.id,
    };
    this.save(clone);
    return clone;
  },
};
