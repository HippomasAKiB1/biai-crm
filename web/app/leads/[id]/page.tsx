"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  Search,
  Clock,
  Copy,
} from "lucide-react";
import {
  getEnquiryDetail,
  getEnquiries,
  updateEnquiry,
  analyzeReply,
} from "@/lib/api";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/config";
import type {
  EnquiryResponse,
  Contact,
  Activity,
  ExtractedEnquiry,
} from "@/lib/types";
import { ActivityTimeline } from "@/components/ActivityTimeline";

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dateFormatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateFormatted}, ${timeFormatted}`;
}

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relTime(at: string | null | undefined): string {
  if (!at) return "recently";
  const date = new Date(at);
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function toExtractedEnquiry(
  enquiry: EnquiryResponse,
  contactName?: string | null
): ExtractedEnquiry {
  return {
    sender_name: contactName ?? enquiry.contact_name ?? null,
    phone: enquiry.contact_phone ?? null,
    channel_guess: enquiry.channel,
    interest: (enquiry.interest as any) || "Unknown",
    category: (enquiry.category as any) || "other",
    language: (enquiry.language as any) || "banglish",
    company: enquiry.company ?? null,
    headcount: enquiry.headcount ?? null,
    urgency: (enquiry.urgency as any) || "normal",
    suggested_status: (enquiry.status as any) || "New",
    follow_up_hint: null,
    needs_human_review: enquiry.needs_review,
    review_reason: enquiry.review_reason ?? null,
    confidence: enquiry.confidence ?? 0.9,
    summary: enquiry.summary ?? "",
    suggested_reply: enquiry.reply_draft ?? null,
    priority: (enquiry.priority as any) || "normal",
  };
}

export default function LeadDetailPage({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams<{ id?: string }>();
  const idParam = params?.id ?? routeParams?.id;
  const idNum = idParam ? parseInt(idParam, 10) : NaN;

  const [detail, setDetail] = useState<{
    enquiry: EnquiryResponse;
    contact: Contact;
    activities: Activity[];
  } | null>(null);
  const [siblings, setSiblings] = useState<EnquiryResponse[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [notesText, setNotesText] = useState("");

  const [savingReply, setSavingReply] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (isNaN(idNum)) {
      setError("Invalid lead ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getEnquiryDetail(idNum);
      setDetail(res);
      setReplyText(res.enquiry.reply_draft ?? "");

      // Initial notes: pick latest note from activities or enquiry notes if available
      const latestNote = res.activities
        .filter((a) => a.type === "note")
        .slice(-1)[0]?.to_value;
      setNotesText((res.enquiry as any).notes ?? latestNote ?? "");

      // Fetch siblings for the same contact
      try {
        const allRes = await getEnquiries({ limit: 500 });
        const related = allRes.items.filter(
          (item) => item.contact_id === res.contact.id
        );
        setSiblings(related);
      } catch {
        setSiblings([res.enquiry]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load lead details");
      setBanner({ kind: "err", message: err?.message || "Failed to load lead" });
    } finally {
      setLoading(false);
    }
  }, [idNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invalid ID or 404 state
  if (isNaN(idNum) || (error && !detail && !loading)) {
    return (
      <div className="bg-surface rounded-[8px] border border-line p-8 text-center text-muted max-w-md mx-auto my-12">
        <Search size={32} strokeWidth={1.75} className="mx-auto mb-3 text-muted" />
        <h2 className="text-[15px] font-semibold text-ink mb-1">
          Lead not found
        </h2>
        <p className="text-xs text-muted mb-6">
          Enquiry #{idParam || "unknown"} does not exist or could not be loaded.
        </p>
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-brand text-surface font-medium text-xs hover:bg-brand/90 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          <span>Back to pipeline</span>
        </Link>
      </div>
    );
  }

  // Loading skeleton
  if (loading && !detail) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-canvas rounded-[6px] w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-44 bg-surface rounded-[8px] border border-line" />
            <div className="h-32 bg-surface rounded-[8px] border border-line" />
            <div className="h-48 bg-surface rounded-[8px] border border-line" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="h-28 bg-surface rounded-[8px] border border-line" />
            <div className="h-48 bg-surface rounded-[8px] border border-line" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { enquiry, contact, activities } = detail;

  // Handlers
  const handleStatusChange = async (newStatus: Stage) => {
    if (newStatus === enquiry.status || !enquiry.id) return;
    const prevStatus = enquiry.status as Stage;

    // Optimistic update
    setDetail({
      ...detail,
      enquiry: {
        ...enquiry,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
    });

    try {
      await updateEnquiry(enquiry.id, { status: newStatus });
      // Fetch fresh detail to show new status_change activity
      const fresh = await getEnquiryDetail(enquiry.id);
      setDetail(fresh);
      setSiblings((prev) =>
        prev
          ? prev.map((s) =>
              s.id === enquiry.id ? { ...s, status: newStatus } : s
            )
          : prev
      );
    } catch (err: any) {
      // Revert on error
      setDetail({
        ...detail,
        enquiry: {
          ...enquiry,
          status: prevStatus,
        },
      });
      setBanner({
        kind: "err",
        message: err?.message || "Failed to update status",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setBanner({ kind: "err", message: "Failed to copy to clipboard" });
    }
  };

  const handleRegenerate = async (lang?: "english" | "banglish") => {
    setRegenerating(true);
    setBanner(null);
    try {
      const subset = toExtractedEnquiry(enquiry, contact.name);
      const res = await analyzeReply(enquiry.raw_message, subset, lang);
      if (res.reply) {
        setReplyText(res.reply);
        setBanner({
          kind: "ok",
          message: `Reply regenerated (${
            res.source === "cache" ? "cached" : res.source
          })`,
        });
      }
    } catch (err: any) {
      setBanner({
        kind: "err",
        message: err?.message || "Failed to regenerate reply",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveReply = async () => {
    if (!enquiry.id) return;
    setSavingReply(true);
    setBanner(null);
    try {
      await updateEnquiry(enquiry.id, { reply_draft: replyText });
      setBanner({ kind: "ok", message: "Reply saved" });
      const fresh = await getEnquiryDetail(enquiry.id);
      setDetail(fresh);
    } catch (err: any) {
      setBanner({
        kind: "err",
        message: err?.message || "Failed to save reply draft",
      });
    } finally {
      setSavingReply(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!enquiry.id) return;
    setSavingNotes(true);
    setBanner(null);
    try {
      await updateEnquiry(enquiry.id, { notes: notesText });
      setBanner({ kind: "ok", message: "Note saved" });
      const fresh = await getEnquiryDetail(enquiry.id);
      setDetail(fresh);
    } catch (err: any) {
      setBanner({
        kind: "err",
        message: err?.message || "Failed to save note",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
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

  const contactDisplayName =
    contact.name?.trim() || enquiry.contact_name?.trim() || "Unknown lead";
  const contactPhone = contact.phone_normalized || enquiry.contact_phone;
  const enquiriesCount = siblings ? siblings.length : 1;

  return (
    <div className="space-y-5">
      {/* Top back navigation & notification banner */}
      <div className="flex items-center justify-between">
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          <span>Back to pipeline</span>
        </Link>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-[6px] border text-xs font-medium flex items-center justify-between ${
            banner.kind === "ok"
              ? "bg-brand-soft border-brand/20 text-brand"
              : "bg-urgent-soft border-urgent/30 text-urgent"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.kind === "ok" ? (
              <Check size={14} strokeWidth={1.75} />
            ) : (
              <AlertTriangle size={14} strokeWidth={1.75} />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs font-medium underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 12-Column Desktop Grid, Single Column Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* a) Contact Header Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] leading-snug font-semibold text-ink">
                  {contactDisplayName}
                </h1>
                {enquiry.priority && (
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-xs capitalize border ${getPriorityBadgeClass(
                      enquiry.priority
                    )}`}
                  >
                    {enquiry.priority}
                  </span>
                )}
                {enquiry.category && (
                  <span className="px-2 py-0.5 rounded-[6px] text-xs bg-canvas text-ink border border-line capitalize">
                    {(enquiry.category || "").replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {enquiry.is_overdue && (
                <span className="bg-urgent-soft text-urgent border border-urgent/30 px-2 py-0.5 rounded-[6px] text-xs font-medium inline-flex items-center gap-1">
                  <Clock size={12} strokeWidth={1.75} />
                  <span>Follow-up</span>
                </span>
              )}
            </div>

            {/* Row: Phone, Channel, Received At */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-line text-muted">
              <div>
                <span className="text-muted block text-xs">Phone</span>
                <span className="font-mono text-ink font-medium tabular-nums">
                  {contactPhone ? contactPhone : "phone missing"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-xs">Channel</span>
                <span className="font-medium text-ink">
                  {enquiry.channel}
                </span>
              </div>
              <div>
                <span className="text-muted block text-xs">Received</span>
                <span className="font-medium text-ink tabular-nums">
                  {formatDateTime(enquiry.received_at)}
                </span>
              </div>
            </div>

            {/* Row: First seen & enquiry count */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-line text-muted">
              <span className="tabular-nums">Contact first seen {formatDateOnly(contact.first_seen)}</span>
              <span className="font-medium text-ink tabular-nums">
                {enquiriesCount}{" "}
                {enquiriesCount === 1 ? "enquiry" : "enquiries"} from this
                contact
              </span>
            </div>
          </div>

          {/* b) Needs human review warning banner */}
          {enquiry.needs_review && (
            <div className="p-3.5 rounded-[8px] bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium flex items-center gap-2.5">
              <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0" />
              <div>
                <span className="font-semibold">Needs human review:</span>{" "}
                <span>{enquiry.review_reason || "Escalation flag"}</span>
              </div>
            </div>
          )}

          {/* c) Raw Message Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-2">
            <h3 className="text-xs font-semibold text-muted">
              Original message
            </h3>
            <div className="p-4 rounded-[6px] bg-canvas border border-line text-xs leading-relaxed text-ink whitespace-pre-wrap font-bangla select-text">
              {enquiry.raw_message}
            </div>
          </div>

          {/* d) Reply Draft Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-muted">
                Suggested reply ({enquiry.language || "banglish"})
              </label>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={12} strokeWidth={1.75} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} strokeWidth={1.75} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => handleRegenerate("banglish")}
                  className="px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors disabled:opacity-50"
                >
                  {regenerating ? "..." : "Regenerate Banglish"}
                </button>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => handleRegenerate("english")}
                  className="px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors disabled:opacity-50"
                >
                  Regenerate English
                </button>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => handleRegenerate(undefined)}
                  className="px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors disabled:opacity-50"
                >
                  Regenerate auto
                </button>
              </div>
            </div>

            {/* Editable Textarea */}
            <textarea
              rows={5}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type or customize your reply draft here..."
              className="w-full rounded-[6px] border border-line bg-canvas p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand font-bangla leading-relaxed"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={savingReply}
                onClick={handleSaveReply}
                className="px-4 py-2 rounded-[6px] bg-brand hover:bg-brand/90 text-surface font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {savingReply ? "Saving..." : "Save reply"}
              </button>
            </div>
          </div>

          {/* e) Notes Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted">
              Internal notes
            </h3>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add call notes, follow-up comments, or context..."
              className="w-full rounded-[6px] border border-line bg-canvas p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand font-bangla leading-relaxed"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-[6px] bg-ink hover:bg-ink/90 text-surface font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {savingNotes ? "Saving..." : "Save note"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols, sticky on desktop) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          {/* a) Status Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted">
                Stage
              </h3>
              <span className="text-xs text-muted tabular-nums">
                Last updated {relTime(enquiry.updated_at)}
              </span>
            </div>

            <select
              value={enquiry.status}
              onChange={(e) => handleStatusChange(e.target.value as Stage)}
              className="w-full rounded-[6px] border border-line p-2.5 text-xs font-semibold text-ink bg-canvas hover:border-ink focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* b) Activity Timeline Card */}
          <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted">
              Activity
            </h3>
            <ActivityTimeline activities={activities} channel={enquiry.channel} />
          </div>

          {/* c) Contact History Card */}
          {siblings && siblings.length > 0 && (
            <div className="bg-surface rounded-[8px] border border-line p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted">
                  Contact history
                </h3>
                <span className="text-xs text-muted tabular-nums">
                  {siblings.length} total
                </span>
              </div>

              <div className="space-y-2">
                {siblings.map((sib) => {
                  const isCurrent = sib.id === enquiry.id;
                  return (
                    <div
                      key={sib.id}
                      onClick={() => {
                        if (!isCurrent && sib.id) {
                          router.push(`/leads/${sib.id}`);
                        }
                      }}
                      className={`p-3 rounded-[6px] border text-xs transition-colors ${
                        isCurrent
                          ? "bg-brand-soft border-brand/30 cursor-default"
                          : "bg-canvas border-line hover:border-ink/40 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-semibold text-ink">
                          <span>Enquiry #{sib.id}</span>
                          {isCurrent && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 bg-brand text-surface rounded-[4px]">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted tabular-nums">
                          {formatDateOnly(sib.received_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded-[4px] text-[11px] bg-surface text-muted border border-line capitalize">
                          {(sib.category || "").replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium ${
                            STAGE_COLORS[sib.status as Stage] ||
                            "bg-canvas text-ink"
                          }`}
                        >
                          {sib.status}
                        </span>
                      </div>
                      {sib.summary && (
                        <p className="text-xs text-ink/80 line-clamp-2">
                          {sib.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
