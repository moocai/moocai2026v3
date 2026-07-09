export interface Student {
  id: string;
  name: string;
  code: string;
  email: string;
  role?: 'student' | 'teacher';
  average?: number;
}

export interface Lesson {
  id: string;
  title: any;
  theoryInstructions?: any;
  challenge?: any;
  type?: string;
  choices?: any[];
  precode?: string;
  difficulty?: any;
  score?: number;
}

export interface Topic {
  id?: string;
  title: any;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug?: string;
  title: any;
  topics?: Topic[];
  content?: Lesson[];
  disabled?: boolean;
}