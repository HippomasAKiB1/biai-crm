"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEnquiries, unspamEnquiry } from "@/lib/api";
import type { EnquiryResponse } from "@/lib/types";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function QueuesPage() {
  const router = useRouter();

  const [supportLeads, setSupportLeads] = useState<EnquiryResponse[]>([]);
  const [notALeads, setNotALeads] = useState<EnquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unspammingId, setUnspammingId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadQueues = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supportRes, notALeadRes] = await Promise.all([
        getEnquiries({ categoryIn: "support,refund", limit: 200 }),
        getEnquiries({ categoryIn: "spam,job_seeker", limit: 200 }),
      ]);

      // Support queue sorted: high urgency first, then received_at DESC
      const sortedSupport = [...supportRes.items].sort((a, b) => {
        const aUrgent = a.urgency === "high" ? 0 : 1;
        const bUrgent = b.urgency === "high" ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
      });

      // Not-a-lead queue sorted: received_at DESC
      const sortedNotALead = [...notALeadRes.items].sort(
        (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      );

      setSupportLeads(sortedSupport);
      setNotALeads(sortedNotALead);
    } catch (err: any) {
      setError(err?.message || "Failed to load queues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueues();
  }, []);

  const handleUnspam = async (id: number) => {
    setUnspammingId(id);
    try {
      await unspamEnquiry(id);
      setBanner("Moved to pipeline");
      await loadQueues();
      setTimeout(() => setBanner(null), 4000);
    } catch (err: any) {
      alert(`Failed to unspam: ${err?.message || "Unknown error"}`);
    } finally {
      setUnspammingId(null);
    }
  };

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
    <div className="space-y-6">
      <PageHeader
        title="Queues"
        subtitle="Non-sales enquiries — routed here so nothing gets lost."
      />

      {banner && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{banner}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-[11px] underline font-medium hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <button
            onClick={() => loadQueues()}
            className="text-[11px] underline font-medium ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Two side-by-side panels on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT PANEL — Support Queue */}
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Support Queue</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {supportLeads.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Payment issues, refunds, angry customers. Human review required.
            </p>
          </div>

          <div className="space-y-3">
            {loading && supportLeads.length === 0 ? (
              /* Loading Skeletons */
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-50 rounded" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-50 rounded" />
                </div>
              </div>
            ) : supportLeads.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                No support issues — nice.
              </div>
            ) : (
              supportLeads.map((item) => {
                const displayName =
                  item.contact_name?.trim() || "Unknown Customer";
                return (
                  <div
                    key={item.id}
                    onClick={() => item.id && router.push(`/leads/${item.id}`)}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 hover:shadow transition-all cursor-pointer space-y-2.5 text-left"
                  >
                    {/* Top Row: Name + Urgency + Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className="text-sm font-bold text-slate-900 truncate"
                        title={displayName}
                      >
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.urgency === "high" && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                        {item.priority && item.priority !== "normal" && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${getPriorityStyle(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Second Row: Category + Date + Needs Review Badge */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        {item.category}
                      </span>
                      <span>{formatDate(item.received_at)}</span>
                      {item.needs_review && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded text-[10px] font-bold inline-flex items-center gap-1">
                          ⚠ Review
                        </span>
                      )}
                    </div>

                    {/* Body: Summary */}
                    {item.summary && (
                      <p className="text-xs text-slate-700 leading-relaxed font-bangla line-clamp-2">
                        {item.summary}
                      </p>
                    )}

                    {/* Footer: Reply Draft Preview */}
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      {item.reply_draft ? (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                            Suggested reply
                          </span>
                          <p className="text-xs text-slate-700 font-bangla line-clamp-2 leading-relaxed">
                            {item.reply_draft}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          No reply draft
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Not-a-lead */}
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Not-a-lead</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {notALeads.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Spam and job seekers. Never replied to with sales language.
            </p>
          </div>

          <div className="space-y-3">
            {loading && notALeads.length === 0 ? (
              /* Loading Skeletons */
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-50 rounded" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-50 rounded" />
                </div>
              </div>
            ) : notALeads.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                Queue empty.
              </div>
            ) : (
              notALeads.map((item) => {
                const displayName = item.contact_name?.trim() || "Unknown";
                const isSpam = item.category === "spam";

                return (
                  <div
                    key={item.id}
                    onClick={() => item.id && router.push(`/leads/${item.id}`)}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 hover:shadow transition-all cursor-pointer space-y-2.5 text-left"
                  >
                    {/* Top Row: Name + Category + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className="text-sm font-bold text-slate-900 truncate"
                        title={displayName}
                      >
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                            isSpam
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(item.received_at)}
                        </span>
                      </div>
                    </div>

                    {/* Body: Summary */}
                    {item.summary && (
                      <p className="text-xs text-slate-600 leading-relaxed font-bangla line-clamp-2">
                        {item.summary}
                      </p>
                    )}

                    {/* Footer: Undo Spam Button or Career Reply Preview */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {isSpam ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-slate-400 italic">
                            No reply sent
                          </span>
                          <button
                            type="button"
                            disabled={unspammingId === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) handleUnspam(item.id);
                            }}
                            className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors disabled:opacity-50"
                          >
                            {unspammingId === item.id ? "Undoing..." : "Undo spam"}
                          </button>
                        </div>
                      ) : item.reply_draft ? (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 w-full">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                            Automated redirect
                          </span>
                          <p className="text-xs text-slate-700 font-bangla line-clamp-2 leading-relaxed">
                            {item.reply_draft}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Filtered from sales
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
