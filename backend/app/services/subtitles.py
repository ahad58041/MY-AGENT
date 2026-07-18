"""Auto video subtitles: transcribe speech and burn captions onto the video.

Pipeline (all local, all free):
1. faster-whisper transcribes the video's audio into timed segments.
2. We write those segments as an .srt file.
3. The ffmpeg bundled by imageio-ffmpeg burns the subtitles onto the video,
   producing a new "<name>_subtitled.mp4" with captions along the bottom.

Model is set by WHISPER_MODEL in .env (default base.en). First run downloads
the model weights (~150 MB for base.en) once, then caches them.
"""

import subprocess
from functools import lru_cache
from pathlib import Path

import imageio_ffmpeg
from faster_whisper import WhisperModel

from app.config import settings

# Bottom-centered, bold white text with a black outline — readable on any video.
_SUBTITLE_STYLE = (
    "FontName=Arial,FontSize=16,Bold=1,PrimaryColour=&H00FFFFFF,"
    "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=30"
)


@lru_cache(maxsize=1)
def _model() -> WhisperModel:
    # int8 on CPU is the fast, low-memory default; fine for short reels.
    return WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")


def _fmt_ts(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _write_srt(segments, srt_path: Path) -> str:
    """Write segments to an .srt file; return the joined transcript text."""
    lines: list[str] = []
    transcript: list[str] = []
    for i, seg in enumerate(segments, start=1):
        text = seg.text.strip()
        if not text:
            continue
        lines.append(str(i))
        lines.append(f"{_fmt_ts(seg.start)} --> {_fmt_ts(seg.end)}")
        lines.append(text)
        lines.append("")
        transcript.append(text)
    srt_path.write_text("\n".join(lines), encoding="utf-8")
    return " ".join(transcript)


def generate_subtitled_video(video_path: str) -> tuple[str, str]:
    """Transcribe + burn subtitles. Returns (subtitled_video_path, transcript).

    Raises FileNotFoundError if the source video is missing, RuntimeError on
    a transcript with no speech or an ffmpeg failure.
    """
    src = Path(video_path)
    if not src.is_file():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # 1. Transcribe (vad_filter drops silence for cleaner timing).
    segments, _info = _model().transcribe(
        str(src), language=settings.subtitle_language, vad_filter=True
    )

    # 2. Write the .srt next to the output so ffmpeg can reference it by basename
    #    (avoids Windows path-escaping issues in the subtitles filter).
    out_dir = src.parent
    srt_path = out_dir / f"{src.stem}.srt"
    transcript = _write_srt(segments, srt_path)
    if not transcript:
        srt_path.unlink(missing_ok=True)
        raise RuntimeError("No speech detected in the video, so there are no subtitles to add.")

    # 3. Burn subtitles onto the video with the bundled ffmpeg.
    out_path = out_dir / f"{src.stem}_subtitled.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg, "-y",
        "-i", str(src),
        "-vf", f"subtitles={srt_path.name}:force_style='{_SUBTITLE_STYLE}'",
        "-c:a", "copy",
        out_path.name,
    ]
    result = subprocess.run(cmd, cwd=out_dir, capture_output=True, text=True)
    srt_path.unlink(missing_ok=True)
    if result.returncode != 0 or not out_path.is_file():
        raise RuntimeError(f"ffmpeg failed to burn subtitles: {result.stderr[-500:]}")

    return str(out_path), transcript
