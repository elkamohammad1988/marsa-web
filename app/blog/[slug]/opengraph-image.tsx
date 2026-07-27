import { ImageResponse } from "next/og";
import { posts, formatPostDate } from "@/lib/blog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * A share card per post, generated at build time.
 *
 * On-page covers are drawn in markup (`components/art/BlogCover.tsx`) — which
 * is right for a reader and useless to a crawler, because Slack, LinkedIn and
 * Google's article rich result all want a bitmap at a URL. This route is that
 * bitmap. `lib/blog.ts#postSocialImage` is the single place its path is
 * written, so the OpenGraph tag, the Twitter tag and `BlogPosting.image` cannot
 * drift from the route that serves it.
 *
 * Every post is enumerated so the cards are static output rather than an
 * on-demand render for a scraper that will not wait.
 */
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export const alt = "Marsa article";

const MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="10" r="3.6" fill="#FFFFFF"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="2.9"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 17.4q7.5 4.4 15 0"/>
      <path d="M6 21.8q10 5.4 20 0" opacity="0.7"/>
    </g>
  </svg>`,
)}`;

export default async function BlogOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  // The headline is the variable-length element, so it gets the size budget:
  // long titles step down rather than overflowing the card.
  const title = post?.title ?? "Marsa";
  const titleSize = title.length > 96 ? 50 : title.length > 64 ? 60 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(900px 520px at 8% -6%, rgba(204,31,134,0.38), transparent 60%), radial-gradient(760px 460px at 92% 10%, rgba(238,79,165,0.20), transparent 60%), linear-gradient(160deg, #14090f 0%, #0c080b 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #EE4FA5, #7A1250)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} width={36} height={36} alt="" />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2 }}>marsa</div>
          {post && (
            <div
              style={{
                display: "flex",
                marginLeft: 8,
                padding: "8px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 22,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#EE4FA5",
              }}
            >
              {post.category}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.8,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div style={{ display: "flex" }}>
            {post ? formatPostDate(post.date) : ""}
          </div>
          <div style={{ display: "flex", color: "#EE4FA5", fontWeight: 600 }}>
            Concept build
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
