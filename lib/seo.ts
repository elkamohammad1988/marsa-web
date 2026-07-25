import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

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
}: BuildMetadataArgs): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = `${title} · ${siteConfig.name}`;
  const images = image
    ? [{ url: image.startsWith("http") ? image : absoluteUrl(image) }]
    : undefined;

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
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: images?.map((i) => i.url),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
