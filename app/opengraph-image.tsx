import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "Marsa multi-currency accounts for cross-border business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default branded social-share card, generated at build time. Individual pages
 * inherit this unless they set their own openGraph image.
 *
 * The mark is embedded as a data-URI SVG rather than inline JSX: satori (the
 * renderer behind ImageResponse) handles `<img>` reliably, arbitrary inline
 * SVG less so.
 */
const MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="10" r="3.6" fill="#0C1114"/>
    <g fill="none" stroke="#0C1114" stroke-width="2.9"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 17.4q7.5 4.4 15 0"/>
      <path d="M6 21.8q10 5.4 20 0" opacity="0.7"/>
    </g>
  </svg>`,
)}`;

export default function OpengraphImage() {
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
          background: "#05090B",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#D4AF37",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} width={44} height={44} alt="" />
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1.5 }}>marsa</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            <div style={{ display: "flex" }}>One account for every</div>
            <div style={{ display: "flex", color: "#E8C95A" }}>currency you get paid in.</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 860,
            }}
          >
            Multi-currency IBAN accounts, free SEPA transfers, and interbank FX for people and
            businesses moving money across borders.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <span>Concept build</span>
            <span>·</span>
            <span>30+ currencies</span>
            <span>·</span>
            <span>SEPA &amp; SWIFT</span>
          </div>
          <div style={{ color: "#E8C95A", fontWeight: 600 }}>
            {siteConfig.url.replace("https://www.", "").replace("https://", "")}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
