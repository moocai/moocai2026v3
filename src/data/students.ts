export interface Student {
  id: string;
  name: string;
  code: string;
  email: string;
}

export const students: Student[] = [
  { id: "std-01", name: "Marc", code: "1", email: "marc@example.com" },
  { id: "std-02", name: "Jordi", code: "2", email: "jordi@example.com" },
  { id: "std-03", name: "Miquel", code: "3", email: "miquel@example.com" },
];
