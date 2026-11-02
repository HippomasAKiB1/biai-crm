"use client";

import { useState } from "react";
import Link from "next/link";
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Paste a customer enquiry, analyze with AI, review and customize the triage and reply draft, then save.
          </p>
        </div>

        {savedId && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium shadow-xs">
            <span>✓ Saved — Lead #{savedId}</span>
            <Link
              href={`/leads/${savedId}`}
              className="underline font-semibold hover:text-emerald-950"
            >
              View Lead →
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2 shadow-xs">
          <span className="text-base select-none">⚠️</span>
          <div className="flex-1 font-medium">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-rose-600 hover:text-rose-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 12-Column Grid on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Paste Box & Channel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              1. Paste Message
            </h2>
            <span className="text-xs text-slate-400">
              {message.length} chars
            </span>
          </div>

          <div>
            <textarea
              rows={11}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste raw incoming message here (Bangla, Banglish, or English)..."
              className="w-full font-bangla rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sender Name (optional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Rafi Ahmed"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!message.trim() || analyzing}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-2 ${
              !message.trim() || analyzing
                ? "bg-slate-300 cursor-not-allowed text-slate-500"
                : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
            }`}
          >
            {analyzing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <span>⚡</span> Analyze Enquiry
              </>
            )}
          </button>
        </div>

        {/* Right Column: Review Panel, Reply Draft & Save (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {analyzing ? (
            /* Loading Skeleton State */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded-md w-1/3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          ) : !currentExtracted ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
              <div className="text-4xl mb-3 select-none">📋</div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                Awaiting Analysis
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paste an enquiry on the left and click &ldquo;Analyze Enquiry&rdquo; to extract intent, detect urgency, and preview the tailored reply.
              </p>
            </div>
          ) : (
            /* Review Panel */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              {/* Top Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {currentExtracted.category}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {currentExtracted.interest}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {currentExtracted.language}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        currentExtracted.priority === "urgent"
                          ? "bg-rose-100 text-rose-800"
                          : currentExtracted.priority === "high"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {currentExtracted.priority}
                    </span>
                  </div>

                  <span className="text-xs font-medium text-slate-500">
                    Confidence: {Math.round(currentExtracted.confidence * 100)}%
                  </span>
                </div>

                {currentExtracted.summary && (
                  <p className="text-xs text-slate-700 font-medium">
                    &ldquo;{currentExtracted.summary}&rdquo;
                  </p>
                )}

                {currentExtracted.needs_human_review && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      Needs review: {currentExtracted.review_reason || "Escalation flag"}
                    </span>
                  </div>
                )}
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  2. Review & Edit Fields
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
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
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
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
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {INTERESTS.map((int) => (
                        <option key={int} value={int}>
                          {int}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
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
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
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
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {PRIORITIES.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
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
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Follow-up Due
                    </label>
                    <input
                      type="datetime-local"
                      value={followUpDue}
                      onChange={(e) => setFollowUpDue(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reply Draft Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    3. Reply Draft
                  </label>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply()}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      {replyLoading ? "..." : "🔄 Regenerate"}
                    </button>
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply("english")}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      Switch to English
                    </button>
                    <button
                      type="button"
                      disabled={replyLoading}
                      onClick={() => handleRegenerateReply("banglish")}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      Switch to Banglish
                    </button>
                  </div>
                </div>

                {reply !== null ? (
                  <textarea
                    rows={6}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full font-bangla rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    No reply — this enquiry is classified as &ldquo;{currentExtracted.category}&rdquo; and will be routed to the queue.
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`py-2.5 px-6 rounded-xl text-sm font-semibold text-white transition-all shadow-xs flex items-center gap-2 ${
                    saving
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving Lead...
                    </>
                  ) : (
                    <>
                      <span>💾</span> Save Lead
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
