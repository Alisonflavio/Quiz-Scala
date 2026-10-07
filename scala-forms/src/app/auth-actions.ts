"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sanitizeNext } from "@/lib/redirect";
import { createSession, createUser, destroySession, userCount, verifyLogin } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { appOrigin, completeSignup, requestSignup } from "@/lib/signup";
import { isAllowedSignupEmail, signupDomain } from "@/lib/signup-policy";

/** `name` e `email` voltam junto com o erro: o React limpa o formulário após a ação e a pessoa não deve redigitar tudo. */
export type AuthState = { error?: string; name?: string; email?: string; sent?: string };

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "");
  const ip = clientIp(await headers());
  // freia força bruta: por IP e por e-mail (8 tentativas a cada 15 minutos para cada e-mail)
  const allowed =
    (await rateLimit("login-ip", ip, { max: 30, windowSeconds: 900 })) &&
    (await rateLimit("login-email", email.trim().toLowerCase(), { max: 8, windowSeconds: 900 }));
  if (!allowed) return { error: "Muitas tentativas. Espere alguns minutos e tente de novo.", email };
  const u = await verifyLogin(email, String(fd.get("password") ?? ""));
  if (!u) return { error: "E-mail ou senha incorretos.", email };
  await createSession(u.id);
  redirect(sanitizeNext(String(fd.get("next") ?? "")));
}

/** Cria o primeiro administrador. Só funciona enquanto não existe nenhum usuário. */
export async function setupAction(_: AuthState, fd: FormData): Promise<AuthState> {
  if ((await userCount()) > 0) redirect("/login");
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Digite seu nome.", name, email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Digite um e-mail válido.", name, email };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", name, email };
  const id = await createUser(name, email, password, "admin");
  await createSession(id);
  redirect("/dash");
}

/**
 * Pede o cadastro: valida nome e e-mail do domínio liberado e manda o link de confirmação.
 * A conta só é criada em `confirmAction`, depois que a pessoa abre o link recebido por e-mail.
 */
export async function signupAction(_: AuthState, fd: FormData): Promise<AuthState> {
  if ((await userCount()) === 0) redirect("/setup");
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  if (name.length < 2) return { error: "Digite seu nome.", name, email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Digite um e-mail válido.", name, email };
  if (!isAllowedSignupEmail(email)) return { error: `Só e-mails @${signupDomain()} podem criar conta.`, name, email };
  const h = await headers();
  // cada pedido manda um e-mail: limita por IP e no total do dia (o plano grátis do Resend tem 100 por dia)
  const allowed =
    (await rateLimit("signup-ip", clientIp(h), { max: 5, windowSeconds: 3600 })) &&
    (await rateLimit("signup-global", "todos", { max: 40, windowSeconds: 86400 }));
  if (!allowed) return { error: "Muitos pedidos de cadastro. Tente de novo mais tarde.", name, email };
  const result = await requestSignup({ name, email, origin: appOrigin(h) });
  if (!result.ok) return { error: result.error, name, email };
  return { sent: email };
}

/** Define a senha a partir do link do e-mail, cria a conta e já entra no painel. */
export async function confirmAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const result = await completeSignup(token, password);
  if (!result.ok) return { error: result.error };
  await createSession(result.userId);
  redirect("/dash");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
