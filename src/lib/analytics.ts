import posthog from "./posthog";
import type { DiscoverApp } from "../types/discover";

export type AppLinkClickTarget = "card" | "featured_card";

function appId(app: DiscoverApp) {
  return app.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function captureAppLinkClick(app: DiscoverApp, clickTarget: AppLinkClickTarget) {
  posthog.capture("app_link_clicked", {
    app_id: appId(app),
    app_name: app.title,
    destination_url: app.url,
    categories: app.categories,
    products: app.products,
    protocols: app.protocols,
    platforms: app.platforms,
    click_target: clickTarget,
  });
}
