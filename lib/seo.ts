import type { Metadata } from "next";
import { absoluteUrl, siteConfig, socialHandle } from "@/lib/site";

type BuildMetadataArgs = {
  /** Page-specific title (the layout template appends "· Marsa"). */
  title: string;
  description: string;
  /** Path used to build the canonical + OG URL, e.g. "/pricing". */
  path?: string;
  /**
   * OG/Twitter image path, absolute or site-relative.
   *
   * Defaults to the site card rather than to nothing — see `SITE_SOCIAL_IMAGE`.
   * Pass a path to override it; a blog post passes its own generated card.
   */
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** Article publication date, `YYYY-MM-DD`. Only meaningful for articles. */
  publishedTime?: string;
};

/**
 * The share card every page falls back to: the one `app/opengraph-image.tsx`
 * generates at build time.
 *
 * It has to be named here rather than left to Next.js, and the reason is a
 * behaviour that is easy to assume the other way round. The
 * `opengraph-image.tsx` file convention applies to **its own route segment**,
 * not to the segments below it. `app/opengraph-image.tsx` therefore covered
 * `/` and nothing else, and `app/blog/[slug]/opengraph-image.tsx` covered the
 * posts — which passed a path here explicitly and so were never relying on the
 * convention anyway.
 *
 * Every other route — `/demo`, `/pricing`, all four tools, all ten marketing
 * pages, the legal set — set `images: undefined` and shipped **no `og:image`
 * at all**, while still declaring `twitter:card: summary_large_image`. That
 * pairing is the worst of the three available outcomes: it promises a
 * full-bleed image card and hands the scraper nothing, so a shared link
 * renders as a bare strip of text. `/demo` is the page this project most wants
 * shared and it was one of them.
 */
const SITE_SOCIAL_IMAGE = "/opengraph-image";

/**
 * Centralised metadata builder: guarantees every page ships a canonical URL,
 * OpenGraph, and Twitter card tags derived from a single source of truth.
 */
export function buildMetadata({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noindex,
  publishedTime,
}: BuildMetadataArgs): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = `${title} · ${siteConfig.name}`;
  const source = image ?? SITE_SOCIAL_IMAGE;
  const images = [{ url: source.startsWith("http") ? source : absoluteUrl(source) }];
  const handle = socialHandle();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: siteConfig.name,
      type,
      locale: "en_GB",
      images,
      // `article:published_time` is what a share card and a reader-mode
      // heuristic use to date a post. Only ever set for an article, because on
      // a marketing page it would be a publication date for something that was
      // never published.
      ...(type === "article" && publishedTime
        ? { publishedTime: `${publishedTime}T00:00:00.000Z` }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: images.map((i) => i.url),
      // Derived from the configured profile URL rather than hard-coded, so a
      // real handle follows the account without a second place to update.
      ...(handle ? { site: handle, creator: handle } : {}),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
