// Pipeline stages — the single place to rename or add a stage.
// Rename one entry and the board, dropdowns and colors follow.
export const STAGES = ["New", "Contacted", "Interested", "Paid", "Lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_COLORS: Record<Stage, string> = {
  New: "bg-slate-100 text-slate-700",
  Contacted: "bg-blue-100 text-blue-700",
  Interested: "bg-amber-100 text-amber-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Lost: "bg-rose-100 text-rose-700",
};
