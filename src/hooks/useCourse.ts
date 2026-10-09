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
 * Consulta del detall d'un problema (enunciat, codi inicial...). La comparteixen
 * LessonPage (que la llegeix) i la llista de problemes (que l'avança en passar-hi
 * per sobre), de manera que en obrir el problema les dades ja hi són.
 */
export const problemDetailQuery = (courseId: string, topicSlug: string, problemSlug: string) => ({
  queryKey: ['problem', courseId, topicSlug, problemSlug] as const,
  queryFn: () => courseService.getChallenge(resolveSlug(courseId), topicSlug, problemSlug).then(mapProblem),
  staleTime: 5 * 60 * 1000,
});
