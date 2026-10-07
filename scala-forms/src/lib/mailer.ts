/*
 * Envio de e-mail transacional via API do Resend (sem dependência extra).
 * Configuração: RESEND_API_KEY e EMAIL_FROM (ver .env.example).
 * Sem elas, em desenvolvimento o e-mail é só impresso no terminal; em produção o envio falha de propósito,
 * para o cadastro nunca "pular" a confirmação por e-mail.
 */
import "server-only";

export type Email = { to: string; subject: string; text: string; html: string };

/** Lançado em produção quando faltam as variáveis do serviço de e-mail. */
export class MailNotConfiguredError extends Error {
  constructor() {
    super("Envio de e-mail não configurado (RESEND_API_KEY / EMAIL_FROM).");
  }
}

/** Escapa texto de usuário antes de colocar em HTML de e-mail. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * Envia um e-mail.
 * @throws MailNotConfiguredError em produção sem configuração; Error se o serviço recusar o envio.
 */
export async function sendEmail(mail: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") throw new MailNotConfiguredError();
    console.info(`[email:dev] para ${mail.to}\n${mail.subject}\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
