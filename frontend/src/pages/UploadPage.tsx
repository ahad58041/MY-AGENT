import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Film, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";

const ACCEPT = ".mp4,.mov,.m4v,.webm";

export default function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [context, setContext] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !caption.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const upload = await api.createUpload(file, caption.trim(), context.trim() || undefined);
      navigate(`/review/${upload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">New Post</h1>
      <p className="mt-1 text-foreground/60">
        Upload one video and a rough caption. The AI writes a native caption for every platform.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
        {/* Dropzone */}
        {!file ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition ${
              dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </span>
            <span className="font-semibold">Drag & drop your video here</span>
            <span className="text-sm text-foreground/50">or click to browse — MP4, MOV, WEBM</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="card flex items-center gap-4">
            {previewUrl && (
              <video src={previewUrl} className="h-28 w-20 rounded-xl bg-black object-cover" muted />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <Film className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{file.name}</span>
              </div>
              <p className="text-sm text-foreground/50">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove video"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground/50 transition hover:bg-muted hover:text-destructive cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Generic caption */}
        <div className="grid gap-2">
          <label htmlFor="caption" className="font-semibold">
            Generic caption <span className="text-destructive">*</span>
          </label>
          <textarea
            id="caption"
            required
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. My 5am morning routine that actually changed my productivity"
            className="field resize-y"
          />
          <p className="text-sm text-foreground/50">
            Write it however you like — the AI adapts tone, length, and hashtags per platform.
          </p>
        </div>

        {/* Optional context */}
        <div className="grid gap-2">
          <label htmlFor="context" className="font-semibold">
            Extra context <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. target audience: busy professionals; call to action: follow for more"
            className="field"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        <div>
          <button type="submit" disabled={!file || !caption.trim() || submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                Upload & generate captions
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
