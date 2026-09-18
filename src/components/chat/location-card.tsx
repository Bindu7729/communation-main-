import { MapPin, ExternalLink, Navigation } from "lucide-react";

export function parseLocationText(
  text?: string | null,
): { lat: number; lng: number; url: string; label?: string } | null {
  if (!text) return null;
  // Match patterns:
  // "📍 Location: https://maps.google.com/?q=12.9716,77.5946"
  // "https://maps.google.com/?q=12.9716,77.5946"
  // "https://maps.google.com/?q=12.9716%2C77.5946"
  const match = text.match(/https:\/\/maps\.google\.com\/\?q=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    const label = text
      .replace(/https:\/\/maps\.google\.com\/\?q=[-0-9.,%]+/gi, "")
      .replace(/📍\s*Location:?\s*/gi, "")
      .replace(/\([-0-9.,\s]+\)/g, "")
      .trim();
    return {
      lat,
      lng,
      url,
      label: label || undefined,
    };
  }
  return null;
}

export function LocationCard({
  lat,
  lng,
  url,
  label,
  mine,
}: {
  lat: number;
  lng: number;
  url: string;
  label?: string;
  mine: boolean;
}) {
  return (
    <div className="my-1.5 overflow-hidden rounded-2xl border border-border/40 bg-surface-2/70 max-w-xs shadow-sm">
      <div className="relative h-28 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Stylized radar / map grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at center, rgba(37, 135, 245, 0.25) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-500 shadow-md animate-pulse">
            <MapPin className="h-6 w-6 fill-red-500 text-white" />
          </div>
          <span className="text-[11px] font-mono text-slate-300 font-medium tracking-tight">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between gap-2.5 bg-background/50">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {label || "Shared Location"}
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Navigation className="h-2.5 w-2.5" />
            GPS Coordinates
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1467D8] transition shrink-0"
        >
          <span>Open</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
