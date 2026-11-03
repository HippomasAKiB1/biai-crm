"use client";

import { ArrowRight } from "lucide-react";
import type { Activity } from "@/lib/types";

interface ActivityTimelineProps {
  activities: Activity[];
  channel?: string;
}

function rel(at: string): string {
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
  if (days <= 7) return `${days}d ago`;
  return date.toISOString().split("T")[0];
}

export function ActivityTimeline({ activities, channel }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return <div className="text-xs text-muted py-3 text-center">No activity yet.</div>;
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  const renderDescription = (act: Activity) => {
    switch (act.type) {
      case "created":
        return (
          <span>
            Enquiry received via{" "}
            <span className="font-medium text-ink">{channel || "channel"}</span>
          </span>
        );
      case "status_change":
        return (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <span>Status:</span>
            <span className="font-bangla font-medium text-muted">
              {act.from_value || "None"}
            </span>
            <ArrowRight size={12} strokeWidth={1.75} className="text-muted inline" />
            <span className="font-bangla font-semibold text-ink">
              {act.to_value}
            </span>
          </span>
        );
      case "note":
        return (
          <span>
            Note: <span className="font-bangla text-ink">{act.to_value}</span>
          </span>
        );
      case "reply_edited":
        return <span>Reply updated</span>;
      default:
        return <span>{act.type}</span>;
    }
  };

  const getBulletColor = (type: string) => {
    switch (type) {
      case "created":
        return "bg-brand";
      case "status_change":
        return "bg-ink";
      case "note":
        return "bg-warn";
      case "reply_edited":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
      {sorted.map((act, idx) => (
        <div key={act.id ?? idx} className="relative text-xs">
          <span
            className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ${getBulletColor(
              act.type
            )} ring-4 ring-surface`}
          />
          <div className="text-ink leading-tight">{renderDescription(act)}</div>
          <span className="text-xs text-muted block mt-0.5 tabular-nums">{rel(act.at)}</span>
        </div>
      ))}
    </div>
  );
}
