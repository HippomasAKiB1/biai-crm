export { STAGES, STAGE_COLORS } from "@config/stages";
export type { Stage } from "@config/stages";

export interface NavItem {
  href: string;
  label: string;
  glyph: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/inbox", label: "Inbox", glyph: "📥" },
  { href: "/pipeline", label: "Pipeline", glyph: "📋" },
  { href: "/queues", label: "Queues", glyph: "💬" },
  { href: "/insights", label: "Insights", glyph: "📊" },
] as const;
