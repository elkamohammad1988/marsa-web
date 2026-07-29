import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // Belt and braces alongside robots.ts: the admin area must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface-alt-2 py-10 md:py-14">{children}</div>;
}
