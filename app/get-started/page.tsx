import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { Badge } from "@/components/ui/Badge";
import { GetStartedForm } from "@/components/forms/GetStartedForm";
import { buildMetadata } from "@/lib/seo";
import { plans, businessPlans } from "@/lib/pricing";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/validation";

export const metadata: Metadata = buildMetadata({
  title: "Open your account",
  description:
    "Open a free Marsa multi-currency account in minutes. Personal and business IBANs, SEPA transfers, and global FX — fully online.",
  path: "/get-started",
});

const planName = new Map(
  [...plans, ...businessPlans].map((p) => [p.id, p.name] as const),
);

const benefits = [
  "Free EU multi-currency IBAN",
  "SEPA transfers with no hidden fees",
  "Hold & convert 30+ currencies",
  "Bank-grade security & safeguarded funds",
  "No minimum deposit, no credit check",
  "Set up in about 5 minutes",
];

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; plan?: string }>;
}) {
  const { type, plan } = await searchParams;
  const defaultType: AccountType = ACCOUNT_TYPES.includes(type as AccountType)
    ? (type as AccountType)
    : "personal";
  const selectedPlan = plan && planName.has(plan) ? planName.get(plan) : undefined;

  return (
    <section className="bg-surface-alt py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
          <div className="lg:pt-4">
            <Badge tone="ink">Open an account</Badge>
            <h1 className="mt-4 text-display-sm font-bold text-ink">
              Money without borders, in a few minutes
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-muted">
              Create your free Marsa account. We&apos;ll verify your identity and issue your
              multi-currency IBAN so you can send, receive, and convert straight away.
            </p>
            {selectedPlan && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-ink shadow-card">
                Selected plan: <span className="text-brand-strong">{selectedPlan}</span>
              </p>
            )}
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <CheckBullet key={b} tone="brand">
                  {b}
                </CheckBullet>
              ))}
            </ul>
          </div>

          <GetStartedForm defaultType={defaultType} defaultPlan={plan} />
        </div>
      </Container>
    </section>
  );
}
