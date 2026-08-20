import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isCrossSite } from "@/lib/same-origin";
import { getStore, isSubmissionKind } from "@/lib/storage";
import { clientKey } from "@/lib/rate-limit";
import { ADMIN_DELETE_TIERS, checkTiers, tooManyRequests } from "@/lib/api-rate-limit";
import { captureEvent, captureException } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Erase one stored submission.
 *
 * Until this existed, the only way to answer a GDPR Article 17 request was to
 * open the Supabase SQL editor and write the `DELETE` by hand — which means the
 * operator needed database credentials to perform a routine, expected, legally
 * time-bound task, and every such request was a hand-typed statement against
 * production with no filter but the one they remembered to add. The audit
 * recorded that as B10.
 *
 * ── Why POST and not DELETE ────────────────────────────────────────────────
 * The whole `/admin` area is server-rendered with no client JavaScript, and an
 * HTML form can only issue GET or POST. Reaching for `fetch` here would make
 * this the one operator action that stops working when a script fails to load
 * — on the destructive one, which is precisely where a silent failure is worst.
 * So the method matches the transport that is actually available, and the
 * intent is in the path. It is emphatically **not** a GET: a link that deletes
 * is one prefetch, one crawler, or one "open all in tabs" away from erasing
 * whatever it pointed at.
 *
 * ── The four gates ─────────────────────────────────────────────────────────
 * Same-origin, so no other page can drive it on the operator's behalf — the
 * cookie is `SameSite=Lax` and would not be sent on a cross-site POST anyway,
 * but this is the endpoint where defence in depth is worth its cost. Then the
 * admin session. Then the rate limit, sized in `ADMIN_DELETE_TIERS` for the
 * case where the shared password has leaked. Then the id itself, which is
 * validated before it reaches a query.
 *
 * ── Why the response distinguishes "deleted" from "not found" ──────────────
 * `store.delete` answers false when nothing was removed, and that becomes a
 * 404 rather than a cheerful redirect. An erasure request is a claim the
 * operator has to be able to stand behind; being shown "Deleted" for a record
 * that is still in the table is the one outcome this endpoint must never
 * produce. There is no enumeration concern in reporting it — the caller is
 * already authenticated and is looking at the list.
 */
export async function POST(request: Request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const limit = await checkTiers(clientKey(request.headers, ""), ADMIN_DELETE_TIERS);
  if (!limit.ok) {
    return tooManyRequests(limit.resetAt, "Too many deletions. Wait a moment and try again.");
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const id = String(form.get("id") ?? "").trim();
  if (!isSubmissionId(id)) {
    return NextResponse.json({ error: "That is not a submission id." }, { status: 400 });
  }

  let deleted: boolean;
  try {
    deleted = await getStore().delete(id);
  } catch (err) {
    // The upstream message can carry the PostgREST body — table names,
    // constraint names, hints. Recorded, never returned, as everywhere else
    // that talks to the database.
    captureException(err, { event: "admin.submission.delete_failed" });
    return NextResponse.json({ error: "Could not delete that submission." }, { status: 502 });
  }

  if (!deleted) {
    return NextResponse.json({ error: "No submission with that id." }, { status: 404 });
  }

  /*
   * An erasure is worth a record of its own — not of *what* was deleted, which
   * would defeat the point by copying the personal data into a log, but that a
   * deletion happened and which id it concerned. That is what lets an operator
   * later show a request was honoured.
   */
  captureEvent(`Submission ${id} erased by an operator.`, {
    event: "admin.submission.deleted",
    submissionId: id,
  });

  /*
   * 303 back to the list, with the filters the operator was looking at. A
   * redirect after a POST is what stops the browser from re-submitting the
   * deletion on refresh or on Back — the classic double-submit, which on this
   * endpoint would produce a confusing 404 for a row that is already gone.
   *
   * The return path is rebuilt from scratch rather than echoed: `returnTo`
   * comes from a form field, and a value copied straight into a `Location`
   * header is an open redirect regardless of who is authenticated.
   */
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL(safeAdminReturn(form.get("returnTo")), origin), {
    status: 303,
    headers: { "cache-control": "no-store" },
  });
}

/**
 * A submission id, as this application mints them.
 *
 * `randomUUID()` for database rows. The shape is checked rather than the value
 * because the id is interpolated into a PostgREST filter downstream, and the
 * cheapest place to make `id=eq.*` impossible is before it becomes a query at
 * all. `store.delete` encodes it too — this is the belt, that is the braces.
 */
function isSubmissionId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/**
 * Where to send the operator afterwards: an `/admin` URL carrying only the
 * filters that page understands.
 *
 * Rebuilt from recognised parameters rather than validated as a string. A
 * same-origin check would be enough to stop the redirect leaving the site, but
 * it would still let anything be appended to an `/admin` URL; reconstructing
 * from a closed set means the output can only ever be the list the operator
 * came from.
 */
function safeAdminReturn(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/admin")) return "/admin";

  let params: URLSearchParams;
  try {
    params = new URL(value, "http://localhost").searchParams;
  } catch {
    return "/admin";
  }

  const out = new URLSearchParams();
  const kind = params.get("kind");
  if (kind && isSubmissionKind(kind)) out.set("kind", kind);

  const q = params.get("q")?.trim();
  if (q) out.set("q", q.slice(0, 100));

  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) out.set("page", String(Math.min(page, 10_000)));

  const query = out.toString();
  return query ? `/admin?${query}` : "/admin";
}
