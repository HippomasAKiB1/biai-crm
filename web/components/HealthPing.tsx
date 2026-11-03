"use client";

import { useEffect, useState, useRef } from "react";
import { pingHealth } from "@/lib/api";

export default function HealthPing() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkHealth = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await pingHealth(controller.signal);
    if (!controller.signal.aborted) {
      setOnline(res.ok);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isConnected = online === true;

  return (
    <button
      type="button"
      onClick={checkHealth}
      title="Click to check API health"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium border border-line bg-surface text-muted hover:border-ink transition-colors"
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          isConnected ? "bg-brand" : "bg-urgent"
        }`}
      />
      <span className="text-xs text-muted">{isConnected ? "API connected" : "API offline"}</span>
      {lastChecked && (
        <span className="text-[10px] text-muted opacity-75 hidden sm:inline tabular-nums">
          {lastChecked}
        </span>
      )}
    </button>
  );
}
