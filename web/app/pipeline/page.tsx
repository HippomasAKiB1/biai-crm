"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/config";
import type { EnquiryResponse } from "@/lib/types";
import {
  getEnquiries,
  getFollowups,
  getPrecomputedStatus,
  importPrecomputed,
  updateEnquiry,
} from "@/lib/api";
import { LeadCard } from "@/components/LeadCard";

const INTEREST_OPTIONS = [
  "All Interests",
  "Bootcamp",
  "Fellowship",
  "Corporate Training",
  "Unknown",
];

const CHANNEL_OPTIONS = [
  "All Channels",
  "WhatsApp",
  "Facebook Messenger",
  "Website form",
  "Facebook comment",
  "Phone call note",
];

const CATEGORY_OPTIONS = [
  "All Categories",
  "sales_lead",
  "pre_sales_question",
  "support",
  "refund",
  "spam",
  "job_seeker",
  "minor",
  "other",
];

export default function PipelinePage() {
  const [enquiries, setEnquiries] = useState<EnquiryResponse[]>([]);
  const [overdueFollowupsCount, setOverdueFollowupsCount] = useState<number | null>(null);
  const [precomputedStatus, setPrecomputedStatus] = useState<{
    empty: boolean;
    seed_available: boolean;
  } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterInterest, setFilterInterest] = useState("All Interests");
  const [filterChannel, setFilterChannel] = useState("All Channels");
  const [filterCategory, setFilterCategory] = useState("All Categories");

  const [isPending, startTransition] = useTransition();

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, followupsRes, statusRes] = await Promise.all([
        getEnquiries({
          excludeOutside: true,
          interest: filterInterest !== "All Interests" ? filterInterest : undefined,
          channel: filterChannel !== "All Channels" ? filterChannel : undefined,
          category: filterCategory !== "All Categories" ? filterCategory : undefined,
        }),
        getFollowups().catch(() => null),
        getPrecomputedStatus().catch(() => null),
      ]);
      setEnquiries(res.items);
      if (followupsRes) {
        setOverdueFollowupsCount(followupsRes.overdue_count);
      }
      if (statusRes) {
        setPrecomputedStatus(statusRes);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load pipeline leads");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeedLoading(true);
      setSeedError(null);
      await importPrecomputed(true);
      setToast("Loaded 20 enquiries");
      setTimeout(() => setToast(null), 4000);
      await loadEnquiries();
    } catch (err: any) {
      setSeedError("Seed failed — check backend");
    } finally {
      setSeedLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [filterInterest, filterChannel, filterCategory]);

  const handleStatusChange = async (id: number, newStatus: Stage) => {
    const previous = [...enquiries];
    // Optimistic update
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );

    try {
      await updateEnquiry(id, { status: newStatus });
    } catch (err: any) {
      // Revert on error
      setEnquiries(previous);
      alert(`Failed to update status: ${err?.message || "Unknown error"}`);
    }
  };

  const totalLeads = enquiries.length;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Pipeline</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {totalLeads} active leads
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track leads across sales stages. Non-sales categories are excluded.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Interest filter */}
          <select
            value={filterInterest}
            onChange={(e) => setFilterInterest(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {INTEREST_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Channel filter */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadEnquiries()}
            title="Refresh"
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadEnquiries()}
            className="text-xs font-semibold underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overdue Follow-ups Alert Strip */}
      {overdueFollowupsCount !== null && overdueFollowupsCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <span>⚠</span>
            <span>{overdueFollowupsCount} overdue follow-ups</span>
          </div>
          <Link
            href="/insights"
            className="underline hover:text-rose-950 font-bold"
          >
            View Today&apos;s list →
          </Link>
        </div>
      )}

      {/* Empty State Seed Card or Board Columns */}
      {!loading &&
      precomputedStatus?.empty &&
      precomputedStatus?.seed_available &&
      enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
          <div className="text-4xl">🗂</div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Demo database is empty.
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Click below to load the 20 sample enquiries (no API calls —
              instant).
            </p>
          </div>

          {seedError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {seedError}
            </div>
          )}

          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
          >
            {seedLoading ? "Loading..." : "Load 20 sample enquiries"}
          </button>
        </div>
      ) : (
        /* Board Columns (Horizontal scroll container on smaller screens) */
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1440px] items-start">
            {STAGES.map((stage) => {
              const badgeColor =
                STAGE_COLORS[stage] || "bg-slate-100 text-slate-700";
              const stageLeads = enquiries.filter((e) => e.status === stage);
              const overdueCount = stageLeads.filter((e) => e.is_overdue).length;

              return (
                <div
                  key={stage}
                  className="w-[280px] shrink-0 bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 flex flex-col gap-3"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md ${badgeColor}`}
                      >
                        {stage}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>

                    {overdueCount > 0 && (
                      <span
                        className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded"
                        title={`${overdueCount} leads need follow-up`}
                      >
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>

                  {/* Column Cards */}
                  <div className="flex flex-col gap-2.5 min-h-[300px]">
                    {loading && enquiries.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                        Loading...
                      </div>
                    ) : stageLeads.length === 0 ? (
                      <div className="py-12 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                        No leads in {stage}
                      </div>
                    ) : (
                      stageLeads.map((enquiry) => (
                        <LeadCard
                          key={enquiry.id}
                          enquiry={enquiry}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm shadow-lg font-medium flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
