// Mirror of server-side master grade list. Source of truth lives at
// server/src/utils/grades.ts. The /api/classes/grades endpoint is also
// available for runtime fetching, but for non-blocking UI we ship this
// constant alongside the build.

export const MASTER_GRADES = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export type GradeName = (typeof MASTER_GRADES)[number];

export const SECTION_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
] as const;

export const buildClassDisplayName = (
  name: string,
  section?: string | null,
): string => {
  const trimmed = (section ?? "").trim();
  return trimmed ? `${name} - ${trimmed}` : name;
};
