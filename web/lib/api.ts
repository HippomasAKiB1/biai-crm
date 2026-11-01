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
