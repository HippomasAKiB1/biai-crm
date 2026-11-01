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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        isConnected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
        }`}
      />
      <span>{isConnected ? "API connected" : "API offline"}</span>
      {lastChecked && (
        <span className="text-[10px] opacity-75 hidden sm:inline">
          {lastChecked}
        </span>
      )}
    </button>
  );
}
