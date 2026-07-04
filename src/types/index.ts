export interface Course {
  id: string;
  slug?: string;
  title: string;
  description: string;
  image: string;
  level: string;
  duration: string;
  instructor: string;
  icon?: string;
  logoSize?: number;
  logoWidth?: number;
  logoHeight?: number;
  content?: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  challenge?: string;
  initialCode?: string;
  solution?: string;
  duration?: string;
}

export interface CourseProgress {
  courseName: string;
  progress: number;
  lastLesson: string;
}

export interface StudentActivity {
  id: string;
  studentName: string;
  action: string;
  timestamp: string;
}

export interface Student {
  id: string | number;
  name: string;
  email: string;
  code?: string;
  courses_progress?: Record<string, number>;
  progress?: number;
  lastActivity?: string;
}

export interface DataStructure {
  courses: Course[];
  students: Student[];
}

// Teacher types
export type Estado = 'activo' | 'inactivo' | 'completado' | 'bloqueado';
export type Role = 'teacher' | 'student';
export type Nivel = 'básico' | 'intermedio' | 'avanzado';
export type CursoEstado = 'activo' | 'inactivo' | 'borrador';
export type EquipoEstado = 'inscrito' | 'en_progreso' | 'entregado';

export interface Estudiante {
  id: string;
  nombre: string;
  email: string;
  avatar: string;
  estado: Estado;
  progreso: number;
  fechaInscripcion: string;
  ultimoAcceso: string;
  ejerciciosCompletados: number;
  ejerciciosTotales: number;
  notaPromedio: number;
  cursoId: string;
}

export interface FiltrosEstudiante {
  buscar: string;
  estado: Estado | 'todos';
  orden: 'nombre' | 'progreso' | 'ultimoAcceso' | 'nota';
}

export interface Curso {
  id: string;
  nombre: string;
  descripcion: string;
  duracion: string;
  estado: CursoEstado;
  fechaInicio: string;
  totalEstudiantes: number;
  alumnos: string[];
}

export interface Ejercicio {
  id: string;
  titulo: Record<string, string>;
  descripcion: Record<string, string>;
  codigoInicio: string;
  solucion: string;
  pista: Record<string, string>;
  nivel: Nivel;
  categoria: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  miembros: string[];
  proyecto: string;
  estado: EquipoEstado;
  nota?: number;
}

export interface Hackathon {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  premio: string;
  equipos: Equipo[];
}

export interface MensajeChat {
  id: string;
  text: string;
  sender: 'teacher' | 'student';
  time: string;
}

export interface ContactoChat {
  id: string;
  nombre: string;
  email: string;
  avatar: string;
  mensajes: MensajeChat[];
  ultimoMensaje: string;
}
