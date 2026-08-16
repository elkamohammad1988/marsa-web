import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Web app manifest.
 *
 * Modest but real: it is what lets a visitor add the site to a home screen
 * with the right name, mark, and background rather than a screenshot and a
 * URL — and on a site whose whole argument is that it looks like a shipped
 * financial product, the browser's own "add to home screen" is one of the
 * places that argument is either made or lost.
 *
 * `display: "browser"` deliberately. A standalone window would hide the
 * address bar, and hiding the address bar on something that presents as a bank
 * is the wrong instinct: it removes the one piece of chrome a visitor can use
 * to check they are where they think they are.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "browser",
    /* `--canvas`, restated as a literal: the OS reads these before the app
       has a stylesheet. Keep in step with `viewport.themeColor` in layout.tsx. */
    background_color: "#0b1216",
    theme_color: "#0b1216",
    lang: "en-GB",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/icon.svg",
        // Vector: one entry covers every size a launcher asks for.
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
