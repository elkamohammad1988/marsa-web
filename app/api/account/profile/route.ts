import { NextResponse } from "next/server";
import { requireApiSession, unexpectedFailure } from "@/lib/api-auth";
import { can } from "@/lib/auth-roles";
import { updateProfile } from "@/lib/profiles";
import { validateProfile } from "@/lib/validation";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";

/**
 * Update the signed-in person's own profile.
 *
 * Four gates, each doing different work. `requireApiSession` covers the first
 * two — no other site may drive this, and the caller must be somebody. The
 * third is `can(..., "profile:write")`: the authorisation question, asked by
 * permission rather than by role, so adding a read-only role later is one row
 * in one table rather than a search for `=== "admin"`.
 *
 * The fourth is not in this file. Row Level Security means the database
 * updates the caller's row or no row at all, whatever this handler sends —
 * which is why `updateProfile` returning null is treated as a real outcome
 * rather than an impossible one.
 */
export async function PATCH(request: Request) {
  const gate = await requireApiSession(request);
  if (!gate.ok) return gate.response;
  const { config, session, body } = gate;

  if (!can(session.role, "profile:write")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = validateProfile(body);
  if (!result.success) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    const profile = await updateProfile(config, session.accessToken, session.userId, {
      fullName: result.data.fullName,
    });
    if (!profile) {
      // No row came back. Under RLS that means the database declined to update
      // anything — a session for an account whose profile is missing, most
      // likely. Reported rather than shrugged off, because the alternative is a
      // form that appears to save and does not.
      captureException(new Error("Profile update matched no row."), {
        event: "auth.profile.update_missed",
        severity: "warning",
        remedy: "apply db/migrations/004_auth_profiles.sql",
      });
      return NextResponse.json(
        { error: "We could not find your profile to update it." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    return unexpectedFailure(err, "auth.profile.update_failed", "save that");
  }
}
