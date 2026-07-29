import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

const popular = [
  { label: "Pricing", href: "/pricing" },
  { label: "Currency Converter", href: "/tools/currency-converter" },
  { label: "Open an Account", href: "/get-started" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function NotFound() {
  return (
    <section className="bg-surface-alt py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Error 404
          </p>
          <h1 className="mt-4 text-display-sm font-bold text-ink">This page went missing</h1>
          <p className="mt-4 text-base text-ink-muted">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you
            back on track.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/" variant="primary" size="lg">
              Back to home
            </Button>
            {/* Not "Contact support". There is no support team and the contact
                form reaches nobody, so offering it from an error state is the
                one place the promise would actually be relied on. The demo is a
                real destination that works, which is what a 404 should offer. */}
            <Button href="/demo" variant="outline" size="lg">
              Try the demo
            </Button>
          </div>
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Popular pages
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {popular.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="inline-flex rounded-full bg-card px-4 py-2 text-sm font-medium text-ink shadow-card hover:text-brand-strong"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
