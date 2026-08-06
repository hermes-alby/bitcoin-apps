import type { HighlightRanges } from "@nozbe/microfuzz";
import type { DiscoverApp } from "../types/discover";
import { captureAppLinkClick } from "../lib/analytics";
import { cn } from "../lib/utils";
import { AppImage, PlatformIcons } from "./platform-icons";
import { Card, CardDescription, CardTitle } from "./ui/card";

interface AppCardProps {
  app: DiscoverApp;
  searchQuery?: string;
  titleRanges?: HighlightRanges;
  descriptionRanges?: HighlightRanges;
}

/** Highlight matching text regions using ranges from microfuzz */
function HighlightedText({ text, ranges }: { text: string; ranges?: HighlightRanges }) {
  if (!ranges || ranges.length === 0) return <>{text}</>;

  // Build segments: highlight ranges vs plain text
  const parts: Array<{ start: number; end: number; highlight: boolean }> = [];
  let pos = 0;
  for (const [rangeStart, rangeEnd] of ranges) {
    if (pos < rangeStart) parts.push({ start: pos, end: rangeStart, highlight: false });
    parts.push({ start: rangeStart, end: rangeEnd + 1, highlight: true });
    pos = rangeEnd + 1;
  }
  if (pos < text.length) parts.push({ start: pos, end: text.length, highlight: false });

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className="bg-[#FFF9BB] font-semibold text-secondary">
            {text.slice(part.start, part.end)}
          </span>
        ) : (
          <span key={i}>{text.slice(part.start, part.end)}</span>
        ),
      )}
    </>
  );
}

export function AppCard({ app, titleRanges, descriptionRanges }: AppCardProps) {
  const surfaceClass = cn(
    "discover-hover-sheen-premium min-h-[240px] rounded-2xl border border-[rgba(228,230,234,0.5)] bg-[linear-gradient(180deg,_#FFFFFF_64.29%,_rgba(228,230,234,0.5)_225.79%)] p-6 shadow-[0px_5px_3px_rgba(0,0,0,0.01),0px_2px_2px_rgba(0,0,0,0.03),0px_1px_1px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:border-[#FFEFB3] hover:bg-[linear-gradient(180deg,_#FFFDEA_-10.32%,_#FFF9BB_50.44%,_#FFE65C_104%,_#FFD500_155.95%)] hover:opacity-95",
  );

  return (
    <Card className={surfaceClass} data-testid={`app-card-${app.title}`}>
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
        onClick={() => captureAppLinkClick(app, "card")}
      >
        <div className="flex flex-col gap-5">
          <div className="flex min-w-0 items-center gap-5">
            <AppImage app={app} className="h-[60px] w-[60px] flex-shrink-0 rounded-lg object-contain" />
            <CardTitle className="discover-line-clamp-1 min-w-0 text-left text-2xl font-medium text-secondary">
              <HighlightedText text={app.title} ranges={titleRanges} />
            </CardTitle>
          </div>
          <CardDescription className="discover-line-clamp-2 h-14 text-left text-lg leading-7 text-tertiary">
            <HighlightedText text={app.description} ranges={descriptionRanges} />
          </CardDescription>
        </div>
        <PlatformIcons app={app} className="mt-auto flex flex-wrap items-center gap-3 pt-4 leading-none" />
      </a>
    </Card>
  );
}
