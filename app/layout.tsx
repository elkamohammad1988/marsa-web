import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ConceptBadge } from "@/components/layout/ConceptBadge";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site";
import { organizationSchema, websiteSchema } from "@/lib/schema";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Marsa — Where Your Money Lands",
    template: "%s · Marsa",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_GB",
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * One colour, unconditionally. The site is dark-only, so browser UI should not
 * be told to expect anything else — the previous two-entry array named the same
 * `#0c080b` under both `prefers-color-scheme` media queries.
 */
export const viewport: Viewport = {
  themeColor: "#0c080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-canvas antialiased">
        {/* Atmosphere: a fixed, subtle magenta glow behind all content. */}
        <div aria-hidden className="atmosphere-layer" />
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-brand focus:shadow-card"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
        {/* Present on every route: this site presents as a regulated
            institution and is not one. See the component for why it is a
            disclosure rather than a banner or an interstitial. */}
        <ConceptBadge />
      </body>
    </html>
  );
}
