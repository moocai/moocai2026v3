import { useQuery } from '@tanstack/react-query';
import { courseService } from '../services/courseService';

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
}

export function useCourse(courseId: string | undefined) {
  return useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getFullCourseDetail(courseId!),
    enabled: !!courseId && courseId !== 'undefined',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function prefetchCourse(queryClient: any, courseId: string) {
  return queryClient.prefetchQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getFullCourseDetail(courseId),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
