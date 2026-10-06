"use server";
import { redirect } from "next/navigation";
import { createSession, createUser, destroySession, userCount, verifyLogin } from "@/lib/auth";

export type AuthState = { error?: string };

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const u = await verifyLogin(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if (!u) return { error: "E-mail ou senha incorretos." };
  await createSession(u.id);
  redirect("/dash");
}

/** Cria o primeiro administrador. Só funciona enquanto não existe nenhum usuário. */
export async function setupAction(_: AuthState, fd: FormData): Promise<AuthState> {
  if ((await userCount()) > 0) redirect("/login");
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Digite seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Digite um e-mail válido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const id = await createUser(name, email, password, "admin");
  await createSession(id);
  redirect("/dash");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
