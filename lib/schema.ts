import { absoluteUrl, siteConfig } from "@/lib/site";
import { postSocialImage, type BlogPost } from "@/lib/blog";

export function organizationSchema() {
  const sameAs = [
    siteConfig.social.x,
    siteConfig.social.youtube,
    siteConfig.social.linkedin,
  ].filter(Boolean);

  /**
   * One entry per address that is actually configured — and nothing at all when
   * none is.
   *
   * This block is what a knowledge panel reads, so an organisation claiming a
   * support channel it does not staff is worse than one claiming none. The
   * earlier version listed customer-support and sales unconditionally, which
   * against the current defaults would have published two `ContactPoint` nodes
   * whose `email` was the empty string.
   */
  const contactPoint = [
    { contactType: "customer support", email: siteConfig.email.support },
    { contactType: "sales", email: siteConfig.email.sales },
  ]
    .filter((c) => c.email)
    .map((c) => ({ "@type": "ContactPoint", ...c, availableLanguage: ["English"] }));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/icon.svg"),
    description: siteConfig.description,
    // Emitted only when configured. `sameAs` is a machine-readable claim to
    // own a profile, and `email` an invitation to write to a mailbox — both
    // previously defaulted to a domain nobody holds.
    ...(siteConfig.email.support ? { email: siteConfig.email.support } : {}),
    ...(contactPoint.length ? { contactPoint } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/**
 * A `BreadcrumbList` for a trail that may include labels which are not pages.
 *
 * The site's visual breadcrumbs contain grouping labels — "Business",
 * "Legal" — that no route serves. Schema.org requires `item` on every entry
 * except the last, so emitting those as list elements produces a breadcrumb
 * claiming URLs that do not exist. They are dropped from the structured data
 * and left in the visual trail, where they are doing a different job.
 *
 * The final entry keeps its name with no `item`, which is the documented way
 * to say "and this is the page you are on".
 */
export function breadcrumbSchema(items: { name: string; path?: string }[]) {
  const listed = items.filter((item, i) => item.path || i === items.length - 1);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: listed.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function blogPostingSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    // The generated share card, not the on-page cover. The cover is drawn in
    // markup, which a crawler fetching an image URL cannot render.
    image: absoluteUrl(postSocialImage(post.slug)),
    datePublished: post.date,
    /**
     * Equal to `datePublished` because nothing here has been revised since it
     * was written. Google treats a missing `dateModified` as unknown and a
     * *fabricated* one as a freshness signal, so the honest value is the
     * publication date rather than the build time — which would tell every
     * crawl that all six posts were rewritten this morning.
     */
    dateModified: post.date,
    articleSection: post.category,
    url: absoluteUrl(`/blog/${post.slug}`),
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
    },
  };
}
