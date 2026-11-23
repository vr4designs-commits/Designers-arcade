export type Category = "ux" | "heur" | "gest" | "bias" | "psy";
// shown on screen as: UX LAW, HEURISTIC, GESTALT, COGNITIVE BIAS, PSYCHOLOGY

export interface Law {
  id: string; // "hicks-law"
  number: number; // shown as LAW 014
  category: Category;
  title: string;
  definition: string; // one line, max ~100 chars
  applyIt: string; // one practical tip, max ~80 chars
  source: string; // "W. E. Hick & R. Hyman, 1952–53"
}
