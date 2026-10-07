/* Sessão e usuários do painel: cookie JWT (HS256) assinado com AUTH_SECRET e senhas com bcrypt. */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { query, queryOne } from "./db";

export const SESSION_COOKIE = "sf_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Defina AUTH_SECRET nas variáveis de ambiente.");
  return new TextEncoder().encode(s || "dev-secret-troque-em-producao-0123456789");
}

/** Hash bcrypt de uma senha que ninguém usa; serve só para igualar o tempo do login com e-mail desconhecido. */
const DUMMY_HASH = "$2b$10$hLmDE.J/AnwvUxoAijKeBO8eceE/1PjA85a5IWTofPL8RFkiRtVrC";

export type User = { id: string; name: string; email: string; role: "admin" | "member" };

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}

/** Grava o cookie de sessão (httpOnly, 30 dias) para o usuário. */
export async function createSession(userId: string) {
  const row = await queryOne<{ session_version: number }>("SELECT session_version FROM users WHERE id = $1", [userId]);
  const token = await new SignJWT({ uid: userId, v: row?.session_version ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuário da sessão atual, ou `null` se não há cookie, o token é inválido/expirado ou o usuário não existe mais. */
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = await queryOne<User & { session_version: number }>(
      "SELECT id, name, email, role, session_version FROM users WHERE id = $1",
      [payload.uid],
    );
    // token de antes de uma troca de senha (versão diferente) deixa de valer
    if (!row || row.session_version !== Number(payload.v ?? 0)) return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role };
  } catch {
    return null;
  }
}

/** Garante usuário logado; sem sessão, redireciona para `/login`. */
export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** Garante usuário admin; membro comum é redirecionado para `/dash`. */
export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dash");
  return u;
}

export async function userCount() {
  const r = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM users");
  return r?.n ?? 0;
}

/** Usuário cadastrado com este e-mail (sem diferenciar maiúsculas), ou `null`. */
export async function findUserByEmail(email: string) {
  return queryOne<User>("SELECT id, name, email, role FROM users WHERE lower(email) = lower($1)", [email.trim()]);
}

/** Confere e-mail (sem diferenciar maiúsculas) e senha. @returns o usuário, ou `null` se as credenciais não batem. */
export async function verifyLogin(email: string, password: string) {
  const u = await queryOne<User & { password_hash: string }>("SELECT * FROM users WHERE lower(email) = lower($1)", [
    email.trim(),
  ]);
  // compara com um hash fictício quando o usuário não existe: o tempo de resposta não revela quais e-mails têm conta
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  return u && ok ? u : null;
}

/** Cria usuário com senha já em hash. @returns id do novo usuário. */
export async function createUser(name: string, email: string, password: string, role: "admin" | "member") {
  const id = nanoid(12);
  await query("INSERT INTO users (id, name, email, password_hash, role) VALUES ($1,$2,lower($3),$4,$5)", [
    id,
    name.trim(),
    email.trim(),
    await hashPassword(password),
    role,
  ]);
  return id;
}
