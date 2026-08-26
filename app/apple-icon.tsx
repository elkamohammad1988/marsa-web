import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Home-screen icon for iOS. iOS ignores transparency and rounds the corners
 * itself, so this is drawn edge-to-edge on the brand gold with the mark scaled
 * up for legibility at 60px.
 *
 * Flat `#D4AF37`, matching `.logo-tile` and `app/icon.svg`. It was a 135°
 * metallic gradient; all three were flattened together, because a mark drawn
 * three ways in three places is three marks.
 *
 * The mark is `--on-brand` near-black, not white: on a home screen this sits at
 * 60px next to other apps, and a white glyph on this gold (1.6:1) would read as
 * a blank gold square at that size. The near-black clears 9.03:1.
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
          background: "#D4AF37",
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
