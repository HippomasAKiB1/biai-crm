"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, RotateCcw } from "lucide-react";
import { getEnquiries, unspamEnquiry } from "@/lib/api";
import type { EnquiryResponse } from "@/lib/types";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
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
      <h1 className="text-[22px] leading-snug font-semibold text-ink">
        {title}
      </h1>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
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
        return "bg-urgent-soft text-urgent border-urgent/30 font-medium";
      case "high":
        return "bg-warn-soft text-warn border-warn/30 font-medium";
      case "low":
        return "bg-canvas text-muted border-line";
      case "none":
        return "bg-canvas text-muted border-line";
      default:
        return "bg-canvas text-ink border-line";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queues"
        subtitle="Non-sales enquiries: routed here so nothing gets lost."
      />

      {banner && (
        <div className="p-3 rounded-[6px] bg-brand-soft border border-brand/20 text-brand text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={14} strokeWidth={1.75} />
            <span>{banner}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs underline font-medium hover:text-brand/80"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-[6px] bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadQueues()}
            className="text-xs underline font-medium ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Two side-by-side panels on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Panel: Support Queue */}
        <div className="bg-surface rounded-[8px] border border-line p-5 space-y-4">
          <div className="border-b border-line pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span>Support queue</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-canvas border border-line text-muted tabular-nums">
                  {supportLeads.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-muted mt-1">
              Payment issues, refunds, angry customers. Human review required.
            </p>
          </div>

          <div className="space-y-3">
            {loading && supportLeads.length === 0 ? (
              /* Loading Skeletons */
              <div className="space-y-3">
                <div className="bg-canvas rounded-[6px] border border-line p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-line rounded-[4px] w-1/3" />
                  <div className="h-3 bg-line rounded-[4px] w-1/2" />
                  <div className="h-8 bg-line rounded-[4px]" />
                </div>
                <div className="bg-canvas rounded-[6px] border border-line p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-line rounded-[4px] w-1/3" />
                  <div className="h-3 bg-line rounded-[4px] w-1/2" />
                  <div className="h-8 bg-line rounded-[4px]" />
                </div>
              </div>
            ) : supportLeads.length === 0 ? (
              <div className="py-12 border border-dashed border-line rounded-[6px] text-center text-xs text-muted bg-surface">
                No support issues
              </div>
            ) : (
              supportLeads.map((item) => {
                const displayName =
                  item.contact_name?.trim() || "Unknown customer";
                return (
                  <div
                    key={item.id}
                    onClick={() => item.id && router.push(`/leads/${item.id}`)}
                    className="bg-canvas rounded-[6px] border border-line p-4 hover:border-ink/40 transition-colors cursor-pointer space-y-2.5 text-left"
                  >
                    {/* Top Row: Name + Urgency + Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className="text-sm font-semibold text-ink truncate"
                        title={displayName}
                      >
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.urgency === "high" && (
                          <span className="bg-urgent-soft text-urgent border border-urgent/30 px-1.5 py-0.5 rounded-[6px] text-xs font-medium">
                            Urgent
                          </span>
                        )}
                        {item.priority && item.priority !== "normal" && (
                          <span
                            className={`px-1.5 py-0.5 rounded-[6px] text-xs capitalize border ${getPriorityStyle(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Second Row: Category + Date + Needs Review Badge */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="px-2 py-0.5 rounded-[6px] text-xs font-medium bg-surface text-ink border border-line capitalize">
                        {(item.category || "").replace(/_/g, " ")}
                      </span>
                      <span className="tabular-nums">{formatDate(item.received_at)}</span>
                      {item.needs_review && (
                        <span className="bg-warn-soft text-warn border border-warn/30 px-1.5 py-0.5 rounded-[6px] text-xs font-medium inline-flex items-center gap-1">
                          <AlertTriangle size={12} strokeWidth={1.75} />
                          <span>Review</span>
                        </span>
                      )}
                    </div>

                    {/* Body: Summary */}
                    {item.summary && (
                      <p className="text-xs text-ink/80 leading-relaxed font-bangla line-clamp-2">
                        {item.summary}
                      </p>
                    )}

                    {/* Footer: Reply Draft Preview */}
                    <div className="pt-2 border-t border-line text-xs">
                      {item.reply_draft ? (
                        <div className="bg-surface p-2.5 rounded-[6px] border border-line">
                          <span className="block text-[11px] font-medium text-muted mb-0.5">
                            Suggested reply
                          </span>
                          <p className="text-xs text-ink font-bangla line-clamp-2 leading-relaxed">
                            {item.reply_draft}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted italic text-xs">
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

        {/* Right Panel: Not-a-lead */}
        <div className="bg-surface rounded-[8px] border border-line p-5 space-y-4">
          <div className="border-b border-line pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span>Not-a-lead</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-canvas border border-line text-muted tabular-nums">
                  {notALeads.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-muted mt-1">
              Spam and job seekers. Never replied to with sales language.
            </p>
          </div>

          <div className="space-y-3">
            {loading && notALeads.length === 0 ? (
              /* Loading Skeletons */
              <div className="space-y-3">
                <div className="bg-canvas rounded-[6px] border border-line p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-line rounded-[4px] w-1/3" />
                  <div className="h-3 bg-line rounded-[4px] w-1/2" />
                  <div className="h-8 bg-line rounded-[4px]" />
                </div>
                <div className="bg-canvas rounded-[6px] border border-line p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-line rounded-[4px] w-1/3" />
                  <div className="h-3 bg-line rounded-[4px] w-1/2" />
                  <div className="h-8 bg-line rounded-[4px]" />
                </div>
              </div>
            ) : notALeads.length === 0 ? (
              <div className="py-12 border border-dashed border-line rounded-[6px] text-center text-xs text-muted bg-surface">
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
                    className="bg-canvas rounded-[6px] border border-line p-4 hover:border-ink/40 transition-colors cursor-pointer space-y-2.5 text-left"
                  >
                    {/* Top Row: Name + Category + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className="text-sm font-semibold text-ink truncate"
                        title={displayName}
                      >
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-[6px] text-xs font-medium border border-line bg-surface text-muted capitalize">
                          {(item.category || "").replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted tabular-nums">
                          {formatDate(item.received_at)}
                        </span>
                      </div>
                    </div>

                    {/* Body: Summary */}
                    {item.summary && (
                      <p className="text-xs text-ink/80 leading-relaxed font-bangla line-clamp-2">
                        {item.summary}
                      </p>
                    )}

                    {/* Footer: Undo Spam Button or Career Reply Preview */}
                    <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                      {isSpam ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-muted italic">
                            No reply sent
                          </span>
                          <button
                            type="button"
                            disabled={unspammingId === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) handleUnspam(item.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-surface border border-line hover:border-ink text-ink text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
                          >
                            <RotateCcw size={12} strokeWidth={1.75} />
                            <span>{unspammingId === item.id ? "Undoing..." : "Undo spam"}</span>
                          </button>
                        </div>
                      ) : item.reply_draft ? (
                        <div className="bg-surface p-2.5 rounded-[6px] border border-line w-full">
                          <span className="block text-[11px] font-medium text-muted mb-0.5">
                            Automated redirect
                          </span>
                          <p className="text-xs text-ink font-bangla line-clamp-2 leading-relaxed">
                            {item.reply_draft}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted italic text-xs">
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
