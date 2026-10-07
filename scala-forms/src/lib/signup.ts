/*
 * Cadastro com confirmação por e-mail.
 * Fluxo: pedido (nome + e-mail) -> e-mail com link de uso único -> a pessoa define a senha no link e a conta é criada.
 * Como a conta só nasce depois do clique, ninguém consegue cadastrar um endereço que não é seu,
 * e a senha é definida por quem recebeu o e-mail (e não por quem digitou o endereço).
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createUser, findUserByEmail } from "./auth";
import { query, queryOne } from "./db";
import { escapeHtml, MailNotConfiguredError, sendEmail } from "./mailer";

const TOKEN_TTL_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Base das URLs dos e-mails: APP_URL se definida, senão o endereço da própria requisição. */
export function appOrigin(h: Headers): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function layout(name: string, intro: string, button: { href: string; label: string }) {
  const href = escapeHtml(button.href);
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a2028">
  <h2 style="margin:0 0 12px">Scala Forms</h2>
  <p>Olá, ${escapeHtml(name)}!</p>
  <p>${intro}</p>
  <p style="margin:24px 0"><a href="${href}" style="background:#2f6bff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(button.label)}</a></p>
  <p style="font-size:13px;color:#667">Ou copie este endereço: ${href}</p>
</div>`;
}

/**
 * Registra o pedido de cadastro e manda o e-mail.
 * Conta já existente recebe um e-mail avisando (sem link de cadastro), e a resposta na tela é a mesma,
 * para a tela não revelar quem tem conta. Há intervalo de 1 minuto por e-mail para evitar disparos em massa.
 */
export async function requestSignup(input: { name: string; email: string; origin: string }): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  await query("DELETE FROM email_tokens WHERE expires_at < now()");
  const recent = await queryOne(
    `SELECT 1 FROM email_tokens WHERE email = $1 AND created_at > now() - interval '${RESEND_COOLDOWN_SECONDS} seconds'`,
    [email],
  );
  if (recent) return { ok: false, error: "Já enviamos um link há pouco. Espere 1 minuto para pedir outro." };

  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM email_tokens WHERE email = $1", [email]);
  await query(
    `INSERT INTO email_tokens (token_hash, email, name, expires_at)
     VALUES ($1, $2, $3, now() + interval '${TOKEN_TTL_MINUTES} minutes')`,
    [hashToken(token), email, name],
  );

  const exists = !!(await findUserByEmail(email));
  const link = exists ? `${input.origin}/login` : `${input.origin}/confirmar?token=${token}`;
  const mail = exists
    ? {
        subject: "Você já tem conta no Scala Forms",
        text: `Olá, ${name}! Já existe uma conta com este e-mail. Entre em ${link}`,
        html: layout(name, "Já existe uma conta com este e-mail. É só entrar:", { href: link, label: "Entrar" }),
      }
    : {
        subject: "Confirme seu e-mail no Scala Forms",
        text: `Olá, ${name}! Confirme seu e-mail e crie sua senha (o link vale por ${TOKEN_TTL_MINUTES} minutos): ${link}`,
        html: layout(
          name,
          `Confirme seu e-mail e crie sua senha. O link vale por ${TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez.`,
          { href: link, label: "Confirmar e criar senha" },
        ),
      };

  try {
    await sendEmail({ to: email, ...mail });
  } catch (err) {
    await query("DELETE FROM email_tokens WHERE email = $1", [email]);
    if (err instanceof MailNotConfiguredError) {
      return { ok: false, error: "O envio de e-mail ainda não está configurado. Fale com o administrador." };
    }
    console.error("[cadastro] falha ao enviar e-mail:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." };
  }
  return { ok: true };
}

/** Dados do pedido se o token existe e não venceu (não consome o token: abrir o link não o gasta). */
export async function peekSignup(token: string): Promise<{ email: string; name: string } | null> {
  if (!token) return null;
  return queryOne<{ email: string; name: string }>(
    "SELECT email, name FROM email_tokens WHERE token_hash = $1 AND expires_at > now()",
    [hashToken(token)],
  );
}

/**
 * Conclui o cadastro: consome o token (uso único, de forma atômica) e cria a conta como "member".
 * @returns id do novo usuário.
 */
export async function completeSignup(token: string, password: string): Promise<Result<{ userId: string }>> {
  const claimed = await queryOne<{ email: string; name: string }>(
    "DELETE FROM email_tokens WHERE token_hash = $1 AND expires_at > now() RETURNING email, name",
    [hashToken(token)],
  );
  if (!claimed) return { ok: false, error: "Este link venceu ou já foi usado. Peça um novo em Criar conta." };
  if (await findUserByEmail(claimed.email)) return { ok: false, error: "Já existe uma conta com este e-mail. Entre." };
  const userId = await createUser(claimed.name, claimed.email, password, "member");
  return { ok: true, userId };
}
