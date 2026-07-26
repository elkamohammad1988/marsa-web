import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getStore, isSubmissionKind } from "@/lib/storage";
import { submissionsToCsv } from "@/lib/csv";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export of stored submissions. Admin session required. */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get("kind") ?? "";
  const kind = isSubmissionKind(kindParam) ? kindParam : undefined;
  const q = searchParams.get("q") ?? undefined;

  try {
    // 5k rows is well past what a spreadsheet review needs and keeps the
    // response inside serverless memory limits.
    const { items } = await getStore().list({ kind, q, limit: 5000 });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `marsa-${kind ?? "submissions"}-${stamp}.csv`;

    return new NextResponse(submissionsToCsv(items), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    captureException(err, { event: "admin.export", kind: kind ?? "all" });
    return NextResponse.json({ error: "Could not build the export." }, { status: 502 });
  }
}
