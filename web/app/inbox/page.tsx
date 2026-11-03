"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  AlertTriangle,
  Zap,
  FileText,
  RefreshCw,
} from "lucide-react";
import { analyzeExtract, analyzeReply, saveEnquiry } from "@/lib/api";
import type {
  ExtractedEnquiry,
  Category,
  Interest,
  Stage,
  Priority,
} from "@/lib/types";

const CHANNELS = ["WhatsApp", "Facebook", "Website", "Phone", "Unknown"];
const CATEGORIES: Category[] = [
  "sales_lead",
  "pre_sales_question",
  "support",
  "refund",
  "spam",
  "job_seeker",
  "minor",
  "other",
];
const INTERESTS: Interest[] = [
  "Bootcamp",
  "Fellowship",
  "Corporate Training",
  "Unknown",
];
const STAGES: (Stage | "Outside")[] = [
  "New",
  "Contacted",
  "Interested",
  "Paid",
  "Lost",
  "Outside",
];
const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent", "none"];

function getTriageHeaderBg(cat: string, priority: string) {
  if (priority === "urgent" || cat === "refund") return "bg-urgent text-surface";
  if (cat === "support" || priority === "high") return "bg-warn text-surface";
  if (cat === "sales_lead" || cat === "pre_sales_question") return "bg-brand text-surface";
  return "bg-muted text-surface";
}

export default function InboxPage() {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("WhatsApp");
  const [senderName, setSenderName] = useState("");
  const [extracted, setExtracted] = useState<ExtractedEnquiry | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Partial<ExtractedEnquiry>>({});
  const [followUpDue, setFollowUpDue] = useState("");

  const handleAnalyze = async () => {
    if (!message.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setSavedId(null);
    setEditedFields({});

    try {
      const ext = await analyzeExtract(message.trim());
      setExtracted(ext);
      if (ext.sender_name && !senderName) {
        setSenderName(ext.sender_name);
      }
      // Prefill default follow-up due: 2h for urgent, 24h otherwise
      const hours = ext.priority === "urgent" ? 2 : 24;
      const due = new Date(Date.now() + hours * 3600 * 1000);
      setFollowUpDue(due.toISOString().slice(0, 16));

      // 2. Draft reply
      try {
        const repRes = await analyzeReply(message.trim(), ext);
        setReply(repRes.reply);
      } catch (repErr: any) {
        console.warn("Reply generation failed:", repErr);
        setReply(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to analyze message");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRegenerateReply = async (lang?: "english" | "banglish") => {
    if (!extracted || !message.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
      const currentMerged: ExtractedEnquiry = { ...extracted, ...editedFields };
      const repRes = await analyzeReply(message.trim(), currentMerged, lang);
      setReply(repRes.reply);
    } catch (err: any) {
      setError(err?.message || "Failed to regenerate reply");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extracted || saving) return;
    setSaving(true);
    setError(null);

    const mergedExt: ExtractedEnquiry = {
      ...extracted,
      ...editedFields,
      suggested_reply: reply,
    };

    try {
      const res = await saveEnquiry({
        raw_message: message.trim(),
        channel,
        sender_name: senderName.trim() || undefined,
        extracted: mergedExt,
      });
      setSavedId(res.enquiry.id ?? null);
      // Reset input form
      setMessage("");
      setSenderName("");
      setExtracted(null);
      setReply(null);
      setEditedFields({});
    } catch (err: any) {
      setError(err?.message || "Failed to save enquiry");
    } finally {
      setSaving(false);
    }
  };

  const currentExtracted: ExtractedEnquiry | null = extracted
    ? { ...extracted, ...editedFields }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-snug font-semibold text-ink">
            Inbox
          </h1>
          <p className="mt-1 text-xs text-muted">
            Paste a customer enquiry, analyze with AI, review and customize the triage and reply draft, then save.
          </p>
        </div>

        {savedId && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-brand-soft border border-brand/20 text-brand text-xs font-medium">
            <Check size={14} strokeWidth={1.75} />
            <span>Saved: Lead #{savedId}</span>
            <Link
              href={`/leads/${savedId}`}
              className="underline font-semibold hover:text-brand/80 inline-flex items-center gap-1 ml-1"
            >
              <span>View lead</span>
              <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-urgent-soft border border-urgent/30 text-urgent text-xs flex items-start gap-2">
          <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-urgent underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 12-Column Grid on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Paste Box & Channel (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-[8px] border border-line p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-ink">
              1. Paste message
            </h2>
            <span className="text-xs text-muted tabular-nums">
              {message.length} chars
            </span>
          </div>

          <div>
            <textarea
              rows={11}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste raw incoming message here (Bangla, Banglish, or English)..."
              className="w-full font-bangla rounded-[6px] border border-line bg-canvas p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-[6px] border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Sender Name (optional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Rafi Ahmed"
                className="w-full rounded-[6px] border border-line bg-canvas px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!message.trim() || analyzing}
            className={`w-full py-2 px-4 rounded-[6px] text-xs font-semibold text-surface transition-colors flex items-center justify-center gap-2 ${
              !message.trim() || analyzing
                ? "bg-line text-muted cursor-not-allowed"
                : "bg-brand hover:bg-brand/90"
            }`}
          >
            {analyzing ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                <span>Analyzing with AI...</span>
              </>
            ) : (
              <>
                <Zap size={14} strokeWidth={1.75} />
                <span>Analyze enquiry</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Review Panel, Reply Draft & Save (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {analyzing ? (
            /* Loading Skeleton State */
            <div className="bg-surface rounded-[8px] border border-line p-6 space-y-6 animate-pulse">
              <div className="h-6 bg-canvas rounded-[6px] w-1/3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-16 bg-canvas rounded-[6px]" />
                <div className="h-16 bg-canvas rounded-[6px]" />
                <div className="h-16 bg-canvas rounded-[6px]" />
                <div className="h-16 bg-canvas rounded-[6px]" />
              </div>
              <div className="h-24 bg-canvas rounded-[6px]" />
              <div className="h-32 bg-canvas rounded-[6px]" />
            </div>
          ) : !currentExtracted ? (
            /* Empty State */
            <div className="bg-surface rounded-[8px] border border-dashed border-line p-12 text-center">
              <FileText size={32} strokeWidth={1.75} className="mx-auto mb-3 text-muted" />
              <h3 className="text-sm font-semibold text-ink mb-1">
                Awaiting analysis
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Paste an enquiry on the left and click &ldquo;Analyze enquiry&rdquo; to extract intent, detect urgency, and preview the tailored reply.
              </p>
            </div>
          ) : (
            /* Review Panel */
            <div className="bg-surface rounded-[8px] border border-line p-6 space-y-5 overflow-hidden">
              {/* Solid Triage Header Strip */}
              <div
                className={`-mx-6 -mt-6 px-6 py-3 flex items-center justify-between text-xs font-semibold ${getTriageHeaderBg(
                  currentExtracted.category,
                  currentExtracted.priority
                )}`}
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize">{currentExtracted.category.replace(/_/g, " ")}</span>
                  <span>/</span>
                  <span>{currentExtracted.interest}</span>
                </div>
                <div className="flex items-center gap-2 font-normal">
                  <span className="capitalize">{currentExtracted.language}</span>
                  <span>&bull;</span>
                  <span className="tabular-nums">
                    {Math.round(currentExtracted.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* Summary Box */}
              {currentExtracted.summary && (
                <div className="p-3 rounded-[6px] bg-canvas border border-line text-xs text-ink leading-relaxed">
                  &ldquo;{currentExtracted.summary}&rdquo;
                </div>
              )}

              {currentExtracted.needs_human_review && (
                <div className="p-2.5 rounded-[6px] bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0" />
                  <span>
                    Needs review: {currentExtracted.review_reason || "Escalation flag"}
                  </span>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted">
                  2. Review & Edit Fields
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="animate-stagger-1">
                    <label className="block font-medium text-muted mb-1">
                      Category
                    </label>
                    <select
                      value={currentExtracted.category}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          category: e.target.value as Category,
                        }))
                      }
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="animate-stagger-2">
                    <label className="block font-medium text-muted mb-1">
                      Interest
                    </label>
                    <select
                      value={currentExtracted.interest}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          interest: e.target.value as Interest,
                        }))
                      }
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {INTERESTS.map((int) => (
                        <option key={int} value={int}>
                          {int}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="animate-stagger-3">
                    <label className="block font-medium text-muted mb-1">
                      Status
                    </label>
                    <select
                      value={currentExtracted.suggested_status}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          suggested_status: e.target.value as Stage,
                        }))
                      }
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="animate-stagger-4">
                    <label className="block font-medium text-muted mb-1">
                      Priority
                    </label>
                    <select
                      value={currentExtracted.priority}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          priority: e.target.value as Priority,
                        }))
                      }
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {PRIORITIES.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="animate-stagger-5">
                    <label className="block font-medium text-muted mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={currentExtracted.sender_name || ""}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          sender_name: e.target.value || null,
                        }))
                      }
                      placeholder="Identified sender name"
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="animate-stagger-6">
                    <label className="block font-medium text-muted mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editedFields.phone ?? currentExtracted.phone ?? ""}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          phone: e.target.value || null,
                        }))
                      }
                      onBlur={(e) => {
                        const val = e.target.value;
                        const digits = val.replace(/\D/g, "");
                        let norm = digits;
                        if (digits.length === 13 && digits.startsWith("880")) {
                          norm = digits.slice(2);
                        } else if (digits.length === 12 && digits.startsWith("88")) {
                          norm = "0" + digits.slice(2);
                        } else if (digits.length === 10 && digits.startsWith("1")) {
                          norm = "0" + digits;
                        }
                        setEditedFields((prev) => ({
                          ...prev,
                          phone: norm || null,
                        }));
                      }}
                      placeholder="e.g. 01711000001 (leave empty if not given)"
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand tabular-nums text-xs"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Normalized on save. Missing phone is normal.
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-muted mb-1">
                      Follow-up Due
                    </label>
                    <input
                      type="datetime-local"
                      value={followUpDue}
                      onChange={(e) => setFollowUpDue(e.target.value)}
                      className="w-full rounded-[6px] border border-line bg-canvas p-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Reply Draft Section */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-muted">
                    3. Reply Draft
                  </label>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors"
                    >
                      <RefreshCw size={12} strokeWidth={1.75} />
                      <span>{replyLoading ? "..." : "Regenerate"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply("english")}
                      className="px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors"
                    >
                      English
                    </button>
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply("banglish")}
                      className="px-2.5 py-1 rounded-[6px] border border-line bg-surface hover:border-ink text-ink font-medium transition-colors"
                    >
                      Banglish
                    </button>
                  </div>
                </div>

                {reply !== null ? (
                  <textarea
                    rows={6}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full font-bangla rounded-[6px] border border-line bg-canvas p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : (
                  <div className="p-4 rounded-[6px] bg-canvas border border-line text-xs text-muted text-center">
                    No reply: this enquiry is classified as &ldquo;{currentExtracted.category}&rdquo; and will be routed to the queue.
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-line flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`py-2 px-5 rounded-[6px] text-xs font-semibold text-surface transition-colors flex items-center gap-2 ${
                    saving
                      ? "bg-line text-muted cursor-not-allowed"
                      : "bg-brand hover:bg-brand/90"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                      <span>Saving Lead...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={1.75} />
                      <span>Save Lead</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
