import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { posts } from "@/lib/blog";

/** Static routes with a relative priority/frequency hint for crawlers. */
const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/demo", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/get-started", priority: 0.9, changeFrequency: "monthly" },
  { path: "/business/eu-business-account", priority: 0.8, changeFrequency: "monthly" },
  { path: "/business/multi-currency-iban", priority: 0.8, changeFrequency: "monthly" },
  { path: "/business/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/business/e-commerce-sellers", priority: 0.7, changeFrequency: "monthly" },
  { path: "/personal/multi-currency-iban", priority: 0.8, changeFrequency: "monthly" },
  { path: "/personal/sepa-transfers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/personal/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/solutions/import-export", priority: 0.7, changeFrequency: "monthly" },
  { path: "/solutions/agencies-freelancers", priority: 0.7, changeFrequency: "monthly" },
  { path: "/solutions/company-formation", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/currency-converter", priority: 0.8, changeFrequency: "daily" },
  { path: "/tools/iban-checker", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/fx-calculator", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/sepa-vs-swift", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/company/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/company/compliance", priority: 0.5, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/cookies", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}
