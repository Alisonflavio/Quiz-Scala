import { NextResponse, type NextRequest } from "next/server";

/* Checagem rápida: sem cookie de sessão, o painel manda para o login. A verificação real fica em requireUser(). */
export function proxy(req: NextRequest) {
  if (req.cookies.get("sf_session")) return NextResponse.next();
  // guarda onde a pessoa queria ir, para voltar para lá depois de entrar
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dash/:path*"] };
