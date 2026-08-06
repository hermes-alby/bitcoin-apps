import { describe, expect, it, vi } from "vitest";
import { captureAppLinkClick } from "./analytics";
import posthog from "./posthog";
import type { DiscoverApp } from "../types/discover";

vi.mock("./posthog", () => ({
  default: {
    capture: vi.fn(),
  },
}));

const captureMock = vi.mocked(posthog.capture);

describe("captureAppLinkClick", () => {
  it("captures concise app link click properties", () => {
    const app: DiscoverApp = {
      title: "Alby Hub",
      description: "A self-custodial wallet hub",
      url: "https://albyhub.com/?utm_source=getalby",
      categories: ["wallets"],
      products: ["alby_hub"],
      protocols: ["nwc"],
      platforms: ["web", "desktop"],
    };

    captureAppLinkClick(app, "card");

    expect(captureMock).toHaveBeenCalledWith("app_link_clicked", {
      app_id: "alby-hub",
      app_name: "Alby Hub",
      destination_url: "https://albyhub.com/?utm_source=getalby",
      categories: ["wallets"],
      products: ["alby_hub"],
      protocols: ["nwc"],
      platforms: ["web", "desktop"],
      click_target: "card",
    });
  });
});
