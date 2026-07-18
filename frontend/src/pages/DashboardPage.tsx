import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Film, Loader2, Sparkles, CheckCircle2, Trash2, Send, Clock } from "lucide-react";
import { api } from "../lib/api";
import type { Upload } from "../lib/types";

export default function DashboardPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api
      .listUploads()
      .then(setUploads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this post and its video? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await api.deleteUpload(id);
      setUploads((list) => list.filter((u) => u.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-foreground/60">Your content pipeline.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Plus className="h-5 w-5" /> New Post
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-foreground/60">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn't reach the API ({error}). Is the backend running on port 8000?
        </div>
      ) : uploads.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Film className="h-7 w-7" />
          </span>
          <p className="text-foreground/70">No posts yet. Upload your first video to get started.</p>
          <Link to="/upload" className="btn-primary">
            <Plus className="h-5 w-5" /> New Post
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {uploads.map((u) => {
            const hasCaptions = Object.keys(u.captions ?? {}).length > 0;
            const posted = Object.keys(u.publish_status ?? {}).length > 0;
            return (
              <li key={u.id} className="card flex items-center gap-4 transition hover:border-primary/50 hover:shadow-md">
                <Link to={`/review/${u.id}`} className="flex min-w-0 flex-1 items-center gap-4 cursor-pointer">
                  <video
                    src={api.videoUrl(u.id)}
                    muted
                    preload="metadata"
                    className="h-16 w-12 shrink-0 rounded-lg bg-black object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u.generic_caption}</p>
                    <p className="text-sm text-foreground/50">
                      {u.filename} · {new Date(u.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {hasCaptions ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <CheckCircle2 className="h-4 w-4" /> Captions ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        <Sparkles className="h-4 w-4" /> Needs captions
                      </span>
                    )}
                    {posted ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <Send className="h-4 w-4" /> Posted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground/50">
                        <Clock className="h-4 w-4" /> Not posted
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  aria-label="Delete post"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground/40 transition hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  {deletingId === u.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
