import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { ScrollRegion } from "@/components/ui/ScrollRegion";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  getStore,
  isSubmissionKind,
  SUBMISSION_KINDS,
  type StoredSubmission,
  type SubmissionKind,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const KIND_LABELS: Record<SubmissionKind, string> = {
  lead: "Account leads",
  contact: "Contact enquiries",
  subscribe: "Newsletter",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 0) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

/** Pull the most useful identity fields out of a submission for the table. */
function summarise(submission: StoredSubmission): { title: string; detail: string } {
  const data = submission.data as Record<string, unknown>;
  const pick = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
  const title = pick("name") || pick("company") || pick("email") || "—";
  const detail = [pick("email"), pick("topic") || pick("accountType"), pick("country")]
    .filter(Boolean)
    .join(" · ");
  return { title, detail };
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const params = await searchParams;
  const kindParam = firstValue(params.kind);
  const kind = isSubmissionKind(kindParam) ? kindParam : undefined;
  const q = firstValue(params.q).trim();
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  const store = getStore();

  let items: StoredSubmission[] = [];
  let total = 0;
  let stats = { total: 0, byKind: { lead: 0, contact: 0, subscribe: 0 }, last7Days: 0 };
  let error: string | null = null;

  try {
    const [page1, statistics] = await Promise.all([
      store.list({ kind, q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      store.stats(),
    ]);
    items = page1.items;
    total = page1.total;
    stats = statistics;
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not read submissions.";
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportHref = `/api/admin/export${buildQuery({ kind, q })}`;

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading level="h1" size="panel">
            Submissions
          </Heading>
          <p className="mt-1 text-sm text-ink-muted">
            Storage:{" "}
            <span className="font-medium text-ink">{store.provider}</span>
            {store.durable ? (
              <span className="ml-2 rounded-full bg-success/[0.12] px-2 py-0.5 text-xs font-medium text-success">
                durable
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-accent/[0.14] px-2 py-0.5 text-xs font-medium text-ink">
                local files — set SUPABASE_URL to persist
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/admin/funnel" variant="outline" size="sm">
            Demo funnel
          </Button>
          <Button href={exportHref} variant="outline" size="sm">
            Export CSV
          </Button>
          <form action="/api/admin/logout" method="post">
            <Button type="submit" variant="ghost-pill" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Last 7 days", value: stats.last7Days },
          { label: KIND_LABELS.lead, value: stats.byKind.lead },
          { label: KIND_LABELS.contact, value: stats.byKind.contact },
        ].map((card) => (
          <div key={card.label} className="rounded-card border border-line bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">{card.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-ink">{card.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin${buildQuery({ q })}`}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            kind ? "border-line text-ink-muted hover:text-ink" : "border-brand bg-brand/[0.08] text-ink",
          )}
        >
          All
        </Link>
        {SUBMISSION_KINDS.map((k) => (
          <Link
            key={k}
            href={`/admin${buildQuery({ kind: k, q })}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              kind === k
                ? "border-brand bg-brand/[0.08] text-ink"
                : "border-line text-ink-muted hover:text-ink",
            )}
          >
            {KIND_LABELS[k]}
            <span className="ml-1.5 text-xs text-ink-subtle">{stats.byKind[k]}</span>
          </Link>
        ))}

        <form action="/admin" method="get" className="ml-auto flex items-center gap-2">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, email…"
            aria-label="Search submissions"
            className="h-9 w-56 rounded-full border border-line bg-canvas px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {error ? (
        <p className="mt-6 rounded-card border border-line bg-card p-5 text-sm text-danger">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-card border border-line bg-card p-8 text-center text-sm text-ink-muted">
          No submissions{q ? ` matching “${q}”` : ""} yet.
        </p>
      ) : (
        <ScrollRegion
          label="Form submissions table"
          className="mt-6 rounded-card border border-line bg-card"
        >
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">When</th>
                <th scope="col" className="px-4 py-3 font-medium">Kind</th>
                <th scope="col" className="px-4 py-3 font-medium">Who</th>
                <th scope="col" className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const { title, detail } = summarise(item);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {formatWhen(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-xs font-medium text-ink-muted">
                        {item.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{title}</span>
                      {detail && <span className="block text-xs text-ink-subtle">{detail}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <details>
                        <summary className="cursor-pointer text-xs text-brand-strong">
                          View payload
                        </summary>
                        <pre className="mt-2 max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-ink/[0.04] p-3 font-mono text-[11px] leading-relaxed">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-ink-subtle">
            Page {page} of {pages} · {total} records
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin${buildQuery({ kind, q, page: page - 1 })}`}
                className="rounded-full border border-line px-3 py-1.5 hover:bg-ink/5"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={`/admin${buildQuery({ kind, q, page: page + 1 })}`}
                className="rounded-full border border-line px-3 py-1.5 hover:bg-ink/5"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </Container>
  );
}
