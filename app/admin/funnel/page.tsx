import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { isAdminRequest } from "@/lib/admin-auth";
import { getAnalyticsStore, type FunnelReport } from "@/lib/analytics";
import { FunnelView } from "@/components/admin/FunnelView";

export const dynamic = "force-dynamic";

const EMPTY: FunnelReport = {
  starts: 0,
  completions: 0,
  completionRate: 0,
  biggestDrop: null,
  rows: [],
};

export default async function AdminFunnelPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const store = getAnalyticsStore();
  let report = EMPTY;
  let error: string | null = null;
  try {
    report = await store.funnel();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not read demo analytics.";
  }

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading level="h1" size="panel">
          Demo funnel
        </Heading>
        <Button href="/admin" variant="outline" size="sm">
          ← Submissions
        </Button>
      </div>
      {error ? (
        <p className="mt-6 rounded-card border border-line bg-card p-5 text-sm text-danger">{error}</p>
      ) : (
        <FunnelView report={report} provider={store.provider} />
      )}
    </Container>
  );
}
