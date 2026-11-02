"use client";

import { useState } from "react";
import type { EnquiryResponse } from "@/lib/types";
import { STAGES, type Stage } from "@/lib/config";

interface LeadCardProps {
  enquiry: EnquiryResponse;
  onStatusChange: (id: number, status: Stage) => Promise<void>;
}

export function LeadCard({ enquiry, onStatusChange }: LeadCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Stage;
    if (newStatus === enquiry.status || !enquiry.id) return;
    setIsUpdating(true);
    try {
      await onStatusChange(enquiry.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getChannelGlyph = (channel: string) => {
    const lower = (channel || "").toLowerCase();
    if (lower.includes("whatsapp")) return "💬";
    if (lower.includes("facebook") || lower.includes("messenger")) return "📘";
    if (lower.includes("website") || lower.includes("form")) return "🌐";
    if (lower.includes("phone") || lower.includes("call")) return "📞";
    return "💬";
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

  const getInterestStyle = (interest: string) => {
    switch (interest) {
      case "Bootcamp":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Fellowship":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Corporate Training":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const formatDaysAgo = (days: number) => {
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  };

  const displayName = enquiry.contact_name?.trim() || "Unknown Lead";

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 p-3 shadow-sm hover:shadow transition-shadow flex flex-col gap-2 relative text-left">
      {/* Top row: Name & Overdue badge / Priority */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900 truncate" title={displayName}>
            {displayName}
          </h4>
          {enquiry.contact_phone && (
            <p className="text-xs text-slate-500 font-mono truncate">{enquiry.contact_phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {enquiry.is_overdue && (
            <span className="bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 shadow-sm">
              <span>⚠</span> Follow-up
            </span>
          )}
          <div className="flex items-center gap-1">
            {enquiry.needs_review && (
              <span
                className="bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-0.5"
                title={enquiry.review_reason || "Needs review"}
              >
                ⚠ Review
              </span>
            )}
            {enquiry.contact_enquiry_count > 1 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium"
                title={`This contact has ${enquiry.contact_enquiry_count} enquiries`}
              >
                ×{enquiry.contact_enquiry_count}
              </span>
            )}
            {enquiry.priority && enquiry.priority !== "normal" && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${getPriorityStyle(
                  enquiry.priority
                )}`}
              >
                {enquiry.priority}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary / Message snippet */}
      {enquiry.summary ? (
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed" title={enquiry.summary}>
          {enquiry.summary}
        </p>
      ) : enquiry.raw_message ? (
        <p className="text-xs text-slate-500 line-clamp-2 italic" title={enquiry.raw_message}>
          {enquiry.raw_message}
        </p>
      ) : null}

      {/* Chips: Interest, Channel, Language */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
        <span
          className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${getInterestStyle(
            enquiry.interest
          )}`}
        >
          {enquiry.interest || "Unknown"}
        </span>
        <span
          className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px]"
          title={enquiry.channel}
        >
          <span>{getChannelGlyph(enquiry.channel)}</span>
          <span className="truncate max-w-[80px]">{enquiry.channel}</span>
        </span>
        {enquiry.language && (
          <span className="bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">
            {enquiry.language}
          </span>
        )}
      </div>

      {/* Footer: Days since touch & Stage Dropdown */}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">
            {formatDaysAgo(enquiry.days_since_last_touch)}
          </span>
          {enquiry.confidence !== null && enquiry.confidence !== undefined && (
            <span
              className="text-[10px] text-slate-400 bg-slate-50 px-1 rounded"
              title="AI confidence"
            >
              {Math.round(enquiry.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Stage select */}
        <div className="relative">
          <select
            value={enquiry.status}
            onChange={handleStatusSelect}
            disabled={isUpdating}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer"
          >
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

