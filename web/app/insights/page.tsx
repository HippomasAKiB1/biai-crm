"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Sparkles,
  RefreshCw,
  Zap,
  BarChart2,
  Check,
} from "lucide-react";
import {
  generateWeeklySummary,
  getFollowups,
  runEval,
  type EvalResult,
  type EvalRow,
} from "@/lib/api";
import type { EnquiryResponse } from "@/lib/types";

function formatDue(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
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
      <h1 className="text-[22px] leading-snug font-semibold text-ink">
        {title}
      </h1>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
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

  const [summaryData, setSummaryData] = useState<{
    summary: string;
    stats: any;
    source: string;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [evalData, setEvalData] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalTab, setEvalTab] = useState<"samples" | "holdout">("samples");

  const handleRunEval = async () => {
    try {
      setEvalLoading(true);
      setEvalError(null);
      const res = await runEval();
      setEvalData(res);
    } catch (err: any) {
      setEvalError(err?.message || "Failed to run evaluation");
    } finally {
      setEvalLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const res = await generateWeeklySummary();
      setSummaryData(res);
    } catch (err: any) {
      setSummaryError(err?.message || "Failed to generate weekly summary");
    } finally {
      setSummaryLoading(false);
    }
  };

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
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        subtitle="Dashboard, today's follow-ups, weekly summary, eval accuracy."
      />

      {/* Stats Bar: One surface panel with stats in a row separated by vertical hairlines */}
      <div className="bg-surface rounded-[8px] border border-line divide-x divide-line grid grid-cols-3">
        <div className="p-4 text-center">
          <div className="text-[28px] font-semibold text-urgent tabular-nums leading-none">
            {overdueCount}
          </div>
          <div className="text-xs text-muted mt-1.5">Overdue follow-ups</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-[28px] font-semibold text-warn tabular-nums leading-none">
            {dueTodayCount}
          </div>
          <div className="text-xs text-muted mt-1.5">Due today</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-[28px] font-semibold text-ink tabular-nums leading-none">
            {total}
          </div>
          <div className="text-xs text-muted mt-1.5">Total follow-ups</div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium rounded-[6px] flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="underline font-medium ml-2 hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Today's follow-ups */}
      <section className="bg-surface rounded-[8px] border border-line p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-line">
          <div>
            <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <span>Today&apos;s follow-ups</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-canvas text-muted border border-line tabular-nums">
                {total}
              </span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Overdue or pending callbacks that require team attention.
            </p>
          </div>
        </div>

        {/* List / Table of follow-ups */}
        {loading ? (
          <div className="space-y-2 py-4 animate-pulse">
            <div className="h-10 bg-canvas rounded-[6px]" />
            <div className="h-10 bg-canvas rounded-[6px]" />
            <div className="h-10 bg-canvas rounded-[6px]" />
          </div>
        ) : followups.length === 0 ? (
          <div className="py-12 border border-dashed border-line rounded-[6px] text-center text-xs text-muted">
            Nothing overdue. Nice work.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted">
              <thead>
                <tr className="border-b border-line text-muted font-medium text-xs">
                  <th className="py-2.5 px-3">Lead name</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Interest</th>
                  <th className="py-2.5 px-3">Overdue status</th>
                  <th className="py-2.5 px-3 text-right">Scheduled due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {followups.map((item) => {
                  const displayName =
                    item.contact_name?.trim() || "Unknown lead";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => item.id && router.push(`/leads/${item.id}`)}
                      className="hover:bg-canvas cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-ink">
                        {displayName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-[6px] text-xs capitalize border ${getPriorityStyle(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-canvas text-muted text-xs capitalize font-medium border border-line">
                          {(item.category || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-ink">
                        {item.interest}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-urgent tabular-nums">
                          {item.days_since_last_touch}d overdue
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-muted tabular-nums">
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

      {/* Section 2: Weekly AI Summary */}
      <section className="bg-surface rounded-[8px] border border-line p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Calendar size={18} strokeWidth={1.75} className="text-muted shrink-0" />
            <div>
              <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span>Weekly AI summary</span>
                {summaryData?.source === "cache" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-brand-soft text-brand border border-brand/20">
                    Cached
                  </span>
                )}
                {summaryData?.source === "llm" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-canvas text-ink border border-line">
                    Live LLM
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted">
                SQL-grounded executive report narrated by LLM. Numbers are computed with SQL; LLM writes the narrative.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-brand hover:bg-brand/90 text-surface font-medium text-xs transition-colors disabled:opacity-50 shrink-0"
          >
            {summaryLoading ? (
              <>
                <RefreshCw size={14} strokeWidth={1.75} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} strokeWidth={1.75} />
                <span>{summaryData ? "Regenerate summary" : "Generate summary"}</span>
              </>
            )}
          </button>
        </div>

        {summaryError && (
          <div className="p-3 bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium rounded-[6px] flex items-center justify-between">
            <span>{summaryError}</span>
            <button
              onClick={handleGenerateSummary}
              className="underline font-medium ml-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {summaryLoading && !summaryData && (
          <div className="py-12 text-center space-y-3">
            <Zap size={24} strokeWidth={1.75} className="mx-auto text-muted animate-pulse" />
            <p className="text-xs text-muted font-medium">
              Aggregating database counts and generating narrative summary...
            </p>
          </div>
        )}

        {!summaryData && !summaryLoading && !summaryError && (
          <div className="py-10 border border-dashed border-line rounded-[6px] text-center text-xs text-muted">
            Click &ldquo;Generate summary&rdquo; to analyze pipeline metrics and generate an executive narrative.
          </div>
        )}

        {summaryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Narrative text */}
            <div className="lg:col-span-2 bg-canvas border border-line rounded-[6px] p-5">
              <h3 className="text-xs font-semibold text-muted mb-3 flex items-center gap-1.5">
                <span>Executive narrative</span>
              </h3>
              <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {summaryData.summary}
              </div>
            </div>

            {/* Side-by-side SQL Stats verification table */}
            <div className="bg-surface border border-line rounded-[6px] p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted pb-2 border-b border-line flex items-center justify-between">
                <span>Verified SQL stats</span>
                <span className="text-[11px] font-normal text-muted">Grounded data</span>
              </h3>

              {/* Status breakdown */}
              <div>
                <p className="text-xs font-medium text-ink mb-1.5">By status</p>
                <div className="space-y-1">
                  {Object.entries(summaryData.stats.by_status || {}).map(([st, cnt]) => (
                    <div key={st} className="flex justify-between text-xs text-muted">
                      <span>{st}</span>
                      <span className="font-semibold text-ink tabular-nums">{cnt as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category breakdown */}
              <div className="pt-2 border-t border-line">
                <p className="text-xs font-medium text-ink mb-1.5">By category</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(summaryData.stats.by_category || {}).map(([cat, cnt]) => (
                    <div key={cat} className="flex justify-between text-xs text-muted">
                      <span className="truncate pr-2 capitalize">{cat.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-ink tabular-nums">{cnt as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue & Highlights */}
              <div className="pt-2 border-t border-line space-y-1.5 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Active leads</span>
                  <span className="font-semibold text-ink tabular-nums">{summaryData.stats.active_leads}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Overdue (&ge;48h)</span>
                  <span className="font-semibold text-urgent tabular-nums">{summaryData.stats.overdue_count}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Eval Accuracy */}
      <section className="bg-surface rounded-[8px] border border-line p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <BarChart2 size={18} strokeWidth={1.75} className="text-muted shrink-0" />
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                Eval accuracy
              </h2>
              <p className="text-xs text-muted">
                Measures performance on the 20 tuning samples and a separate 12-message holdout set.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunEval}
            disabled={evalLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-brand hover:bg-brand/90 text-surface font-medium text-xs transition-colors disabled:opacity-50 shrink-0"
          >
            {evalLoading ? (
              <>
                <RefreshCw size={14} strokeWidth={1.75} className="animate-spin" />
                <span>Running eval...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} strokeWidth={1.75} />
                <span>{evalData ? "Re-run evaluation" : "Run evaluation"}</span>
              </>
            )}
          </button>
        </div>

        {evalError && (
          <div className="p-3 bg-urgent-soft border border-urgent/30 text-urgent text-xs font-medium rounded-[6px] flex items-center justify-between">
            <span>{evalError}</span>
            <button
              onClick={handleRunEval}
              className="underline font-medium ml-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {evalLoading && !evalData && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw size={24} strokeWidth={1.75} className="mx-auto text-muted animate-spin" />
            <p className="text-xs text-muted font-medium">
              Evaluating 20 tuning samples and 12 holdout test cases against ground-truth labels...
            </p>
          </div>
        )}

        {!evalData && !evalLoading && !evalError && (
          <div className="py-10 border border-dashed border-line rounded-[6px] text-center text-xs text-muted">
            Click &ldquo;Run evaluation&rdquo; to benchmark extraction accuracy and view failure cases.
          </div>
        )}

        {evalData && (
          <div className="space-y-6">
            {/* Side-by-Side Accuracy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: 20 Tuning Samples */}
              <div className="bg-canvas border border-line rounded-[6px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-ink">20 Tuning samples</h3>
                    <p className="text-xs text-muted">Known training baseline from sample enquiries</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[28px] font-semibold text-brand tabular-nums leading-none">
                      {evalData.samples.accuracy.overall}%
                    </span>
                    <span className="text-[11px] text-muted block font-medium">overall</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface border border-line rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand h-2 rounded-full transition-all duration-500"
                    style={{ width: `${evalData.samples.accuracy.overall}%` }}
                  />
                </div>

                {/* Field breakdown scores */}
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-line text-center">
                  <div>
                    <span className="text-[11px] text-muted block">Category</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.samples.accuracy.category}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Language</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.samples.accuracy.language}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Interest</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.samples.accuracy.interest}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Priority</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.samples.accuracy.priority}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Review</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.samples.accuracy.review}%</span>
                  </div>
                </div>
              </div>

              {/* Right: 12 Holdout Messages */}
              <div className="bg-canvas border border-line rounded-[6px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-ink">12 Holdout messages</h3>
                    <p className="text-xs text-muted">Unseen holdout test set with edge cases</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[28px] font-semibold text-brand tabular-nums leading-none">
                      {evalData.holdout.accuracy.overall}%
                    </span>
                    <span className="text-[11px] text-muted block font-medium">overall</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface border border-line rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand h-2 rounded-full transition-all duration-500"
                    style={{ width: `${evalData.holdout.accuracy.overall}%` }}
                  />
                </div>

                {/* Field breakdown scores */}
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-line text-center">
                  <div>
                    <span className="text-[11px] text-muted block">Category</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.holdout.accuracy.category}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Language</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.holdout.accuracy.language}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Interest</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.holdout.accuracy.interest}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Priority</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.holdout.accuracy.priority}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block">Review</span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{evalData.holdout.accuracy.review}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mismatches Section */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-ink">
                    Mismatches &amp; failure analysis
                  </h3>
                  <span className="text-xs bg-urgent-soft text-urgent font-medium px-2 py-0.5 rounded-[6px] border border-urgent/30 tabular-nums">
                    {(evalTab === "samples" ? evalData.samples : evalData.holdout).rows.filter(
                      (r) => !r.match.category || !r.match.language || !r.match.interest || !r.match.priority || !r.match.review
                    ).length} failed
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-canvas p-0.5 rounded-[6px] border border-line text-xs">
                  <button
                    onClick={() => setEvalTab("samples")}
                    className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                      evalTab === "samples"
                        ? "bg-surface text-ink border border-line"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    20 Samples ({evalData.samples.rows.filter(
                      (r) => !r.match.category || !r.match.language || !r.match.interest || !r.match.priority || !r.match.review
                    ).length})
                  </button>
                  <button
                    onClick={() => setEvalTab("holdout")}
                    className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                      evalTab === "holdout"
                        ? "bg-surface text-ink border border-line"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    12 Holdout ({evalData.holdout.rows.filter(
                      (r) => !r.match.category || !r.match.language || !r.match.interest || !r.match.priority || !r.match.review
                    ).length})
                  </button>
                </div>
              </div>

              {/* Mismatch table */}
              {(() => {
                const currentSet = evalTab === "samples" ? evalData.samples : evalData.holdout;
                const mismatches = currentSet.rows.filter(
                  (r) => !r.match.category || !r.match.language || !r.match.interest || !r.match.priority || !r.match.review
                );

                if (mismatches.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-muted bg-canvas border border-line rounded-[6px]">
                      100% accuracy on all evaluated fields! No mismatches detected.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-[6px] border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas text-xs font-medium text-muted border-b border-line">
                        <tr>
                          <th className="py-2.5 px-3 w-12">ID</th>
                          <th className="py-2.5 px-3 min-w-[240px]">Message snippet</th>
                          <th className="py-2.5 px-3">Discrepancy (expected vs actual)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {mismatches.map((r) => {
                          const mismatchFields = [];
                          if (!r.match.category) {
                            mismatchFields.push({
                              field: "Category",
                              exp: r.expected.category,
                              act: r.actual.category,
                            });
                          }
                          if (!r.match.language) {
                            mismatchFields.push({
                              field: "Language",
                              exp: r.expected.language,
                              act: r.actual.language,
                            });
                          }
                          if (!r.match.interest) {
                            mismatchFields.push({
                              field: "Interest",
                              exp: r.expected.interest,
                              act: r.actual.interest,
                            });
                          }
                          if (!r.match.priority) {
                            mismatchFields.push({
                              field: "Priority",
                              exp: r.expected.priority,
                              act: r.actual.priority,
                            });
                          }
                          if (!r.match.review) {
                            mismatchFields.push({
                              field: "Review",
                              exp: String(r.expected.review_required),
                              act: String(r.actual.review_required),
                            });
                          }

                          return (
                            <tr key={r.id} className="hover:bg-canvas transition-colors">
                              <td className="py-2.5 px-3 font-mono font-medium text-muted align-top tabular-nums">
                                #{r.id}
                              </td>
                              <td className="py-2.5 px-3 text-ink align-top font-sans leading-relaxed">
                                &ldquo;{r.text}&rdquo;
                              </td>
                              <td className="py-2.5 px-3 align-top">
                                <div className="space-y-1">
                                  {mismatchFields.map((mf) => (
                                    <div
                                      key={mf.field}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-urgent-soft border border-urgent/30 text-xs text-urgent mr-2 mb-1"
                                    >
                                      <span className="font-semibold">{mf.field}:</span>
                                      <span className="text-muted">exp:</span>
                                      <span className="font-medium text-ink">{mf.exp}</span>
                                      <span className="text-urgent font-bold">&ne;</span>
                                      <span className="text-muted">act:</span>
                                      <span className="font-semibold text-urgent">{mf.act}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
