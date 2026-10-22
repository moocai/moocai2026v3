import { useCourse } from './useCourse';

export type CourseRole = 'student' | 'professor' | null;

// The current user's role in a course, as reported by the API (`my_role`).
// A user can be a professor in one course and a student in another, so the
// role is always resolved per course, never stored globally.
export function useCourseRole(courseId: string | undefined) {
  const { data, isLoading } = useCourse(courseId);
  const role: CourseRole = data?.my_role ?? null;
  return { role, isProfessor: role === 'professor', isLoading };
}
