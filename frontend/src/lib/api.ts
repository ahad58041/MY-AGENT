import type { Captions, Connection, PublishResponse, Upload } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async listUploads(): Promise<Upload[]> {
    return handle(await fetch(`${BASE}/api/uploads`));
  },

  async getUpload(id: number): Promise<Upload> {
    return handle(await fetch(`${BASE}/api/uploads/${id}`));
  },

  async createUpload(video: File, genericCaption: string, context?: string): Promise<Upload> {
    const form = new FormData();
    form.append("video", video);
    form.append("generic_caption", genericCaption);
    if (context) form.append("context", context);
    return handle(await fetch(`${BASE}/api/uploads`, { method: "POST", body: form }));
  },

  async deleteUpload(id: number): Promise<void> {
    const res = await fetch(`${BASE}/api/uploads/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
  },

  videoUrl(id: number): string {
    return `${BASE}/api/uploads/${id}/video`;
  },

  subtitledVideoUrl(id: number): string {
    return `${BASE}/api/uploads/${id}/subtitled-video`;
  },

  async generateSubtitles(id: number): Promise<Upload> {
    return handle(await fetch(`${BASE}/api/uploads/${id}/subtitles`, { method: "POST" }));
  },

  async generateCaptions(id: number): Promise<Upload> {
    return handle(await fetch(`${BASE}/api/uploads/${id}/generate-captions`, { method: "POST" }));
  },

  async saveCaptions(id: number, captions: Captions): Promise<Upload> {
    return handle(
      await fetch(`${BASE}/api/uploads/${id}/captions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions }),
      })
    );
  },

  async getConnections(): Promise<Connection[]> {
    return handle(await fetch(`${BASE}/api/connections`));
  },

  async publish(
    id: number,
    targets: { integration_id: string; provider: string }[],
    when: "now" | "schedule" = "now",
    dateIso?: string
  ): Promise<PublishResponse> {
    return handle(
      await fetch(`${BASE}/api/uploads/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, when, date_iso: dateIso ?? null }),
      })
    );
  },
};
