import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, Loader2, Check, Copy, RefreshCw, ArrowLeft, Captions as CaptionsIcon, Download } from "lucide-react";
import { api } from "../lib/api";
import type { Captions, Upload } from "../lib/types";
import PublishPanel from "../components/PublishPanel";

// Per-platform display config + soft character targets (hooks/limits).
const FIELDS: { key: keyof Captions; label: string; accent: string; limit: number }[] = [
  { key: "instagram", label: "Instagram Reels", accent: "#E11D48", limit: 2200 },
  { key: "linkedin", label: "LinkedIn", accent: "#0A66C2", limit: 3000 },
  { key: "youtube_title", label: "YouTube — Title", accent: "#FF0000", limit: 100 },
  { key: "youtube_description", label: "YouTube — Description", accent: "#FF0000", limit: 5000 },
  { key: "facebook", label: "Facebook", accent: "#1877F2", limit: 63000 },
];

export default function ReviewPage() {
  const { id } = useParams();
  const uploadId = Number(id);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [captions, setCaptions] = useState<Captions>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [subGenerating, setSubGenerating] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUpload(uploadId)
      .then((u) => {
        setUpload(u);
        setCaptions(u.captions ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uploadId]);

  const hasCaptions = Object.keys(captions).length > 0;

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const u = await api.generateCaptions(uploadId);
      setUpload(u);
      setCaptions(u.captions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.saveCaptions(uploadId, captions);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function makeSubtitles() {
    setSubGenerating(true);
    setSubError(null);
    try {
      const u = await api.generateSubtitles(uploadId);
      setUpload(u);
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Subtitle generation failed");
    } finally {
      setSubGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-foreground/60">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!upload) {
    return <p className="text-destructive">{error ?? "Upload not found."}</p>;
  }

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Review captions</h1>
      <p className="mt-1 text-foreground/60">
        From your caption: <span className="italic">"{upload.generic_caption}"</span>
      </p>

      {/* Video preview */}
      <div className="mt-6 flex justify-center">
        <video
          src={upload.subtitled_path ? api.subtitledVideoUrl(upload.id) : api.videoUrl(upload.id)}
          controls
          className="max-h-96 w-auto rounded-2xl border border-border bg-black shadow-sm"
        />
      </div>

      {/* On-screen subtitles */}
      <div className="card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CaptionsIcon className="h-5 w-5 text-accent" />
            <span className="font-bold">On-screen subtitles</span>
            {upload.subtitled_path && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <Check className="h-3.5 w-3.5" /> Added
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {upload.subtitled_path && (
              <a href={api.subtitledVideoUrl(upload.id)} download className="btn-accent px-4 py-2 text-sm">
                <Download className="h-4 w-4" /> Download
              </a>
            )}
            <button onClick={makeSubtitles} disabled={subGenerating} className="btn-primary px-4 py-2 text-sm">
              {subGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Transcribing…
                </>
              ) : (
                <>
                  <CaptionsIcon className="h-4 w-4" /> {upload.subtitled_path ? "Regenerate" : "Generate subtitles"}
                </>
              )}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-foreground/50">
          Transcribes the spoken audio and burns captions along the bottom of the video. First run
          downloads the speech model (one-time), so it takes a bit longer.
        </p>
        {subError && (
          <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {subError}
          </div>
        )}
        {upload.transcript && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-foreground/70">
            <span className="font-semibold">Transcript:</span> {upload.transcript}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {!hasCaptions ? (
        <div className="card mt-8 flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="h-7 w-7" />
          </span>
          <p className="max-w-md text-foreground/70">
            Generate platform-native captions for Instagram, LinkedIn, YouTube Shorts, and Facebook —
            each with the right tone, length, and hashtags.
          </p>
          <button onClick={generate} disabled={generating} className="btn-accent">
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Writing captions…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Generate captions
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {FIELDS.map(({ key, label, accent, limit }) => {
            const value = captions[key] ?? "";
            const over = value.length > limit;
            return (
              <div key={key} className="card">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
                    {label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${over ? "text-destructive" : "text-foreground/40"}`}>
                      {value.length}/{limit}
                    </span>
                    <button
                      onClick={() => copy(key as string, value)}
                      className="flex items-center gap-1 text-xs font-semibold text-foreground/60 hover:text-foreground cursor-pointer"
                    >
                      {copied === key ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {copied === key ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={key === "youtube_title" ? 2 : 5}
                  value={value}
                  onChange={(e) => setCaptions((c) => ({ ...c, [key]: e.target.value }))}
                  className="field resize-y text-sm"
                />
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {savedAt ? "Saved!" : "Save captions"}
            </button>
            <button onClick={generate} disabled={generating} className="btn-accent">
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              Regenerate
            </button>
          </div>
        </div>
      )}

      <PublishPanel
        uploadId={upload.id}
        onPublished={(status) => setUpload((u) => (u ? { ...u, publish_status: status } : u))}
      />
    </div>
  );
}
