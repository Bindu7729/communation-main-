import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";

export function ImageLightboxDialog({
  src,
  filename,
  onClose,
}: {
  src: string;
  filename: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="glass w-full max-w-2xl flex items-center justify-between rounded-2xl px-4 py-2 text-foreground border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="truncate text-sm font-medium opacity-90 max-w-[60%]">{filename}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 transition"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 transition"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 transition"
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 transition"
            title="Download original"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-destructive/20 hover:text-destructive transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center Image Container */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto w-full p-4"
        onClick={onClose}
      >
        <img
          src={src}
          alt={filename}
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
          className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>

      {/* Bottom hint */}
      <p className="text-[11px] text-muted-foreground/60 tracking-wider uppercase">
        Click outside or press ESC to close
      </p>
    </div>
  );
}
