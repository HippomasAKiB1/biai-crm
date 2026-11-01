"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/config";
import HealthPing from "./HealthPing";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLeadDetail = pathname.startsWith("/leads/");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            BI
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm tracking-tight leading-tight">
              BIAI CRM
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Enquiries & Pipeline
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-base select-none">{item.glyph}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Lead Detail item — only appears/activates when viewing a lead */}
          {isLeadDetail && (
            <Link
              href={pathname}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-100 text-slate-950 shadow-xs"
            >
              <span className="text-base select-none">👤</span>
              <span>Lead detail</span>
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200 text-xs text-slate-400">
          v0.1.0 (dev)
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-56 flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xs border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="md:hidden w-7 h-7 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
              BI
            </span>
            <span className="font-semibold text-slate-900 text-base md:text-sm">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around h-14 md:hidden shadow-lg">
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
                  ? "text-emerald-700 font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="text-lg leading-none">{item.glyph}</span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
