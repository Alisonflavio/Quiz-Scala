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

export type User = { id: string; name: string; email: string; role: "admin" | "member" };

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
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

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await queryOne<User>("SELECT id, name, email, role FROM users WHERE id = $1", [payload.uid]);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dash");
  return u;
}

export async function userCount() {
  const r = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM users");
  return r?.n ?? 0;
}

export async function verifyLogin(email: string, password: string) {
  const u = await queryOne<User & { password_hash: string }>(
    "SELECT * FROM users WHERE lower(email) = lower($1)",
    [email.trim()],
  );
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return null;
  return u;
}

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
