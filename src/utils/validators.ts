export function validatePin(student: { code?: string }, pin: string): boolean {
  return student.code === pin;
}

export function validateRequiredFields(fields: Record<string, string>): boolean {
  return Object.values(fields).every(field => field.trim().length > 0);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateCodeSolution(userInput: string, expectedSolution: string): boolean {
  const cleanUser = userInput.replace(/\s+/g, '').trim();
  const cleanSol = expectedSolution.replace(/\s+/g, '').trim();
  return cleanUser.includes(cleanSol);
}
