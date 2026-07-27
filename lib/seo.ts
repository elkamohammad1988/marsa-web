import type { Metadata } from "next";
import { absoluteUrl, siteConfig, socialHandle } from "@/lib/site";

type BuildMetadataArgs = {
  /** Page-specific title (the layout template appends "· Marsa"). */
  title: string;
  description: string;
  /** Path used to build the canonical + OG URL, e.g. "/pricing". */
  path?: string;
  /** OG/Twitter image path, absolute or site-relative. */
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** Article publication date, `YYYY-MM-DD`. Only meaningful for articles. */
  publishedTime?: string;
};

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
  const images = image
    ? [{ url: image.startsWith("http") ? image : absoluteUrl(image) }]
    : undefined;
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
      images: images?.map((i) => i.url),
      // Derived from the configured profile URL rather than hard-coded, so a
      // real handle follows the account without a second place to update.
      ...(handle ? { site: handle, creator: handle } : {}),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
