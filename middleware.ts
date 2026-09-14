import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

// Gate de senha única para o app inteiro. Sem isso, qualquer pessoa que
// descubra a URL do deploy vê a base de leads e consegue apagar/editar tudo.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Tudo, exceto /login, /api/login, e assets internos do Next.
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
