import { NextResponse, type NextRequest } from "next/server";

/* Checagem rápida: sem cookie de sessão, o painel manda para o login. A verificação real fica em requireUser(). */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("sf_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dash/:path*"] };
