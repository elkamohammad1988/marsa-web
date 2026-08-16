import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Home-screen icon for iOS. iOS ignores transparency and rounds the corners
 * itself, so this is drawn edge-to-edge on the gold gradient with the mark
 * scaled up for legibility at 60px.
 *
 * The mark is `--on-brand` near-black, not white: on a home screen this sits at
 * 60px next to other apps, and a white glyph on gold (1.6:1 at the lit end)
 * would read as a blank gold square at that size.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F5D76E 0%, #D4AF37 46%, #A67C00 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={128}
          height={128}
          alt=""
          src={`data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <circle cx="16" cy="10" r="3.6" fill="#0C1114"/>
              <g fill="none" stroke="#0C1114" stroke-width="2.6"
                 stroke-linecap="round" stroke-linejoin="round">
                <path d="M8.5 17.4q7.5 4.4 15 0"/>
                <path d="M6 21.8q10 5.4 20 0" opacity="0.7"/>
              </g>
            </svg>`,
          )}`}
        />
      </div>
    ),
    { ...size },
  );
}
