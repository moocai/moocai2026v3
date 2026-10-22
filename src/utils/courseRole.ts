// El rol és de cada curs, no de l'usuari: algú pot ser professor d'un curs i alumne d'un altre.
// L'entrada (login) no tria rol; la vista (alumne o professor) depèn del curs on s'és.

/** L'usuari és professor d'aquest curs (`my_role` de l'API). */
export function isCourseProfessor(course: { myRole?: string | null } | null | undefined): boolean {
  return course?.myRole === 'professor';
}

/**
 * Selecciona `slug` com a curs de l'àrea de professorat i en retorna l'adreça.
 * L'àrea de professorat llegeix el curs triat de `teacher_selected_course`.
 */
export function teacherViewPath(slug: string, name?: string): string {
  try {
    localStorage.setItem('teacher_selected_course', slug);
    localStorage.setItem('teacher_selected_course_name', name || slug);
  } catch { /* mode privat */ }
  window.dispatchEvent(new Event('teacher-course-changed'));
  return '/teacher';
}

/** Vista d'alumne d'un curs. */
export function studentViewPath(slug: string): string {
  return `/courses/${encodeURIComponent(slug)}`;
}

/** Adreça per obrir un curs: la vista de professor si n'és professor; si no, la d'alumne. */
export function courseEntryPath(course: { slug?: string; id: string; title?: unknown; myRole?: string | null }): string {
  const slug = course.slug || course.id;
  if (isCourseProfessor(course)) {
    return teacherViewPath(slug, typeof course.title === 'string' ? course.title : undefined);
  }
  return studentViewPath(slug);
}
