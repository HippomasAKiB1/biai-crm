"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Kanban, MessageSquare, BarChart2, User } from "lucide-react";
import { NAV_ITEMS } from "@/lib/config";
import HealthPing from "./HealthPing";

function NavIcon({ icon }: { icon: string }) {
  if (icon === "inbox") return <Inbox size={16} strokeWidth={1.75} />;
  if (icon === "pipeline") return <Kanban size={16} strokeWidth={1.75} />;
  if (icon === "queues") return <MessageSquare size={16} strokeWidth={1.75} />;
  if (icon === "insights") return <BarChart2 size={16} strokeWidth={1.75} />;
  return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLeadDetail = pathname.startsWith("/leads/");

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-surface border-r border-line z-30">
        <div className="p-4 border-b border-line flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-brand text-surface font-semibold flex items-center justify-center text-xs">
            BI
          </div>
          <div>
            <div className="font-semibold text-ink text-sm leading-tight">
              BIAI CRM
            </div>
            <div className="text-xs text-muted leading-tight">
              Enquiries desk
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-soft text-brand font-semibold"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Lead Detail item */}
          {isLeadDetail && (
            <Link
              href={pathname}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-semibold transition-colors bg-brand-soft text-brand"
            >
              <User size={16} strokeWidth={1.75} />
              <span>Lead detail</span>
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-line text-xs text-muted tabular-nums">
          v0.1.0 (dev)
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-56 flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xs border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="md:hidden w-7 h-7 rounded-[6px] bg-brand text-surface font-semibold text-xs flex items-center justify-center">
              BI
            </span>
            <span className="font-semibold text-ink text-base md:text-sm">
              BIAI CRM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <HealthPing />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line flex items-center justify-around h-14 md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors ${
                isActive
                  ? "text-brand font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <NavIcon icon={item.icon} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
