import { useEffect, useState } from "react";
import { Send, Loader2, Check, X, Calendar, Plug, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import type { Connection, PublishResult } from "../lib/types";

export default function PublishPanel({
  uploadId,
  onPublished,
}: {
  uploadId: number;
  onPublished?: (status: Record<string, string>) => void;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [dateLocal, setDateLocal] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[] | null>(null);

  function loadConnections() {
    setLoading(true);
    setConnError(null);
    api
      .getConnections()
      .then(setConnections)
      .catch((e) => setConnError(e instanceof Error ? e.message : "Failed to load connections"))
      .finally(() => setLoading(false));
  }

  useEffect(loadConnections, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    const targets = connections
      .filter((c) => selected.has(c.id))
      .map((c) => ({ integration_id: c.id, provider: c.provider }));
    if (targets.length === 0) return;
    setPublishing(true);
    setResults(null);
    try {
      const dateIso = when === "schedule" && dateLocal ? new Date(dateLocal).toISOString() : undefined;
      const res = await api.publish(uploadId, targets, when, dateIso);
      setResults(res.results);
      onPublished?.(res.publish_status);
    } catch (e) {
      setResults([
        { integration_id: "", provider: "", ok: false, detail: e instanceof Error ? e.message : "Publish failed" },
      ]);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold">
          <Send className="h-5 w-5 text-primary" /> Publish
        </span>
        <button
          onClick={loadConnections}
          aria-label="Refresh connections"
          className="flex items-center gap-1 text-xs font-semibold text-foreground/60 hover:text-foreground cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-foreground/60">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading connected accounts…
        </div>
      ) : connError ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Plug className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Postiz isn't connected yet.</p>
            <p className="mt-1">
              Start Postiz, connect your accounts, then paste a Public API key into{" "}
              <code className="rounded bg-black/10 px-1">backend/.env</code> (POSTIZ_API_KEY) and restart the backend.
            </p>
            <p className="mt-1 opacity-70">Details: {connError}</p>
          </div>
        </div>
      ) : connections.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/60">
          No accounts connected in Postiz yet. Connect Instagram / LinkedIn in the Postiz UI, then hit Refresh.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-foreground/50">Pick where to post (uses each platform's caption):</p>
          <div className="mt-2 grid gap-2">
            {connections.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:border-primary/50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                {c.picture ? (
                  <img src={c.picture} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                    {(c.provider || "?")[0]}
                  </span>
                )}
                <span className="font-medium">{c.name}</span>
                <span className="text-xs capitalize text-foreground/50">{c.provider}</span>
              </label>
            ))}
          </div>

          {/* When */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={when === "now"} onChange={() => setWhen("now")} className="accent-primary" />
              <span className="text-sm font-medium">Post now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={when === "schedule"}
                onChange={() => setWhen("schedule")}
                className="accent-primary"
              />
              <span className="flex items-center gap-1 text-sm font-medium">
                <Calendar className="h-4 w-4" /> Schedule
              </span>
            </label>
            {when === "schedule" && (
              <input
                type="datetime-local"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                className="field max-w-xs py-2"
              />
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handlePublish}
              disabled={publishing || selected.size === 0 || (when === "schedule" && !dateLocal)}
              className="btn-primary"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Publishing…
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" /> {when === "schedule" ? "Schedule post" : "Post now"}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {results && (
        <div className="mt-4 grid gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                r.ok
                  ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {r.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
              <span className="font-semibold capitalize">{r.provider || "Error"}</span>
              <span className="truncate opacity-80">
                {r.ok ? (when === "schedule" ? "scheduled" : "posted") : r.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
