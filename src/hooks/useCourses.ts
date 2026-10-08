import { useQuery } from '@tanstack/react-query';
import { Course } from '../types';
import { courseService } from '../services/courseService';

// Les mateixes queryKey que `useCourse` (['course', slug]) i que la portada,
// de manera que la cache de React Query es comparteix entre el prefetch del
// MainLayout, la portada, el dashboard i les pàgines de lliçó: una sola
// petició per curs encara que s'obri des de llocs diferents.
export const ALL_COURSES_KEY = ['courses'] as const;
export const PUBLIC_COURSES_KEY = ['public-courses'] as const;

const LIST_STALE_TIME = 5 * 60 * 1000;
const LIST_GC_TIME = 30 * 60 * 1000;
const DETAIL_STALE_TIME = 30 * 60 * 1000;
const DETAIL_GC_TIME = 60 * 60 * 1000;

export function useAllCourses(enabled = true) {
  return useQuery<Course[]>({
    queryKey: ALL_COURSES_KEY,
    queryFn: () => courseService.getAllCourses(),
    enabled,
    staleTime: LIST_STALE_TIME,
    gcTime: LIST_GC_TIME,
    retry: 1,
  });
}

export function usePublicCourses(enabled = true) {
  return useQuery<Course[]>({
    queryKey: PUBLIC_COURSES_KEY,
    queryFn: () => courseService.getPublicCourses(),
    enabled,
    staleTime: LIST_STALE_TIME,
    gcTime: LIST_GC_TIME,
    retry: 1,
  });
}

/** Detall complet d'un curs. Comparteix queryKey amb `useCourse`. */
export function useCourseDetail(slug: string | undefined) {
  return useQuery<any>({
    queryKey: ['course', slug],
    queryFn: () => courseService.getFullCourseDetail(slug!),
    enabled: !!slug,
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
    retry: 1,
  });
}

export function prefetchAllCourses(queryClient: any) {
  return queryClient.prefetchQuery({
    queryKey: ALL_COURSES_KEY,
    queryFn: () => courseService.getAllCourses(),
    staleTime: LIST_STALE_TIME,
    gcTime: LIST_GC_TIME,
  });
}
