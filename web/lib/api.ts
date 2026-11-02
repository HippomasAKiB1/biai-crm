import type {
  ExtractedEnquiry,
  Enquiry,
  Contact,
  Activity,
  EnquiryResponse,
  EnquiryListResponse,
  EnquiryDetailResponse,
} from "./types";

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
}): Promise<EnquiryDetailResponse> {
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

export interface GetEnquiriesParams {
  status?: string;
  statusIn?: string;
  category?: string;
  interest?: string;
  channel?: string;
  excludeOutside?: boolean;
  limit?: number;
}

export async function getEnquiries(params: GetEnquiriesParams = {}): Promise<EnquiryListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.statusIn) query.set("status_in", params.statusIn);
  if (params.category) query.set("category", params.category);
  if (params.interest) query.set("interest", params.interest);
  if (params.channel) query.set("channel", params.channel);
  if (params.excludeOutside !== undefined) query.set("exclude_outside", String(params.excludeOutside));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const url = `${API_BASE}/api/enquiries${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `Get enquiries failed with status ${res.status}`);
  }
  return res.json();
}

export async function updateEnquiry(
  id: number,
  patch: {
    status?: string;
    notes?: string;
    reply_draft?: string;
    priority?: string;
    needs_review?: boolean;
  }
): Promise<EnquiryResponse> {
  const res = await fetch(`${API_BASE}/api/enquiries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || `Update enquiry failed with status ${res.status}`);
  }
  return res.json();
}

