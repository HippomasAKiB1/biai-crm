"use client";

import { useState } from "react";
import {
  MessageCircle,
  Facebook,
  Globe,
  Phone,
  HelpCircle,
  Clock,
  AlertTriangle,
  Copy,
} from "lucide-react";
import type { EnquiryResponse } from "@/lib/types";
import { STAGES, type Stage } from "@/lib/config";

interface LeadCardProps {
  enquiry: EnquiryResponse;
  onStatusChange: (id: number, status: Stage) => Promise<void>;
}

function ChannelIcon({ channel }: { channel: string }) {
  const lower = (channel || "").toLowerCase();
  if (lower.includes("whatsapp")) return <MessageCircle size={14} strokeWidth={1.75} />;
  if (lower.includes("facebook") || lower.includes("messenger")) return <Facebook size={14} strokeWidth={1.75} />;
  if (lower.includes("website") || lower.includes("form")) return <Globe size={14} strokeWidth={1.75} />;
  if (lower.includes("phone") || lower.includes("call")) return <Phone size={14} strokeWidth={1.75} />;
  return <HelpCircle size={14} strokeWidth={1.75} />;
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

  const formatDaysAgo = (days: number) => {
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  };

  const displayName = enquiry.contact_name?.trim() || "Unknown lead";
  const isUrgent = enquiry.priority === "urgent";

  return (
    <div
      className={`bg-surface rounded-[8px] border border-line p-3 hover:border-ink/40 transition-colors flex flex-col gap-2 relative text-left ${
        isUrgent ? "border-l-[3px] border-l-urgent" : ""
      }`}
    >
      {/* Top row: Name & Badges */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-ink truncate" title={displayName}>
            {displayName}
          </h4>
          {enquiry.contact_phone && (
            <p className="text-xs text-muted tabular-nums truncate">{enquiry.contact_phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {enquiry.is_overdue && (
            <span className="bg-urgent-soft text-urgent border border-urgent/30 px-1.5 py-0.5 rounded-[6px] text-xs font-medium inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={1.75} />
              <span>Follow-up</span>
            </span>
          )}
          <div className="flex items-center gap-1">
            {enquiry.needs_review && (
              <span
                className="bg-warn-soft text-warn border border-warn/30 px-1.5 py-0.5 rounded-[6px] text-xs font-medium inline-flex items-center gap-1"
                title={enquiry.review_reason || "Needs review"}
              >
                <AlertTriangle size={12} strokeWidth={1.75} />
                <span>Review</span>
              </span>
            )}
            {enquiry.contact_enquiry_count > 1 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-[6px] bg-canvas text-muted border border-line font-medium inline-flex items-center gap-1"
                title={`This contact has ${enquiry.contact_enquiry_count} enquiries`}
              >
                <Copy size={12} strokeWidth={1.75} />
                <span>asked twice</span>
              </span>
            )}
            {enquiry.priority && enquiry.priority !== "normal" && (
              <span
                className={`px-1.5 py-0.5 rounded-[6px] text-xs border capitalize ${getPriorityStyle(
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
        <p className="text-xs text-ink/80 line-clamp-2 leading-relaxed" title={enquiry.summary}>
          {enquiry.summary}
        </p>
      ) : enquiry.raw_message ? (
        <p className="text-xs text-muted line-clamp-2 italic" title={enquiry.raw_message}>
          {enquiry.raw_message}
        </p>
      ) : null}

      {/* Chips: Interest, Channel, Language */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
        <span className="px-2 py-0.5 rounded-[6px] border border-line bg-canvas text-ink text-xs font-medium">
          {enquiry.interest || "Unknown"}
        </span>
        <span
          className="inline-flex items-center gap-1 bg-canvas text-muted border border-line px-2 py-0.5 rounded-[6px] text-xs"
          title={enquiry.channel}
        >
          <ChannelIcon channel={enquiry.channel} />
          <span className="truncate max-w-[80px]">{enquiry.channel}</span>
        </span>
        {enquiry.language && (
          <span className="bg-canvas text-muted border border-line px-1.5 py-0.5 rounded-[6px] text-xs">
            {enquiry.language}
          </span>
        )}
      </div>

      {/* Footer: Days since touch & Stage Dropdown */}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-line text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted tabular-nums">
            {formatDaysAgo(enquiry.days_since_last_touch)}
          </span>
          {enquiry.confidence !== null && enquiry.confidence !== undefined && (
            <span
              className="text-[11px] text-muted bg-canvas border border-line px-1 rounded-[4px] tabular-nums"
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
            className="text-xs font-medium bg-canvas border border-line rounded-[6px] px-2 py-1 text-ink hover:border-ink focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 cursor-pointer"
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
