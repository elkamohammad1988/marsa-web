import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Home-screen icon for iOS. iOS ignores transparency and rounds the corners
 * itself, so this is drawn edge-to-edge on the rose→plum gradient with the
 * mark scaled up for legibility at 60px.
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
          background: "linear-gradient(135deg, #EE4FA5 0%, #7A1250 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={128}
          height={128}
          alt=""
          src={`data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <circle cx="16" cy="10" r="3.6" fill="#FFFFFF"/>
              <g fill="none" stroke="#FFFFFF" stroke-width="2.6"
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
