import { NextResponse } from "next/server";
import { goTrueFailure, requireApiSession } from "@/lib/api-auth";
import { updatePassword } from "@/lib/gotrue";
import { validateNewPassword } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Set a new password for the signed-in person.
 *
 * Reached two ways, and deliberately the same endpoint for both: from
 * `/reset-password` after following an emailed recovery link, and from the
 * account area by somebody already signed in. Holding a valid session is the
 * requirement in both cases, and the recovery link's whole purpose is to mint
 * one — so a second, parallel "reset with a token" path would be a second
 * place for the same authorisation to be checked, and eventually to differ.
 *
 * The current password is not asked for. It cannot be on the recovery path —
 * the person is there precisely because they do not have it — and asking only
 * on the other path would mean two behaviours behind one URL. What protects
 * the signed-in case instead is the session cookie's `SameSite=Lax` and the
 * cross-site check inside `requireApiSession`, so another site cannot drive
 * this on a visitor's behalf.
 */
export async function POST(request: Request) {
  const gate = await requireApiSession(request);
  if (!gate.ok) return gate.response;
  const { config, session, body } = gate;

  // The session supplies the address, so "your password cannot be your email
  // address" is enforceable here even though the form never asked for one.
  const result = validateNewPassword(body, session.email);
  if (!result.success) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    await updatePassword(config, session.accessToken, result.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return goTrueFailure(err, "auth.password.update_failed");
  }
}
