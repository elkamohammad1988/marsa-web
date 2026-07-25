import { Container } from "@/components/ui/Container";

/**
 * A quiet trust strip listing the real networks and standards the product
 * integrates with. Everything here is factual (no invented partner logos):
 * these are the payment rails and schemes referenced across the site.
 */
const RAILS = [
  "Safeguarded Funds",
  "Mastercard",
  "SEPA",
  "SWIFT",
  "Apple Pay",
  "Google Pay",
  "IBAN",
  "3-D Secure",
];

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-canvas py-6">
      <Container>
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Built on the networks and standards you already trust
        </p>
        <div
          className="group relative mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
        >
          <ul className="flex w-max animate-marquee items-center gap-x-10 pr-10 group-hover:[animation-play-state:paused]">
            {[...RAILS, ...RAILS].map((label, i) => (
              <li
                key={`${label}-${i}`}
                className="whitespace-nowrap text-sm font-semibold tracking-tight text-ink-muted"
                aria-hidden={i >= RAILS.length}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
