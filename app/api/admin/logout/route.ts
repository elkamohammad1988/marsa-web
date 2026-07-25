import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/admin-auth";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

/** Clears the admin session and returns to the login screen. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin || absoluteUrl("/");
  const response = NextResponse.redirect(new URL("/admin/login", origin), { status: 303 });
  response.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return response;
}
