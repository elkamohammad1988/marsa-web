import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { Badge } from "@/components/ui/Badge";
import { GetStartedForm } from "@/components/forms/GetStartedForm";
import { buildMetadata } from "@/lib/seo";
import { plans, businessPlans } from "@/lib/pricing";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/validation";
import { isAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = buildMetadata({
  title: "Open an account",
  description:
    "The onboarding form for Marsa, a concept build. It runs the real validation rules, then shows what the intake pipeline behind it would do with an application.",
  path: "/get-started",
});

const planName = new Map(
  [...plans, ...businessPlans].map((p) => [p.id, p.name] as const),
);

const benefits = [
  "Free EU multi-currency IBAN",
  "SEPA transfers with no hidden fees",
  "Hold & convert 30+ currencies",
  "Balances safeguarded at licensed partner institutions",
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
  const authOn = isAuthConfigured();

  return (
    <section className="bg-surface-alt py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
          <div className="lg:pt-4">
            <Badge tone="ink">Concept build</Badge>
            <h1 className="mt-4 text-display-sm font-bold text-ink">
              Open a Marsa account
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-muted">
              This is the onboarding form for a product that does not exist. It runs the same
              validation rules the production intake uses, then shows you what the pipeline
              behind it would do with a real application.
            </p>
            <p className="mt-3 max-w-md text-sm text-ink-subtle">
              Looking for the sign-in system? That is a different part of the build at{" "}
              <Link
                href="/register"
                className="font-medium text-brand-strong underline decoration-brand-strong/40 underline-offset-4 hover:decoration-brand-strong"
              >
                /register
              </Link>
              {authOn
                ? " — Supabase Auth with Postgres row-level security, and it is switched on here."
                : " — Supabase Auth with Postgres row-level security, written and tested in the repository and switched off in this deployment."}
            </p>
            {selectedPlan && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-ink shadow-card">
                Selected plan: <span className="text-brand-strong">{selectedPlan}</span>
              </p>
            )}
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
              What the account would include
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
