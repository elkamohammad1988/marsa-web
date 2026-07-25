import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { isAdminRequest, safeEqual } from "@/lib/admin-auth";
import { getAnalyticsStore } from "@/lib/analytics";
import { rateLimitShared, clientKey } from "@/lib/rate-limit";
import { STATS_RATE_LIMIT } from "@/lib/api-rate-limit";
import { FunnelView } from "@/components/admin/FunnelView";

export const dynamic = "force-dynamic";

// Never indexed — this is private business telemetry.
export const metadata: Metadata = {
  title: "Demo funnel",
  robots: { index: false, follow: false, nocache: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * /demo/stats — the demo funnel, gated two ways:
 *   • a valid admin session (same as /admin/funnel), OR
 *   • a shared link token: /demo/stats?token=<DEMO_STATS_TOKEN>.
 * Without either it 404s (indistinguishable from a missing page), and the
 * token compare is constant-time. If DEMO_STATS_TOKEN is unset, only admins
 * can view it.
 *
 * The compare being constant-time stopped timing analysis but not volume:
 * there was no limit on how many tokens a caller could try (audit S4). The
 * limiter below runs before any credential is examined, and exhausting it
 * produces the same 404 as a wrong token, so it reveals nothing new about
 * whether the page or the token exists.
 */
export default async function DemoStatsPage({ searchParams }: { searchParams: SearchParams }) {
  const attempts = await rateLimitShared(
    clientKey(await headers(), "demo-stats"),
    STATS_RATE_LIMIT,
  );
  if (!attempts.ok) notFound();

  const params = await searchParams;
  const provided = (Array.isArray(params.token) ? params.token[0] : params.token) ?? "";
  const expected = process.env.DEMO_STATS_TOKEN ?? "";

  const tokenOk = expected.length > 0 && provided.length > 0 && safeEqual(provided, expected);
  const authed = tokenOk || (await isAdminRequest());
  if (!authed) notFound();

  const store = getAnalyticsStore();
  let report;
  try {
    report = await store.funnel();
  } catch {
    report = { starts: 0, completions: 0, completionRate: 0, biggestDrop: null, rows: [] };
  }

  return (
    <div className="bg-surface-cream py-12 md:py-16">
      <Container>
        <Heading level="h3">Demo funnel</Heading>
        <FunnelView report={report} provider={store.provider} />
      </Container>
    </div>
  );
}
