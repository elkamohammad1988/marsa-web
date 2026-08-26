import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { isAuthConfigured } from "@/lib/auth-config";
import { Footer } from "@/components/layout/Footer";
import { HydrationSignal } from "@/components/layout/HydrationSignal";
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
    default: "Marsa, where your money lands",
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
 * value under both `prefers-color-scheme` media queries.
 *
 * `#0b1216` is `--canvas`. It has to be restated as a literal here because this
 * is consumed by the browser chrome before any stylesheet exists, which is also
 * why it is the one place a palette change has to be made twice.
 */
export const viewport: Viewport = {
  themeColor: "#0b1216",
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
        <HydrationSignal />
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-brand focus:shadow-e1"
        >
          Skip to main content
        </a>
        <Navbar authConfigured={isAuthConfigured()} />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
