import { useQuery } from '@tanstack/react-query';
import { courseService, mapProblem } from '../services/courseService';
import { localCourseService } from '../services/localCourseService';

interface SubTopic {
  subtitle: any;
  text: any;
  exampleCode: any;
  problemSlug?: string;
  precode?: string;
  solution?: string;
  type?: string;
  score?: number;
  difficulty?: string;
}

interface Lesson {
  id: string;
  title: any;
  description: any;
  subTopics?: SubTopic[];
}

interface Course {
  id: string;
  title: any;
  description: any;
  content: Lesson[];
  disabled?: boolean;
  slug?: string;
  /** El detall del curs el retorna l'API com a `is_public`; les llistes, com `isPublic`. */
  is_public?: boolean;
  isPublic?: boolean;
  /** El curs té problemes de programació / tests (`allows_coding` / `allows_tests` del detall) */
  allows_coding?: boolean;
  allows_tests?: boolean;
}

export function resolveSlug(courseId: string): string {
  if (courseId.startsWith('clone-')) {
    const local = localCourseService.getById(courseId);
    if (local?.originalSlug) return local.originalSlug;
  }
  return courseId;
}

export function useCourse(courseId: string | undefined) {
  return useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getFullCourseDetail(resolveSlug(courseId!)),
    enabled: !!courseId && courseId !== 'undefined',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Un examen vist com un curs d'un sol tema (vegeu `courseService.getExamCourse`): el fa servir
 * LessonPage quan el problema s'obre des d'un examen. Fresc al cap de poc: l'examen es pot tancar.
 */
export function useExamCourse(courseId: string | undefined, examSlug: string | undefined) {
  return useQuery<Course>({
    queryKey: ['exam-course', courseId, examSlug],
    queryFn: () => courseService.getExamCourse(resolveSlug(courseId!), examSlug!),
    enabled: !!courseId && !!examSlug,
    staleTime: 30 * 1000,
    retry: false,
  });
}

/**
 * Consulta del detall d'un problema (enunciat, codi inicial...). La comparteixen
 * LessonPage (que la llegeix) i la llista de problemes (que l'avança en passar-hi
 * per sobre), de manera que en obrir el problema les dades ja hi són.
 */
export const problemDetailQuery = (courseId: string, topicSlug: string, problemSlug: string) => ({
  queryKey: ['problem', courseId, topicSlug, problemSlug] as const,
  queryFn: () => courseService.getChallenge(resolveSlug(courseId), topicSlug, problemSlug).then(mapProblem),
  staleTime: 5 * 60 * 1000,
});
