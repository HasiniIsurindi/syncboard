export const COLORS = [
  '#F8FAFC', '#94A3B8', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#000000',
];

export const BRUSH_SIZES = [2, 4, 8, 14, 22];

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
