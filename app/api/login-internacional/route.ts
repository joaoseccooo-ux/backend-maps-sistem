import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_INTL, expectedTokenIntl } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/internacional");

  const token = await expectedTokenIntl();
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login-internacional?error=config&next=${encodeURIComponent(next)}`, req.url),
      303
    );
  }

  const configuredPassword = process.env.APP_PASSWORD_INTERNACIONAL;
  if (password !== configuredPassword) {
    return NextResponse.redirect(
      new URL(`/login-internacional?error=senha&next=${encodeURIComponent(next)}`, req.url),
      303
    );
  }

  const res = NextResponse.redirect(new URL(next || "/internacional", req.url), 303);
  res.cookies.set(AUTH_COOKIE_INTL, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
