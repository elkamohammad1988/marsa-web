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
  const title = pick("name") || pick("company") || pick("email") || "";
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
        "Submissions could not be read. The failure has been recorded. Check the " +
        "server logs, and /api/health for whether the database is reachable at all.";
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportHref = `/api/admin/export${buildQuery({ kind, q })}`;

  /*
   * Confirmation that the erasure happened.
   *
   * The endpoint redirected back to the list and said nothing, so the whole of
   * the feedback was a row that is no longer there — which is indistinguishable
   * from having deleted the wrong one, from a filter having changed, and from
   * nothing having happened at all on a page that shows 25 rows at a time. An
   * erasure is a thing an operator may later have to say they did; being shown
   * that it succeeded is the least the interface owes them.
   *
   * The flag is set by the route on its own redirect, never read from
   * `returnTo` — `safeAdminReturn` rebuilds that path from a closed set of
   * parameters — so this cannot be made to appear by handing somebody a link.
   * It is a `role="status"` so a screen reader hears it on arrival.
   */
  const erased = firstValue(params.erased) === "1";

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
              <span className="ml-2 rounded-md bg-danger/[0.12] px-2 py-0.5 text-xs font-medium text-danger">
                not configured
              </span>
            ) : store.durable ? (
              <span className="ml-2 rounded-md bg-success/[0.12] px-2 py-0.5 text-xs font-medium text-success">
                durable
              </span>
            ) : (
              <span className="ml-2 rounded-md bg-accent/[0.14] px-2 py-0.5 text-xs font-medium text-ink">
                local files, set SUPABASE_URL to persist
              </span>
            )}
          </p>
        </div>
        {/* `flex-wrap`: three pill buttons on one line measure ~333px, which
            is wider than a 320px phone, and this row was the only thing on the
            operator dashboard that made the page scroll sideways. */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/*
        ── Plain anchors, not `<Link>`, and this is a fix ──────────────────
        Every control in this row and in the pagination below changes only the
        *query string* of the page it is on. On a `force-dynamic` route the App
        Router fetches the new RSC payload for such a navigation — the request
        goes out and answers 200 — and then never commits it: the URL does not
        change and the table does not move. Verified in a browser rather than
        reasoned about; a plain anchor to the identical href navigates
        immediately.

        So an operator clicked "Account leads", or "Next", and nothing at all
        happened. Search escaped it only because it is a native
        `<form method="get">`, which is a full navigation — and that is the
        shape all of these now share, which is the second reason to prefer it
        here: `/admin` is deliberately an area with no client JavaScript, and a
        control that depends on the client router to work was the one thing in
        it that did.
      */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <a
          href={`/admin${buildQuery({ q })}`}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            kind ? "border-line text-ink-muted hover:text-ink" : "border-brand bg-brand/[0.08] text-ink",
          )}
        >
          All
        </a>
        {SUBMISSION_KINDS.map((k) => (
          <a
            key={k}
            href={`/admin${buildQuery({ kind: k, q })}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              kind === k
                ? "border-brand bg-brand/[0.08] text-ink"
                : "border-line text-ink-muted hover:text-ink",
            )}
          >
            {KIND_LABELS[k]}
            <span className="ml-1.5 text-xs text-ink-subtle">{stats.byKind[k]}</span>
          </a>
        ))}

        {/* Full width on a phone, pushed right from `sm` up. A fixed `w-56`
            field plus its button is 308px, which does not fit the 280px a
            320px viewport leaves inside the container. */}
        <form
          action="/admin"
          method="get"
          className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto"
        >
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, email…"
            aria-label="Search submissions"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-strong sm:w-56 sm:flex-none"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {erased && (
        <p
          role="status"
          className="mt-6 rounded-card border border-success/40 bg-success/[0.08] p-4 text-sm text-success"
        >
          Submission erased. The record is gone from the database and the deletion has been
          recorded in the server log.
        </p>
      )}

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
                      <span className="rounded-md bg-ink/[0.05] px-2 py-0.5 text-xs font-medium text-ink-muted">
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

                        ── The confirmation step, and why it is a `<details>` ──
                        There used to be none, on the reasoning that `confirm()`
                        needs client JavaScript and this area deliberately has
                        none, so a modal would be the one control that stops
                        working when a script fails. That reasoning is right
                        about modals and wrong about the conclusion it drew:
                        the choice was never "a JavaScript dialog or nothing".

                        A disclosure is a confirmation step that needs no
                        script at all. The first press opens the panel and
                        destroys nothing; the second, on a differently named
                        button that says what it will do, is the one that
                        submits. That is one deliberate action away from a row
                        of twenty-five identical `Delete` buttons in a dense
                        table — which is exactly the shape of interface a
                        mis-click erases a stranger's personal data from. It
                        keeps every property the old note argued for: it works
                        with scripting off, it is reachable and operable by
                        keyboard, and the endpoint behind it still deletes
                        exactly one row named by id.
                      */}
                      <details
                        /* A hook for the browser suite. Each row also carries a
                           "View payload" disclosure, so a positional selector
                           would drive the wrong one — and an attribute that
                           exists to be found cannot drift with the styling, the
                           same reasoning as `data-disclosure` on the concept
                           badge. */
                        data-erase=""
                        className="group/erase"
                      >
                        {/* `list-none` covers Chrome and Firefox; the webkit
                            pseudo-element is what older Safari still draws its
                            triangle from, and a stray marker inside a pill is
                            the kind of detail that reads as unfinished. */}
                        <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-line px-3 py-1 text-xs text-ink-muted transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger group-open/erase:border-danger group-open/erase:text-danger [&::-webkit-details-marker]:hidden">
                          Delete
                          <span className="sr-only"> the {item.kind} submission{title ? ` from ${title}` : ""}</span>
                        </summary>
                        {/* Right-aligned with the column and its "Erase"
                            header; the copy inside reads left, as copy does. */}
                        <div className="ml-auto mt-2 w-56 rounded-card border border-danger/40 bg-danger/[0.06] p-3 text-left">
                          <p className="text-xs leading-relaxed text-ink-muted">
                            Permanently erase this {item.kind} submission
                            {title ? ` from ${title}` : ""}? This cannot be undone.
                          </p>
                          <form
                            action="/api/admin/submissions/delete"
                            method="post"
                            className="mt-3"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="returnTo"
                              value={`/admin${buildQuery({ kind, q, page: page > 1 ? page : undefined })}`}
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-danger/[0.14] px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                            >
                              Erase permanently
                            </button>
                          </form>
                        </div>
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
            {/* Plain anchors, for the reason recorded above the filter row. */}
            {page > 1 && (
              <a
                href={`/admin${buildQuery({ kind, q, page: page - 1 })}`}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ink/5"
              >
                Previous
              </a>
            )}
            {page < pages && (
              <a
                href={`/admin${buildQuery({ kind, q, page: page + 1 })}`}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-ink/5"
              >
                Next
              </a>
            )}
          </div>
        </nav>
      )}
    </Container>
  );
}
