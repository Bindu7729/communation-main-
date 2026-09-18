import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Download,
  FileText,
  FileArchive,
  File,
  Film,
  Loader2,
} from "lucide-react";
import type { Attachment } from "@/lib/domain/types";
import { ImageLightboxDialog } from "./image-lightbox-dialog";

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function AttachmentRenderer({
  attachments,
  mine,
  fetchAccessUrl,
}: {
  attachments?: Attachment[];
  mine: boolean;
  fetchAccessUrl: (args: { data: { attachment_id: string } }) => Promise<{ url: string; expires_in: number }>;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; filename: string } | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 my-1 max-w-full">
      {attachments.map((att) => (
        <AttachmentItem
          key={att.id}
          attachment={att}
          mine={mine}
          fetchAccessUrl={fetchAccessUrl}
          onOpenImage={(src, filename) => setLightbox({ src, filename })}
        />
      ))}

      {lightbox && (
        <ImageLightboxDialog
          src={lightbox.src}
          filename={lightbox.filename}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function AttachmentItem({
  attachment,
  mine,
  fetchAccessUrl,
  onOpenImage,
}: {
  attachment: Attachment;
  mine: boolean;
  fetchAccessUrl: (args: { data: { attachment_id: string } }) => Promise<{ url: string; expires_in: number }>;
  onOpenImage: (src: string, filename: string) => void;
}) {
  const query = useQuery({
    queryKey: ["attachment-url", attachment.id],
    queryFn: async () => {
      if (
        attachment.storage_path &&
        (attachment.storage_path.startsWith("data:") ||
          attachment.storage_path.startsWith("blob:") ||
          attachment.storage_path.startsWith("http:") ||
          attachment.storage_path.startsWith("https:"))
      ) {
        return { url: attachment.storage_path, expires_in: 3600 };
      }
      return fetchAccessUrl({ data: { attachment_id: attachment.id } });
    },
    staleTime: 4 * 60 * 1000, // 4 minutes (presigned URLs expire in 5 min)
  });

  const url = query.data?.url;
  const mime = attachment.mime_type.toLowerCase();

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-foreground/5 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading attachment…</span>
      </div>
    );
  }

  if (query.isError || !url) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <File className="h-4 w-4 opacity-70" />
        <span className="truncate">{attachment.original_filename} (Unavailable)</span>
      </div>
    );
  }

  // 1. Image
  if (mime.startsWith("image/")) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-border/40 max-w-sm">
        <img
          src={url}
          alt={attachment.original_filename}
          loading="lazy"
          onClick={() => onOpenImage(url, attachment.original_filename)}
          className="max-h-64 w-auto rounded-xl object-cover cursor-pointer hover:opacity-95 transition-transform duration-200 group-hover:scale-[1.01]"
        />
      </div>
    );
  }

  // 2. Audio / Voice Note
  if (mime.startsWith("audio/")) {
    return <AudioAttachmentPlayer url={url} filename={attachment.original_filename} mine={mine} />;
  }

  // 3. Video
  if (mime.startsWith("video/")) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/40 max-w-sm">
        <video
          src={url}
          controls
          preload="metadata"
          className="max-h-64 w-full rounded-xl bg-black/40"
        />
      </div>
    );
  }

  // 4. Document / Generic File
  const isZip = mime.includes("zip") || mime.includes("compressed");
  const isPdf = mime.includes("pdf");
  const FileIcon = isZip ? FileArchive : isPdf ? FileText : File;

  return (
    <a
      href={url}
      download={attachment.original_filename}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "flex items-center gap-3 rounded-xl border p-2.5 transition text-left max-w-xs group",
        mine
          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "border-border bg-foreground/5 hover:bg-foreground/10",
      ].join(" ")}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <FileIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{attachment.original_filename}</p>
        <p className="text-[10px] opacity-70">{formatFileSize(attachment.file_size)}</p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 transition" />
    </a>
  );
}

function AudioAttachmentPlayer({
  url,
  filename,
  mine,
}: {
  url: string;
  filename: string;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(console.error);
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={[
        "flex items-center gap-2.5 rounded-2xl border px-3 py-2 min-w-[220px] max-w-xs select-none",
        mine
          ? "border-primary-foreground/25 bg-primary-foreground/10"
          : "border-border bg-foreground/5",
      ].join(" ")}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs hover:scale-105 active:scale-95 transition"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="truncate text-[11px] font-medium opacity-80">{filename}</p>
        <div
          className="relative mt-1 h-1.5 w-full rounded-full bg-foreground/15 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = clickPos * duration;
            }
          }}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] opacity-60">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
