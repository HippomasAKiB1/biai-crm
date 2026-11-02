"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFollowups } from "@/lib/api";
import type { EnquiryResponse } from "@/lib/types";

function formatDue(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Due ${month}, ${time}`;
}

function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();

  const [followups, setFollowups] = useState<EnquiryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueTodayCount, setDueTodayCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFollowups();
      setFollowups(res.items);
      setTotal(res.total);
      setOverdueCount(res.overdue_count);
      setDueTodayCount(res.due_today_count);
    } catch (err: any) {
      setError(err?.message || "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 text-rose-800 border-rose-200 font-semibold";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200 font-medium";
      case "low":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "none":
        return "bg-slate-50 text-slate-400 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        subtitle="Dashboard, Today's follow-ups, weekly summary, eval accuracy."
      />

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="underline font-semibold ml-2 hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Today's follow-ups */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Today&apos;s follow-ups</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {total}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overdue or pending callbacks that require team attention.
            </p>
          </div>

          {/* Summary counters */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              {overdueCount} overdue
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              {dueTodayCount} due today
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
              {total} total
            </span>
          </div>
        </div>

        {/* List / Table of follow-ups */}
        {loading ? (
          <div className="space-y-2 py-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        ) : followups.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
            Nothing overdue. Nice work.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Interest</th>
                  <th className="py-2.5 px-3">Overdue Status</th>
                  <th className="py-2.5 px-3 text-right">Scheduled Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followups.map((item) => {
                  const displayName =
                    item.contact_name?.trim() || "Unknown Lead";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => item.id && router.push(`/leads/${item.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {displayName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${getPriorityStyle(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] uppercase font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {item.interest}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-rose-600">
                          {item.days_since_last_touch}d overdue
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatDue(item.follow_up_due)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Placeholder Cards for Future Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 2: Weekly AI Summary placeholder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
          <div className="text-2xl mb-1">📅</div>
          <h3 className="text-base font-bold text-slate-900">
            Weekly AI Summary
          </h3>
          <p className="text-xs text-slate-500">
            Executive report covering lead velocity, conversion bottlenecks, and weekly wins — coming in T14.
          </p>
        </div>

        {/* Section 3: Eval Accuracy placeholder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
          <div className="text-2xl mb-1">🎯</div>
          <h3 className="text-base font-bold text-slate-900">
            Eval Accuracy
          </h3>
          <p className="text-xs text-slate-500">
            Benchmark AI extraction and classification against verified ground truth labels — coming in T15.
          </p>
        </div>
      </div>
    </div>
  );
}
