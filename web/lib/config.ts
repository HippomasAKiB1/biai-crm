export { STAGES, STAGE_COLORS } from "@config/stages";
export type { Stage } from "@config/stages";

export interface NavItem {
  href: string;
  label: string;
  icon: "inbox" | "pipeline" | "queues" | "insights";
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/pipeline", label: "Pipeline", icon: "pipeline" },
  { href: "/queues", label: "Queues", icon: "queues" },
  { href: "/insights", label: "Insights", icon: "insights" },
] as const;
