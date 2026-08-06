import type { DiscoverApp } from "../types/discover";
import { captureAppLinkClick } from "../lib/analytics";
import { cn } from "../lib/utils";
import { AppImage, PlatformIcons } from "./platform-icons";
import { Card, CardDescription, CardTitle } from "./ui/card";

interface FeaturedCardProps {
  app: DiscoverApp;
}

export function FeaturedCard({ app }: FeaturedCardProps) {
  const surfaceClass = cn(
    "discover-hover-sheen-premium min-h-[250px] items-center rounded-2xl border border-[rgba(228,230,234,0.5)] bg-[linear-gradient(180deg,_#FFFFFF_64.29%,_rgba(228,230,234,0.5)_225.79%)] p-6 text-center shadow-[0px_5px_3px_rgba(0,0,0,0.01),0px_2px_2px_rgba(0,0,0,0.03),0px_1px_1px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:border-[#FFEFB3] hover:bg-[linear-gradient(180deg,_#FFFDEA_-10.32%,_#FFF9BB_50.44%,_#FFE65C_104%,_#FFD500_155.95%)] hover:opacity-95",
  );

  return (
    <Card className={surfaceClass}>
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col items-center"
        onClick={() => captureAppLinkClick(app, "featured_card")}
      >
        <AppImage app={app} className="mb-4 h-20 w-20 rounded-xl object-contain" />
        <CardTitle className="discover-line-clamp-1 mb-3 text-2xl font-medium leading-tight text-secondary">
          {app.title}
        </CardTitle>
        <CardDescription className="discover-line-clamp-2 mb-3 text-base text-tertiary">{app.description}</CardDescription>
        <PlatformIcons app={app} className="mt-auto flex flex-wrap items-center justify-center gap-1.5 pt-6" />
      </a>
    </Card>
  );
}
