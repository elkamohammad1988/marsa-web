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
  MISSING_DB_CONFIG_MESSAGE,
  SUBMISSION_KINDS,
  type StoredSubmission,
  type SubmissionKind,
  type SubmissionStore,
} from "@/lib/storage";
import { captureException } from "@/lib/observability";
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

  let items: StoredSubmission[] = [];
  let total = 0;
  let stats = { total: 0, byKind: { lead: 0, contact: 0, subscribe: 0 }, last7Days: 0 };
  let error: string | null = null;

  /*
   * `getStore()` throws `StorageConfigError` in production when no database is
   * configured, and this call used to sit outside the try below — so on a
   * deployment without `SUPABASE_URL` the whole page threw. What the operator
   * actually got was the root error boundary: "We hit an unexpected error …
   * trying again usually resolves it", over a reference number. Every part of
   * that is wrong here. It is not unexpected — it is the one misconfiguration
   * the store is written to refuse loudly — and trying again will never
   * resolve it. Worse, `MISSING_DB_CONFIG_MESSAGE` already says exactly which
   * two variables to set, and the operator was the one person who would never
   * see it.
   *
   * Showing configuration detail here is the opposite call from the one
   * `AuthUnavailableNotice` makes, and deliberately so. That panel is on a
   * public sign-in page where the reader cannot act on a variable name; this
   * page is behind the admin password, where the reader is the only person who
   * can. Naming variables is not a leak — it names no value, and the shape of
   * the environment is already in `.env.example` in a public repository.
   */
  let store: SubmissionStore | null = null;
  try {
    store = getStore();
  } catch (err) {
    captureException(err, { event: "admin.storage.unconfigured" });
    error = MISSING_DB_CONFIG_MESSAGE;
  }

  // Only when there is a store to query. `error` already holds the reason if
  // there is not, and it is a better one than any failed query would produce.
  if (store) {
    try {
      const [page1, statistics] = await Promise.all([
        store.list({ kind, q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        store.stats(),
      ]);
      items = page1.items;
      total = page1.total;
      stats = statistics;
    } catch (err) {
      /*
       * The only page in the application that reads the submissions table, and
       * until now the only failure that went nowhere: the message was rendered
       * and never recorded. So a database outage showed the operator a red line
       * on a page they had to be looking at to see it, and left no trace an
       * uptime monitor or a log search could find. `/api/health` reports storage
       * separately, but it probes reachability — it does not run this query, and
       * a working connection with a broken query is exactly the state this
       * catch exists for.
       *
       * The rendered text is a fixed sentence rather than `err.message`. The
       * page is behind admin authentication, so this is not the disclosure the
       * FX routes had, but the upstream message is PostgREST's — a schema hint,
       * a column name, a URL — and relaying it teaches the operator to read
       * transport detail off a dashboard instead of the captured event, which is
       * where the whole of it is.
       */
      captureException(err, {
        event: "admin.submissions.unreadable",
        kind: kind ?? "all",
        searched: q ? "yes" : "no",
      });
      error =
        "Submissions could not be read. The failure has been recorded — check the " +
        "server logs, and /api/health for whether the database is reachable at all.";
    }
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
            <span className="font-medium text-ink">{store?.provider ?? "none"}</span>
            {!store ? (
              <span className="ml-2 rounded-full bg-danger/[0.12] px-2 py-0.5 text-xs font-medium text-danger">
                not configured
              </span>
            ) : store.durable ? (
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
                {/*
                  A header for the actions column rather than an empty `<th>`:
                  a screen reader announces the column header with every cell
                  in it, and "blank" is a worse answer than "Erase" for the
                  column holding the destructive control.
                */}
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Erase
                </th>
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
                    <td className="px-4 py-3 text-right">
                      {/*
                        Erasure, which every operator of a form that collects
                        personal data needs and this one did not have: the only
                        way to honour a deletion request was hand-written SQL
                        against production (audit B10).

                        A form, not a link. The action destroys a record, and a
                        GET that deletes is one prefetch or one crawler away
                        from erasing whatever it pointed at. The hidden
                        `returnTo` carries the operator back to the filter and
                        page they were on, rebuilt from a closed set of
                        parameters at the other end rather than trusted.

                        There is no confirmation step and that is deliberate:
                        a `confirm()` needs client JavaScript, which this area
                        does not use, and a modal would be the only thing on
                        the page that stops working when a script fails. The
                        protection that does not depend on the browser is the
                        one that matters — this deletes exactly one row, named
                        by id, and the endpoint reports honestly when it
                        removed nothing.
                      */}
                      <form action="/api/admin/submissions/delete" method="post">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="returnTo"
                          value={`/admin${buildQuery({ kind, q, page: page > 1 ? page : undefined })}`}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        >
                          Delete
                          <span className="sr-only"> the {item.kind} submission from {title}</span>
                        </button>
                      </form>
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
