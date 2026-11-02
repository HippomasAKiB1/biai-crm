import type { ExtractedEnquiry, Enquiry, Contact, Activity } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function pingHealth(
  signal?: AbortSignal
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        return { ok: true };
      }
    }
  } catch {
    // If standard fetch was blocked (e.g. cross-origin without CORS headers),
    // check if the backend is reachable via no-cors mode.
    try {
      const noCorsRes = await fetch(`${API_BASE}/health`, {
        method: "GET",
        mode: "no-cors",
        signal,
        cache: "no-store",
      });
      if (noCorsRes.type === "opaque") {
        return { ok: true };
      }
    } catch {
      return { ok: false };
    }
  }
  return { ok: false };
}

export async function analyzeExtract(message: string): Promise<ExtractedEnquiry> {
  const res = await fetch(`${API_BASE}/api/analyze/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `Extract failed with status ${res.status}`);
  }
  return res.json();
}

export async function analyzeReply(
  message: string,
  extracted: ExtractedEnquiry,
  forceLanguage?: "english" | "banglish"
): Promise<{ reply: string | null; effective_language: string; source: string }> {
  const res = await fetch(`${API_BASE}/api/analyze/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      extracted,
      force_language: forceLanguage,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `Reply generation failed with status ${res.status}`);
  }
  return res.json();
}

export async function saveEnquiry(payload: {
  raw_message: string;
  channel: string;
  sender_name?: string;
  extracted: ExtractedEnquiry;
}): Promise<{ enquiry: Enquiry; contact: Contact; activities: Activity[] }> {
  const res = await fetch(`${API_BASE}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `Save enquiry failed with status ${res.status}`);
  }
  return res.json();
}
