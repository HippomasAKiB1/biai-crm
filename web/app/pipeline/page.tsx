"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, ArrowRight, Folder, Check } from "lucide-react";
import { STAGES, type Stage } from "@/lib/config";
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

const STAGE_TOP_BORDER: Record<string, string> = {
  New: "border-t-stage-new",
  Contacted: "border-t-stage-contacted",
  Interested: "border-t-stage-interested",
  Paid: "border-t-stage-paid",
  Lost: "border-t-stage-lost",
};

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
      setSeedError("Seed failed - check backend");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-[22px] leading-snug font-semibold text-ink flex items-center gap-2">
            <span>Pipeline</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-surface text-muted border border-line tabular-nums">
              {totalLeads} active leads
            </span>
          </h1>
          <p className="mt-1 text-xs text-muted">
            Track leads across sales stages. Non-sales categories are excluded.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Interest filter */}
          <select
            value={filterInterest}
            onChange={(e) => setFilterInterest(e.target.value)}
            className="text-xs bg-surface border border-line rounded-[6px] px-2.5 py-1.5 text-ink hover:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
            className="text-xs bg-surface border border-line rounded-[6px] px-2.5 py-1.5 text-ink hover:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
            className="text-xs bg-surface border border-line rounded-[6px] px-2.5 py-1.5 text-ink hover:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
            className="inline-flex items-center gap-1.5 text-xs bg-surface border border-line rounded-[6px] px-2.5 py-1.5 text-ink hover:border-ink focus:outline-none"
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-urgent-soft border border-urgent/30 text-urgent text-xs rounded-[6px] flex items-center justify-between">
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
        <div className="bg-urgent-soft border border-urgent/30 text-urgent px-4 py-2 rounded-[8px] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} strokeWidth={1.75} />
            <span className="tabular-nums">{overdueFollowupsCount} overdue follow-ups</span>
          </div>
          <Link
            href="/insights"
            className="underline hover:text-urgent/80 font-medium inline-flex items-center gap-1"
          >
            <span>View today&apos;s list</span>
            <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </div>
      )}

      {/* Empty State Seed Card or Board Columns */}
      {!loading &&
      precomputedStatus?.empty &&
      precomputedStatus?.seed_available &&
      enquiries.length === 0 ? (
        <div className="bg-surface rounded-[8px] border border-line p-8 text-center max-w-lg mx-auto space-y-4 my-8">
          <Folder size={32} strokeWidth={1.75} className="mx-auto text-muted" />
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Demo database is empty.
            </h2>
            <p className="text-xs text-muted mt-1">
              Click below to load the 20 sample enquiries (no API calls, instant).
            </p>
          </div>

          {seedError && (
            <div className="p-3 bg-urgent-soft border border-urgent/30 text-urgent text-xs rounded-[6px] font-medium">
              {seedError}
            </div>
          )}

          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-[6px] bg-brand hover:bg-brand/90 text-surface font-medium text-xs transition-colors disabled:opacity-50"
          >
            {seedLoading ? "Loading..." : "Load 20 sample enquiries"}
          </button>
        </div>
      ) : (
        /* Board Columns (Horizontal scroll container on smaller screens) */
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1440px] items-start">
            {STAGES.map((stage) => {
              const stageLeads = enquiries.filter((e) => e.status === stage);
              const overdueCount = stageLeads.filter((e) => e.is_overdue).length;
              const topBorder = STAGE_TOP_BORDER[stage] || "border-t-line";

              return (
                <div
                  key={stage}
                  className={`w-[280px] shrink-0 bg-surface rounded-[8px] border border-line border-t-[3px] ${topBorder} p-3 flex flex-col gap-3`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-canvas text-ink border border-line">
                        {stage}
                      </span>
                      <span className="text-xs font-medium text-muted bg-surface border border-line px-2 py-0.5 rounded-[6px] tabular-nums">
                        {stageLeads.length}
                      </span>
                    </div>

                    {overdueCount > 0 && (
                      <span
                        className="text-xs font-medium text-urgent bg-urgent-soft border border-urgent/30 px-1.5 py-0.5 rounded-[6px] tabular-nums"
                        title={`${overdueCount} leads need follow-up`}
                      >
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>

                  {/* Column Cards */}
                  <div className="flex flex-col gap-2.5 min-h-[300px]">
                    {loading && enquiries.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted animate-pulse">
                        Loading...
                      </div>
                    ) : stageLeads.length === 0 ? (
                      <div className="py-12 border border-dashed border-line rounded-[6px] text-center text-xs text-muted">
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
        <div className="fixed bottom-6 right-6 bg-ink text-surface px-4 py-2.5 rounded-[6px] text-xs font-medium flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <Check size={14} strokeWidth={1.75} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
